"""
Stage 2 of the two-stage pipeline: given a crop around a YOLO detection,
run a DeepLabV3+ segmentation model to get a pixel-accurate crack mask, then
derive true width from the mask's medial axis (skeleton) rather than the
bounding box's shorter side. This is the single biggest accuracy lever
described in the PRD (Section 10) — a bbox can only ever approximate width;
a segmentation mask measures it directly.

Falls back to the bbox heuristic in severity.py when no segmentation model
is loaded, so the service still runs end-to-end without it.
"""

import os
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
import onnxruntime as ort
from skimage.morphology import skeletonize

SEG_MODEL_PATH = os.environ.get(
    "SEGMENTATION_MODEL_PATH", str(Path(__file__).parent.parent / "models" / "deeplabv3-crack.onnx")
)
SEG_INPUT_SIZE = int(os.environ.get("SEGMENTATION_INPUT_SIZE", "256"))
SEG_MASK_THRESHOLD = float(os.environ.get("SEGMENTATION_MASK_THRESHOLD", "0.5"))


class CrackSegmenter:
    def __init__(self) -> None:
        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None
        self._try_load()

    def _try_load(self) -> None:
        if not Path(SEG_MODEL_PATH).exists():
            return
        self.session = ort.InferenceSession(SEG_MODEL_PATH, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    @property
    def is_loaded(self) -> bool:
        return self.session is not None

    def _preprocess(self, crop_bgr: np.ndarray) -> np.ndarray:
        resized = cv2.resize(crop_bgr, (SEG_INPUT_SIZE, SEG_INPUT_SIZE))
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        chw = np.transpose(rgb, (2, 0, 1))
        return np.expand_dims(chw, axis=0)

    def segment(self, crop_bgr: np.ndarray) -> Optional[np.ndarray]:
        """Returns a binary mask (uint8, 0/1) at the crop's original resolution, or None if unloaded."""
        if not self.is_loaded:
            return None

        orig_h, orig_w = crop_bgr.shape[:2]
        tensor = self._preprocess(crop_bgr)
        outputs = self.session.run(None, {self.input_name: tensor})

        logits = np.squeeze(outputs[0])  # (H, W) or (1, H, W)
        if logits.ndim == 3:
            logits = logits[0]
        probs = 1 / (1 + np.exp(-logits))  # sigmoid
        mask = (probs >= SEG_MASK_THRESHOLD).astype(np.uint8)

        return cv2.resize(mask, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)


def measure_width_from_mask(mask: np.ndarray, px_per_mm: float) -> tuple[float, float]:
    """
    True width via medial-axis (skeleton) + distance transform: for every
    point on the crack's skeleton, the distance-to-background gives the
    local half-width; the median across the skeleton is a far more accurate
    "crack width" than a bounding box's shorter side, especially for
    diagonal or curved cracks. Length = skeleton pixel count (path length).

    Returns (width_mm, length_cm). Falls back to (0, 0) on an empty mask.
    """
    if mask.sum() == 0:
        return 0.0, 0.0

    skeleton = skeletonize(mask.astype(bool))
    if skeleton.sum() == 0:
        return 0.0, 0.0

    dist_transform = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    widths_px = dist_transform[skeleton] * 2  # distance transform gives half-width

    width_mm = round(float(np.median(widths_px)) / px_per_mm, 2)
    length_cm = round(float(skeleton.sum()) / px_per_mm / 10, 2)
    return width_mm, length_cm


segmenter = CrackSegmenter()
