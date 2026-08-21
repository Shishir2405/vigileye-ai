"""
Test-time augmentation: run the detector on the original frame plus a
horizontal flip and a couple of scaled variants, map every detection back to
original-image coordinates, then merge overlapping boxes across passes with
NMS. This trades inference latency (3-4x) for a measurable recall bump on
borderline/hairline cracks — worth it off the hot path (batch/backlog
processing) even if it's skipped for the low-latency edge path in
../../edge, which per the PRD runs a single confidence-filtering pass.

Enabled per-request via multipart form field "tta=true" on /predict.
"""

from typing import Callable, List

import cv2
import numpy as np

TTA_SCALES = [1.0, 0.85]
IOU_MERGE_THRESHOLD = 0.5


def _flip_boxes_horizontal(predictions: List[dict]) -> List[dict]:
    flipped = []
    for p in predictions:
        x1, y1, x2, y2 = p["bbox"]  # normalized 0-1
        flipped.append({**p, "bbox": (1 - x2, y1, 1 - x1, y2)})
    return flipped


def _scale_image(image_bgr: np.ndarray, scale: float) -> np.ndarray:
    if scale == 1.0:
        return image_bgr
    h, w = image_bgr.shape[:2]
    return cv2.resize(image_bgr, (int(w * scale), int(h * scale)))


def _merge_predictions(all_predictions: List[List[dict]]) -> List[dict]:
    flat = [p for group in all_predictions for p in group]
    if not flat:
        return []

    boxes = np.array([p["bbox"] for p in flat])
    scores = np.array([p["confidence"] for p in flat])

    # Convert normalized xyxy -> a scale-agnostic space for NMS (values 0-1000 for cv2.dnn)
    scaled = boxes * 1000
    rects = [[b[0], b[1], b[2] - b[0], b[3] - b[1]] for b in scaled.tolist()]
    keep = cv2.dnn.NMSBoxes(rects, scores.tolist(), score_threshold=0.0, nms_threshold=IOU_MERGE_THRESHOLD)
    keep_idx = [int(i) for i in np.array(keep).flatten()] if len(keep) else []

    return [flat[i] for i in keep_idx]


def run_with_tta(image_bgr: np.ndarray, predict_fn: Callable[[np.ndarray], List[dict]]) -> List[dict]:
    """predict_fn: takes a BGR image, returns predictions with normalized 'bbox' + 'confidence'."""
    all_passes: List[List[dict]] = []

    for scale in TTA_SCALES:
        scaled_img = _scale_image(image_bgr, scale)
        all_passes.append(predict_fn(scaled_img))

        flipped_img = cv2.flip(scaled_img, 1)
        flipped_preds = predict_fn(flipped_img)
        all_passes.append(_flip_boxes_horizontal(flipped_preds))

    return _merge_predictions(all_passes)
