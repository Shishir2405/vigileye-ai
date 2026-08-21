"""
ONNX Runtime wrapper around the trained crack-detection model. Loads once at
service startup and stays resident — this IS "the one accurate model" the
rest of the system calls; there is deliberately no per-request model
selection or ensembling here, on the theory that one well-evaluated model
you can reason about beats several you can't.

Two-stage pipeline: this module (YOLO) locates crack regions; for each one,
segmentation.py's DeepLabV3+ model (when loaded) measures true width from a
pixel mask instead of the bbox-shorter-side heuristic in severity.py.
Optional test-time augmentation (tta.py) and real scale calibration
(calibration.py) layer on top — see main.py for how request params reach
here.
"""

import os
import time
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
import onnxruntime as ort

from severity import DEFAULT_PX_PER_MM, bbox_to_size_mm, classify_crack_type, severity_from_width_mm
from segmentation import measure_width_from_mask, segmenter
from tta import run_with_tta

MODEL_PATH = os.environ.get("MODEL_PATH", str(Path(__file__).parent.parent / "models" / "yolov11-crack.onnx"))
MODEL_VERSION = os.environ.get("MODEL_VERSION", "yolov11-crack-dev")
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.25"))  # low-ish: recall over precision
IOU_THRESHOLD = float(os.environ.get("IOU_THRESHOLD", "0.5"))
INPUT_SIZE = int(os.environ.get("INPUT_SIZE", "640"))

# Padding added around a detection's bbox before cropping for segmentation,
# so the mask isn't cut off right at the (possibly slightly tight) YOLO edge.
SEGMENTATION_CROP_PADDING_FRAC = 0.15


