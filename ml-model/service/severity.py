"""
Converts a detection's pixel-space bounding box into real-world width/length
in millimeters (bbox heuristic; segmentation.py's mask-based measurement is
preferred when the segmentation model is loaded), then buckets that into the
Low/Medium/High/Critical severity index — PRD Section 10.

DEFAULT_PX_PER_MM below is the fallback used when no calibration metadata is
supplied. calibration.py resolves the real px/mm scale from either a known
reference object in frame (handheld/fixed-camera) or UAV altitude + gimbal
angle + camera intrinsics — see main.py for how a request opts into it.
"""

from typing import Tuple

# Severity thresholds in millimeters — tune against real inspection data.
SEVERITY_THRESHOLDS_MM = {
    "low": 1.0,
    "medium": 2.5,
    "high": 4.0,
    # anything >= 4.0mm (or the structure-specific critical threshold used
    # by the forecasting model in ../../backend) is "critical"
}

DEFAULT_PX_PER_MM = 8.0  # placeholder scale factor, ~200 DPI at typical inspection distance


def bbox_to_size_mm(
    bbox_px: Tuple[float, float, float, float],
    px_per_mm: float = DEFAULT_PX_PER_MM,
) -> Tuple[float, float]:
    """bbox_px is (x1, y1, x2, y2) in pixel coordinates. Returns (width_mm, length_cm)."""
    x1, y1, x2, y2 = bbox_px
    w_px = abs(x2 - x1)
    h_px = abs(y2 - y1)

    # crack "width" = shorter bbox dimension, "length" = longer dimension —
    # a reasonable proxy until a segmentation mask gives the true minor axis.
    width_mm = round(min(w_px, h_px) / px_per_mm, 2)
    length_cm = round(max(w_px, h_px) / px_per_mm / 10, 2)
    return width_mm, length_cm


def severity_from_width_mm(width_mm: float) -> str:
    if width_mm < SEVERITY_THRESHOLDS_MM["low"]:
        return "low"
    if width_mm < SEVERITY_THRESHOLDS_MM["medium"]:
        return "medium"
    if width_mm < SEVERITY_THRESHOLDS_MM["high"]:
        return "high"
    return "critical"


def classify_crack_type(bbox_px: Tuple[float, float, float, float]) -> str:
    """Cheap orientation-based classifier applied to each detected crop.
    Kept separate from the detector itself (single-class YOLO model) so
    detection quality and type-labeling can be improved independently."""
    x1, y1, x2, y2 = bbox_px
    w, h = abs(x2 - x1), abs(y2 - y1)
    if w == 0 or h == 0:
        return "hairline"
    ratio = w / h
    if ratio > 2.5:
        return "horizontal"
    if ratio < 0.4:
        return "vertical"
    if 0.6 <= ratio <= 1.6:
        return "map"
    return "diagonal"
