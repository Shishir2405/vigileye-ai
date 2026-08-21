# VigilEye AI ML Model

One accurate crack-detection model, served behind a single inference API that `../backend` calls. This is deliberately **not** multiple models running in parallel — one well-trained, well-evaluated model is more reliable to demo, debug, and improve than several competing ones, per the PRD's "interpretability and accuracy over complexity" stance (Section 10).

**Accuracy numbers, methodology, and honest current limitations: see [ACCURACY.md](ACCURACY.md).**

## Pipeline

```
training/   → fine-tune YOLOv11 (detection) + DeepLabV3+ (segmentation, for precise width)
eval/       → recall/precision/mAP on held-out split, gate before promoting a model
export/     → PyTorch → ONNX (+ TensorRT/TFLite for edge, later)
service/    → FastAPI inference API — the ONE thing other code talks to
models/     → trained weights (gitignored — .pt/.onnx are large binaries)
datasets/   → real starter dataset (crackforest/) + derived training set (combined_crack/), both tracked in git — see datasets/README.md
```

## Dataset

Two real, downloaded datasets, each used for what its ground truth actually supports — see `datasets/README.md` for the full breakdown:

- **CrackForest** (118 images, tracked in git, ~11MB) — real bounding boxes + segmentation masks, via `training/prepare_crackforest.py`. Trains the YOLO detector (`yolov11-crack`) and the segmentation model (`deeplabv3-crack`) — the only dataset here with real localization ground truth.
- **SDNET2018** (56,092 images, official USU release, ~617MB — downloaded locally, not tracked in git due to size) — classification-only ground truth (crack/no-crack, no boxes), via `training/prepare_sdnet2018.py`. Trains `sdnet-classifier` (MobileNetV2/ResNet18), the honest use of a dataset this large without forcing fake localization labels onto it.

```bash
cd training
python prepare_crackforest.py    # -> ../datasets/combined_crack (118 images)
python prepare_sdnet2018.py      # -> ../datasets/sdnet2018_prepared (56,092 images) — requires datasets/sdnet2018/ present locally first
```

118 detector-training images is enough to run the full pipeline end-to-end (train → eval → export → serve) but not enough to hit production recall targets for localization; the 56k-image classifier has real scale behind it. See `datasets/README.md` for exact per-split counts and how to re-fetch SDNET2018 or add CRACK500/METU.

## Two-stage accuracy pipeline (service/)

Detection alone only gets you a bounding box, and a bbox is a poor proxy for
crack width. The service runs two stages:

1. **`inference.py`** — YOLOv11 detects crack regions (recall-biased, low confidence threshold).
2. **`segmentation.py`** — for each detection, DeepLabV3+ segments the crack within a padded crop; true width comes from the **medial axis** (skeleton) of that mask via `skimage.morphology.skeletonize` + a distance transform, not the bbox's shorter side. Falls back to the bbox heuristic (`severity.py`) automatically when no segmentation model is loaded.

Two more accuracy levers, both opt-in per request (form fields on `/predict`):

- **`tta.py`** — test-time augmentation (horizontal flip + multi-scale passes, merged with NMS) for a recall bump on hard/hairline cracks. `tta=true`, ~3-4x slower — meant for batch/backlog processing, not the edge's single-pass low-latency path.
- **`calibration.py`** — real pixel-to-mm scale from either a reference object in frame (`ref_known_width_mm` + `ref_measured_width_px`) or UAV altitude + gimbal angle + camera intrinsics (`uav_altitude_m`, `camera_focal_length_mm`, `camera_sensor_width_mm`), replacing the placeholder `DEFAULT_PX_PER_MM` in `severity.py` when supplied.

Each prediction reports `measurementSource: "segmentation" | "bbox-heuristic"` so the dashboard/backend can show which measurement method produced a given width.

## Why one model behind an API

`../backend`'s `MlService` calls `POST /predict` on `service/main.py` and gets back typed predictions (`../backend/src/ml/ml.types.ts` mirrors `service/schemas.py` exactly). Improving accuracy means retraining and redeploying **this one service** — nothing else in the stack changes shape. That's what "accurate" means operationally: one model, evaluated on a held-out set every time, with a promotion gate (`eval/evaluate.py`) before it's allowed to replace the currently served version.

## Run the inference service

```bash
cd service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 9000
```

`../backend/.env` should point `ML_SERVICE_URL=http://localhost:9000` at it.

## Train

```bash
cd training
pip install -r ../requirements.txt
python train.py --data dataset.yaml --epochs 100 --img 640
```

Then gate + export:

```bash
python ../eval/evaluate.py --weights runs/train/exp/weights/best.pt --data dataset.yaml --min-recall 0.90
python ../export/export_onnx.py --weights runs/train/exp/weights/best.pt --out ../models/yolov11-crack.onnx
```
