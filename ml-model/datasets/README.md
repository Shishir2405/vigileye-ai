# Datasets

## crackforest/ — real data, already in this repo

Pulled from [cuilimeng/CrackForest-dataset](https://github.com/cuilimeng/CrackForest-dataset) (~11MB, tracked in git). 156 real road-surface photos (480×320) shot in Beijing; 118 of them have pixel-accurate crack segmentation ground truth (`groundTruth/*.mat`, plus `.seg` Berkeley-segmentation-format files). This is the actual starter dataset for both models in this project — not a placeholder.

**License: non-commercial research use only** (per the dataset's own `SOURCE_README.md`). Fine for this hackathon/demo build; swap in a commercially-licensed dataset (or your own captured inspection photos) before any production/commercial use. If you use it, cite:

> Shi, Y., Cui, L., Qi, Z., Meng, F., & Chen, Z. (2016). Automatic road crack detection using random structured forests. *IEEE Transactions on Intelligent Transportation Systems*, 17(12), 3434-3445.

## combined_crack/ — derived, ready to train on

Generated from `crackforest/` by `../training/prepare_crackforest.py`, in exactly the layout `../training/dataset.yaml` expects:

```
combined_crack/
├── images/{train,val,test}/*.jpg     — 118 images, 85/16/17 split
├── labels/{train,val,test}/*.txt     — YOLO boxes (connected components on the mask)
└── masks/{train,val,test}/*.png      — binary crack masks, for the DeepLabV3+ segmentation model
```

Regenerate any time with:

```bash
cd ../training
python prepare_crackforest.py
```

118 images is enough to sanity-check the training/eval/export pipeline end-to-end (`train.py` → `evaluate.py` → `export_onnx.py` → the inference service) but is **not** enough data on its own to hit real recall targets.

## sdnet2018/ — real data, downloaded (not tracked in git — too large)

**SDNET2018** (Maguire, Dorafshan & Thomas — Utah State University, [official listing](https://digitalcommons.usu.edu/all_datasets/48/)): the full, official 56,092-image dataset, downloaded directly from USU's digital commons (no login required) and extracted here. Verified counts match the dataset's own documentation exactly — **8,484 cracked / 47,608 uncracked**, 256×256 JPEGs, split across three structure types:

```
sdnet2018/
├── D/CD, D/UD   — bridge decks, cracked / uncracked
├── P/CP, P/UP   — pavements, cracked / uncracked
└── W/CW, W/UW   — walls, cracked / uncracked
```

**~617MB raw — gitignored.** If you (or a teammate) need it again, re-run:

```bash
curl -L -o SDNET2018.zip "https://digitalcommons.usu.edu/context/all_datasets/article/1047/type/native/viewcontent"
unzip SDNET2018.zip && unzip "DATA_Maguire_20180517_ALL/SDNET2018.zip" -d sdnet2018
```

**This is a classification dataset, not a detection/segmentation one** — every image is labeled crack/no-crack as a whole; there are no bounding boxes and no masks. Don't claim otherwise. Cite as:

> Maguire, M., Dorafshan, S., & Thomas, R. J. (2018). SDNET2018: A concrete crack image dataset for machine learning applications. Utah State University. https://doi.org/10.15142/T3TD19

## sdnet2018_prepared/ — derived, ready to train on (also gitignored, ~1.2GB)

Generated from `sdnet2018/` by `../training/prepare_sdnet2018.py`:

```
sdnet2018_prepared/
├── classification/{train,val,test}/{crack,no_crack}/*.jpg   — the honest primary use (see below)
└── weak_yolo/images,labels/{train,val,test}/                — OPTIONAL whole-frame boxes, NOT real localization
```

Actual split produced (85/15/15, matches the official crack/no-crack ratio ~15%):

| Split | Images | Crack | No-crack |
|---|---|---|---|
| train | 39,266 | 5,920 | 33,346 |
| val | 8,413 | 1,297 | 7,116 |
| test | 8,413 | 1,267 | 7,146 |

**`classification/`** trains a MobileNetV2/ResNet18 crack/no-crack classifier (`../training/train_classifier.py`) — this is the dataset's real, defensible use, since its ground truth genuinely supports classification.

**`weak_yolo/`** exists only as an optional bridge for the existing YOLO training path: a "box" for a cracked image is the *entire 256×256 frame* (a crack was found somewhere in this image, not precisely where). **Never present a `weak_yolo`-trained detection as precise localization** — it isn't one. Real localization comes from `combined_crack/` (CrackForest's actual bounding boxes) above.

Regenerate any time:

```bash
cd ../training
python prepare_sdnet2018.py
```

## Which dataset trains which model

| Model | Trained on | Why |
|---|---|---|
| `sdnet-classifier` (MobileNetV2/ResNet18) | `sdnet2018_prepared/classification/` | SDNET2018's real ground truth — whole-image crack/no-crack, at real scale (56k images) |
| `yolov11-crack` (detector) | `combined_crack/` (CrackForest) | Real bounding boxes, so localization claims are honest — small (118 images), documented as a starter set |
| `deeplabv3-crack` (segmentation) | `combined_crack/` masks (CrackForest) | Only dataset here with pixel-level ground truth |

## Adding CRACK500 / METU on top

Neither is bundled here (both run from ~200MB to several GB). Fetch and convert following the same pattern as `prepare_crackforest.py` / `prepare_sdnet2018.py`:

- **CRACK500** — https://github.com/fyangneil/pavement-crack-detection
- **METU concrete crack classification** — https://data.mendeley.com/datasets/5y9wdsg2zt/2 (classification-only, 40k 227×227 images)
