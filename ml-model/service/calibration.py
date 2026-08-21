"""
Replaces the placeholder DEFAULT_PX_PER_MM in severity.py with real
pixel-to-millimeter scale, derived from either:

  (a) a handheld shot with a known reference object in frame (checkerboard,
      credit-card-sized marker) — caller measures the marker in pixels and
      passes its known real-world size, or
  (b) a UAV survey shot, using altitude + camera intrinsics + gimbal angle
      to compute Ground Sample Distance (GSD) — standard photogrammetry.

Both paths are optional: /predict accepts capture metadata and falls back
to DEFAULT_PX_PER_MM (severity.py) when none is provided, so the endpoint
keeps working for a bare image upload with no calibration data.
"""

import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class CameraIntrinsics:
    focal_length_mm: float
    sensor_width_mm: float
    image_width_px: int


@dataclass
class UavCaptureMetadata:
    altitude_m: float
    gimbal_pitch_deg: float  # 90 = straight down
    intrinsics: CameraIntrinsics


@dataclass
class ReferenceObjectMetadata:
    known_width_mm: float
    measured_width_px: float


def px_per_mm_from_reference_object(ref: ReferenceObjectMetadata) -> float:
    """Handheld/fixed-camera path: a known-size object (e.g. a card) measured in the frame."""
    if ref.known_width_mm <= 0:
        raise ValueError("known_width_mm must be > 0")
    return ref.measured_width_px / ref.known_width_mm


def px_per_mm_from_uav(meta: UavCaptureMetadata) -> float:
    """
    UAV survey path. Ground Sample Distance (GSD, mm/px) for a near-nadir
    shot is approximately:

        GSD = (altitude_mm * sensor_width_mm) / (focal_length_mm * image_width_px)

    Adjusted for gimbal pitch away from straight-down (90°) by the cosine of
    the deviation, since an angled shot covers more ground per pixel.
    """
    altitude_mm = meta.altitude_m * 1000
    gsd_mm_per_px = (altitude_mm * meta.intrinsics.sensor_width_mm) / (
        meta.intrinsics.focal_length_mm * meta.intrinsics.image_width_px
    )

    pitch_deviation_rad = math.radians(abs(90 - meta.gimbal_pitch_deg))
    gsd_mm_per_px /= max(math.cos(pitch_deviation_rad), 0.2)  # clamp near-grazing angles

    return 1 / gsd_mm_per_px


def resolve_px_per_mm(
    reference: Optional[ReferenceObjectMetadata] = None,
    uav: Optional[UavCaptureMetadata] = None,
    fallback: float = 8.0,
) -> float:
    if reference is not None:
        return px_per_mm_from_reference_object(reference)
    if uav is not None:
        return px_per_mm_from_uav(uav)
    return fallback
