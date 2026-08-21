# Model Accuracy

**Status: no model has been trained in this repo yet.** `models/yolov11-crack.onnx`, `models/deeplabv3-crack.onnx`, and `models/sdnet-classifier.onnx` don't exist (`service/main.py`'s `/predict` returns `503` until they do). This document is the honest methodology — what accuracy means here, how it's measured, and where the numbers will come from — not a claim of results that don't exist. The `92.4%` / `89.1%` / `88.7%` recall figures shown on the website's `/admin` page are **illustrative UI mock data**, not a real eval run. Run the pipeline (Section 4) to get real numbers and replace them.

**Datasets are downloaded and converted, but no training run has happened.** `datasets/crackforest/` (118 images, real bounding boxes + segmentation masks) and `datasets/sdnet2018/` (56,092 images, real, verified against the official dataset's own documented counts — 8,484 crack / 47,608 no-crack) are both on disk and converted into training-ready splits (`datasets/README.md`). Having the data is not the same as having a trained, evaluated model — don't conflate the two when describing this project's status.

## 1. What "accuracy" means for this project

Per the PRD (Section 19), this system is explicitly tuned to **prioritize recall over precision** — a missed crack is a materially worse outcome than a false positive a human dismisses in seconds. Every metric below is reported with that framing:

- **Recall** — the metric that gates model promotion (`eval/evaluate.py --min-recall`). "Did we find the crack?"
- **Precision** — reported, not gated. A model can ship with mediocre precision; it cannot ship with poor recall.
- **mAP50 / mAP50-95** — reported for context (standard object-detection benchmarking), but not the promotion criterion.
- **Width measurement error** — reported separately from detection recall (Section 3) since it comes from a different stage (segmentation, not the detector).

## 2. How detection accuracy is measured

`eval/evaluate.py` runs a trained checkpoint against the **held-out test split** (`datasets/combined_crack/images/test/`, 17 images, never seen during training) and writes `eval_report.json`:

```bash
cd ml-model/eval
python evaluate.py --weights ../training/runs/train/vigileye-yolov11/weights/best.pt \
                    --data ../training/dataset.yaml \
                    --min-recall 0.90
```

Exit code is non-zero if recall falls below `--min-recall` — this is the "model CI" gate referenced in the PRD (Section 15); a regression can't be promoted to `models/` without explicitly lowering the bar.

**0.90 is the target for a production run, not the current dataset.** With only 118 total images (85 train / 16 val / 17 test — see `datasets/README.md`), a real eval run on this starter set will almost certainly land well below 0.90. Use a lower `--min-recall` (e.g. `0.10`, as the root `package.json`'s `eval:ml` script does) to smoke-test the pipeline, and treat any resulting number as "the pipeline works end-to-end," not "the model is production-accurate."

## 3. How width-measurement accuracy is measured (separate from detection)

Width comes from one of two paths (`service/inference.py`), and each has a different error profile:

| Source | Method | Error characteristics |
|---|---|---|
| `segmentation` | DeepLabV3+ mask → medial-axis skeleton + distance transform (`service/segmentation.py`) | Accurate for the mask's shape; error dominated by (a) segmentation mask quality and (b) `px_per_mm` calibration accuracy |
| `bbox-heuristic` | Bounding box's shorter side (`service/severity.py`) | Systematically **overestimates** width for diagonal/curved cracks (a bbox around a diagonal line is wider than the line itself) — this is a known, structural limitation, not a bug |

Every prediction reports which path produced it (`measurementSource`), so downstream accuracy analysis can be split by measurement method rather than averaged together. There's no held-out width-error benchmark yet — CrackForest's ground truth is segmentation masks, not calibrated real-world measurements, so mask-vs-mask IoU is measurable but mask-vs-true-millimeters is not, absent a calibration-labeled dataset. **This is a real gap; do not report a width error number without labeled real-world measurements to check against.**

## 4. Reproducing real numbers

**Detector (YOLO, real localization, trained on CrackForest):**

```bash
npm run install:ml-train   # from the repo root
npm run pipeline:ml        # train -> eval -> export, see package.json for the exact flags
```

**Classifier (crack/no-crack, trained on the full SDNET2018 — 56,092 images):**

```bash
cd ml-model/training
python train_classifier.py --data ../datasets/sdnet2018_prepared/classification --arch mobilenet_v2 --epochs 15
python ../export/export_classifier_onnx.py --weights ../models/sdnet-classifier.pt --out ../models/sdnet-classifier.onnx
```

`train_classifier.py` prints `val_recall`/`val_precision`/`val_accuracy` per epoch directly (no separate eval script needed — the val set is scored every epoch). Or step by step for the detector path, see `README.md`. Each detector run overwrites `eval/eval_report.json` — check that file's `recall` field before updating any accuracy claim in the UI (`/admin`) or documentation. **Never copy a number from memory or a previous run into a claim; regenerate it.**

## 5. Known limitations affecting any current number

- **Detector dataset size** — the YOLO detector (real localization) trains on CrackForest's 118 images, enough to prove the pipeline works, not enough for a defensible production accuracy claim (CrackForest is road-surface photos; bridges/dams/buildings are barely represented). SDNET2018 (56,092 images) is real, downloaded, and covers bridge decks/walls/pavements — but it's classification-only ground truth (no boxes), so it trains `sdnet-classifier`, not the detector's localization accuracy. Don't conflate "we have 56k images" with "the detector is trained on 56k images" — it isn't; see `datasets/README.md`'s "which dataset trains which model" table.
- **CRACK500/METU not yet added** — still just a documented plan (`datasets/README.md`).
- **No domain diversity check yet** — `training/augmentations.py`'s domain-randomized augmentation (shadow/blur/rain/noise) is wired up but its effect on real-world generalization hasn't been measured against a held-out diverse-conditions set.
- **CPU training** — the commands in the root `package.json` assume CPU (no GPU asserted). Recall on a short CPU smoke run will understate what a properly-resourced GPU training run (per `training/train.py`'s defaults: `yolo11m`, 100 epochs) would achieve.
- **Calibration accuracy untested** — `service/calibration.py`'s UAV/reference-object formulas are standard photogrammetry math, not yet validated against a ground-truth calibration dataset.

If you're citing a number to judges, engineers, or in the pitch: it must trace back to a specific `eval_report.json` from a specific `git` commit, not this document's placeholders.
