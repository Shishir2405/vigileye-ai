"""
The single inference API for VigilEye AI. ../../backend's MlService calls
POST /predict; nothing else in the stack talks to the model directly.

    uvicorn main:app --host 0.0.0.0 --port 9000
"""

import io
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image

from calibration import CameraIntrinsics, ReferenceObjectMetadata, UavCaptureMetadata, resolve_px_per_mm
from inference import CONFIDENCE_THRESHOLD, MODEL_VERSION, detector
from schemas import HealthResponse, MlPredictResponse
from segmentation import segmenter

app = FastAPI(
    title="VigilEye AI Inference API",
    description="Crack detection, sizing, and severity grading — one model, one endpoint.",
    version="0.2.0",
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok" if detector.is_loaded else "degraded",
        model_version=MODEL_VERSION,
        model_loaded=detector.is_loaded,
    )


@app.post("/predict", response_model=MlPredictResponse, response_model_by_alias=True)
async def predict(
    file: UploadFile = File(...),
    tta: bool = Form(False, description="Enable test-time augmentation (flip + multi-scale) — higher recall, ~3-4x slower."),
    use_segmentation: bool = Form(True, description="Use the DeepLabV3+ mask for width when the segmentation model is loaded."),
    # Reference-object calibration (handheld / fixed camera)
    ref_known_width_mm: Optional[float] = Form(None),
    ref_measured_width_px: Optional[float] = Form(None),
    # UAV calibration
    uav_altitude_m: Optional[float] = Form(None),
    uav_gimbal_pitch_deg: Optional[float] = Form(None),
    camera_focal_length_mm: Optional[float] = Form(None),
    camera_sensor_width_mm: Optional[float] = Form(None),
) -> JSONResponse:
    if not detector.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="No model loaded. Run training/train.py + export/export_onnx.py, "
            "or set MODEL_PATH to an existing ONNX file.",
        )

    contents = await file.read()
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {exc}") from exc

    image_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)

    reference = None
    if ref_known_width_mm is not None and ref_measured_width_px is not None:
        reference = ReferenceObjectMetadata(known_width_mm=ref_known_width_mm, measured_width_px=ref_measured_width_px)

    uav = None
    if uav_altitude_m is not None and camera_focal_length_mm is not None and camera_sensor_width_mm is not None:
        uav = UavCaptureMetadata(
            altitude_m=uav_altitude_m,
            gimbal_pitch_deg=uav_gimbal_pitch_deg if uav_gimbal_pitch_deg is not None else 90.0,
            intrinsics=CameraIntrinsics(
                focal_length_mm=camera_focal_length_mm,
                sensor_width_mm=camera_sensor_width_mm,
                image_width_px=pil_image.width,
            ),
        )

    px_per_mm = resolve_px_per_mm(reference=reference, uav=uav)

    predictions, inference_ms = detector.predict(
        image_bgr, px_per_mm=px_per_mm, use_tta=tta, use_segmentation=use_segmentation
    )

    response = MlPredictResponse(
        modelVersion=MODEL_VERSION,
        imageWidth=pil_image.width,
        imageHeight=pil_image.height,
        predictions=predictions,
        inferenceMs=round(inference_ms, 2),
    )
    return JSONResponse(content=response.model_dump(by_alias=True))


@app.get("/")
def root():
    return {
        "service": "vigileye-inference",
        "model_version": MODEL_VERSION,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "segmentation_model_loaded": segmenter.is_loaded,
        "datasets": [
            {
                "name": "CrackForest",
                "source": "https://github.com/cuilimeng/CrackForest-dataset",
                "trains": ["yolov11-crack (detector)", "deeplabv3-crack (segmentation)"],
                "description": "118 labeled real road-crack photos (480x320) with pixel-level segmentation "
                "ground truth, converted to YOLO boxes + masks by ../training/prepare_crackforest.py. "
                "The only dataset here with real localization ground truth. "
                "License: non-commercial research use only.",
                "image_count": 118,
            },
            {
                "name": "SDNET2018",
                "source": "https://digitalcommons.usu.edu/all_datasets/48/",
                "trains": ["sdnet-classifier (crack/no-crack classification)"],
                "description": "Official Utah State University release, 56,092 real 256x256 concrete "
                "surface images (bridge decks, walls, pavements), downloaded and converted by "
                "../training/prepare_sdnet2018.py. Classification-only ground truth (no boxes/masks) — "
                "trains the classifier, not the detector's localization.",
                "image_count": 56092,
            },
        ],
        "datasets_readme": "../datasets/README.md",
        "docs": "/docs",
    }