class CrackDetector:
    def __init__(self) -> None:
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self._try_load()

    def _try_load(self) -> None:
        if not Path(MODEL_PATH).exists():
            # No trained weights yet — service still starts (useful for
            # local dev / demoing the API contract) but /predict returns
            # a clear error until export/export_onnx.py produces a model.
            return
        self.session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    @property
    def is_loaded(self) -> bool:
        return self.session is not None

    def _preprocess(self, image_bgr: np.ndarray) -> np.ndarray:
        resized = cv2.resize(image_bgr, (INPUT_SIZE, INPUT_SIZE))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        chw = np.transpose(rgb, (2, 0, 1))
        return np.expand_dims(chw, axis=0)

    def _detect_raw(self, image_bgr: np.ndarray) -> List[dict]:
        """One forward pass -> boxes with normalized bbox + confidence only
        (no width/severity/type yet — those are resolved once, after TTA
        merging, against the *original* full-resolution image)."""
        h, w = image_bgr.shape[:2]
        tensor = self._preprocess(image_bgr)
        outputs = self.session.run(None, {self.input_name: tensor})
        return self._postprocess_raw(outputs, w, h)

    def predict(
        self,
        image_bgr: np.ndarray,
        px_per_mm: float = DEFAULT_PX_PER_MM,
        use_tta: bool = False,
        use_segmentation: bool = True,
    ) -> tuple[List[dict], float]:
        """Returns (predictions, inference_ms). Raises RuntimeError if no model is loaded."""
        if not self.is_loaded:
            raise RuntimeError(f"No model loaded from {MODEL_PATH}. Run export/export_onnx.py first.")

        orig_h, orig_w = image_bgr.shape[:2]
        start = time.perf_counter()

        raw_boxes = run_with_tta(image_bgr, self._detect_raw) if use_tta else self._detect_raw(image_bgr)

        predictions = [
            self._measure_detection(image_bgr, box, orig_w, orig_h, px_per_mm, use_segmentation)
            for box in raw_boxes
        ]
        inference_ms = (time.perf_counter() - start) * 1000
        return predictions, inference_ms

    def _measure_detection(
        self, image_bgr: np.ndarray, box: dict, orig_w: int, orig_h: int, px_per_mm: float, use_segmentation: bool
    ) -> dict:
        x1n, y1n, x2n, y2n = box["bbox"]
        x1, y1, x2, y2 = x1n * orig_w, y1n * orig_h, x2n * orig_w, y2n * orig_h

        mask = None
        if use_segmentation and segmenter.is_loaded:
            crop, crop_offset = self._padded_crop(image_bgr, x1, y1, x2, y2, orig_w, orig_h)
            if crop.size > 0:
                mask = segmenter.segment(crop)

        if mask is not None and mask.sum() > 0:
            width_mm, length_cm = measure_width_from_mask(mask, px_per_mm)
            measurement_source = "segmentation"
        else:
            width_mm, length_cm = bbox_to_size_mm((x1, y1, x2, y2), px_per_mm)
            measurement_source = "bbox-heuristic"

        return {
            "crackType": classify_crack_type((x1, y1, x2, y2)),
            "widthMm": width_mm,
            "lengthCm": length_cm,
            "severity": severity_from_width_mm(width_mm),
            "confidence": box["confidence"],
            "bbox": (x1n, y1n, x2n, y2n),
            "measurementSource": measurement_source,
        }

    @staticmethod
    def _padded_crop(image_bgr, x1, y1, x2, y2, orig_w, orig_h):
        pad_x = (x2 - x1) * SEGMENTATION_CROP_PADDING_FRAC
        pad_y = (y2 - y1) * SEGMENTATION_CROP_PADDING_FRAC
        cx1, cy1 = max(0, int(x1 - pad_x)), max(0, int(y1 - pad_y))
        cx2, cy2 = min(orig_w, int(x2 + pad_x)), min(orig_h, int(y2 + pad_y))
        return image_bgr[cy1:cy2, cx1:cx2], (cx1, cy1)

    def _postprocess_raw(self, outputs, orig_w: int, orig_h: int) -> List[dict]:
        """Decode YOLO output -> NMS -> normalized bbox + confidence only.
        Ultralytics' exported ONNX output layout is (1, 4+num_classes, N);
        this assumes the single-class 'crack' export from training/train.py."""
        preds = np.squeeze(outputs[0]).T  # (N, 5) for single-class: [cx, cy, w, h, conf]
        candidates = preds[preds[:, 4] >= CONFIDENCE_THRESHOLD]

        if candidates.shape[0] == 0:
            return []

        boxes_xyxy = self._cxcywh_to_xyxy(candidates[:, :4], orig_w, orig_h)
        scores = candidates[:, 4]
        keep = self._nms(boxes_xyxy, scores, IOU_THRESHOLD)

        return [
            {
                "bbox": (
                    boxes_xyxy[i][0] / orig_w,
                    boxes_xyxy[i][1] / orig_h,
                    boxes_xyxy[i][2] / orig_w,
                    boxes_xyxy[i][3] / orig_h,
                ),
                "confidence": float(scores[i]),
            }
            for i in keep
        ]

    @staticmethod
    def _cxcywh_to_xyxy(boxes: np.ndarray, orig_w: int, orig_h: int) -> np.ndarray:
        scale_x, scale_y = orig_w / INPUT_SIZE, orig_h / INPUT_SIZE
        cx, cy, bw, bh = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
        x1 = (cx - bw / 2) * scale_x
        y1 = (cy - bh / 2) * scale_y
        x2 = (cx + bw / 2) * scale_x
        y2 = (cy + bh / 2) * scale_y
        return np.stack([x1, y1, x2, y2], axis=1)

    @staticmethod
    def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> List[int]:
        indices = cv2.dnn.NMSBoxes(
            bboxes=[[b[0], b[1], b[2] - b[0], b[3] - b[1]] for b in boxes.tolist()],
            scores=scores.tolist(),
            score_threshold=CONFIDENCE_THRESHOLD,
            nms_threshold=iou_threshold,
        )
        return [int(i) for i in np.array(indices).flatten()] if len(indices) else []


detector = CrackDetector()
