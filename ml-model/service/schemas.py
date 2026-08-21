"""
Response contract for /predict. Kept in exact sync with
../../backend/src/ml/ml.types.ts — this is the one seam between the model
and the rest of the stack, so it's the one place that needs to agree.
"""

from typing import List, Literal, Optional, Tuple

from pydantic import BaseModel, Field

CrackType = Literal["diagonal", "vertical", "horizontal", "map", "hairline"]
SeverityLevel = Literal["low", "medium", "high", "critical"]


MeasurementSource = Literal["segmentation", "bbox-heuristic"]


class CrackPrediction(BaseModel):
    crack_type: CrackType = Field(alias="crackType")
    width_mm: float = Field(alias="widthMm")
    length_cm: float = Field(alias="lengthCm")
    severity: SeverityLevel
    confidence: float
    bbox: Tuple[float, float, float, float]  # x1, y1, x2, y2 — normalized 0-1
    mask_url: Optional[str] = Field(default=None, alias="maskUrl")
    measurement_source: MeasurementSource = Field(
        default="bbox-heuristic",
        alias="measurementSource",
        description="'segmentation' when the DeepLabV3+ mask measured true width; "
        "'bbox-heuristic' when it fell back to the bbox shorter-side estimate.",
    )

    class Config:
        populate_by_name = True


class MlPredictResponse(BaseModel):
    model_version: str = Field(alias="modelVersion")
    image_width: int = Field(alias="imageWidth")
    image_height: int = Field(alias="imageHeight")
    predictions: List[CrackPrediction]
    inference_ms: float = Field(alias="inferenceMs")

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    model_version: str
    model_loaded: bool
