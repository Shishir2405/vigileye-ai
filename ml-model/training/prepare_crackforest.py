"""
Converts the raw CrackForest dataset (../datasets/crackforest/{image,groundTruth}/)
into the two label formats this project's models need:

  1. YOLO detection labels (dataset.yaml's format) — one .txt per image with
     normalized [class cx cy w h] boxes, derived from connected components
     on the binary crack mask.
  2. Binary segmentation masks (PNG) for training the DeepLabV3+ model in
     ../ml-model/service/segmentation.py.

CrackForest's groundTruth/*.mat stores a per-pixel Segmentation array where
label 2 = crack, label 1 = background (verified against the dataset's own
files — see README in ../datasets/crackforest/).

Output layout matches training/dataset.yaml:

    ../datasets/combined_crack/
      images/{train,val,test}/*.jpg
      labels/{train,val,test}/*.txt   (YOLO boxes)
      masks/{train,val,test}/*.png    (segmentation masks)

    python prepare_crackforest.py --source ../datasets/crackforest \
                                   --out ../datasets/combined_crack \
                                   --val-split 0.15 --test-split 0.15
"""

import argparse
import random
import shutil
from pathlib import Path

import cv2
import numpy as np
import scipy.io as sio

CRACK_LABEL = 2
MIN_COMPONENT_AREA_PX = 15  # drop noise specks the mask segmentation introduces


def mask_from_mat(mat_path: Path) -> np.ndarray:
    data = sio.loadmat(str(mat_path))
    seg = data["groundTruth"][0, 0]["Segmentation"]
    return (seg == CRACK_LABEL).astype(np.uint8)


def mask_to_yolo_boxes(mask: np.ndarray) -> list[tuple[float, float, float, float]]:
    """Connected components on the mask -> one YOLO box per crack blob.
    A mask can contain several disjoint crack segments in one image."""
    num_labels, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    h, w = mask.shape
    boxes = []
    for label in range(1, num_labels):  # skip background (label 0)
        x, y, bw, bh, area = stats[label]
        if area < MIN_COMPONENT_AREA_PX:
            continue
        cx, cy = (x + bw / 2) / w, (y + bh / 2) / h
        boxes.append((cx, cy, bw / w, bh / h))
    return boxes


def process(source: Path, out: Path, val_split: float, test_split: float, seed: int) -> None:
    image_dir = source / "image"
    gt_dir = source / "groundTruth"
    image_paths = sorted(image_dir.glob("*.jpg"))
    if not image_paths:
        raise SystemExit(f"No images found under {image_dir}")

    random.seed(seed)
    shuffled = image_paths[:]
    random.shuffle(shuffled)

    n = len(shuffled)
    n_val = max(1, int(n * val_split))
    n_test = max(1, int(n * test_split))
    splits = {
        "val": shuffled[:n_val],
        "test": shuffled[n_val : n_val + n_test],
        "train": shuffled[n_val + n_test :],
    }

    for split, paths in splits.items():
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)
        (out / "masks" / split).mkdir(parents=True, exist_ok=True)

        n_boxes = 0
        n_processed = 0
        n_skipped = 0
        for img_path in paths:
            stem = img_path.stem
            mat_path = gt_dir / f"{stem}.mat"
            if not mat_path.exists():
                n_skipped += 1
                continue

            mask = mask_from_mat(mat_path)
            boxes = mask_to_yolo_boxes(mask)
            n_boxes += len(boxes)
            n_processed += 1

            shutil.copy(img_path, out / "images" / split / img_path.name)
            cv2.imwrite(str(out / "masks" / split / f"{stem}.png"), mask * 255)

            label_lines = [f"0 {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}" for cx, cy, w, h in boxes]
            (out / "labels" / split / f"{stem}.txt").write_text("\n".join(label_lines))

        skip_note = f", {n_skipped} skipped (no matching groundTruth/*.mat)" if n_skipped else ""
        print(f"{split}: {n_processed} images processed, {n_boxes} crack boxes{skip_note}")

    print(f"\nDone. Dataset ready at {out} — matches training/dataset.yaml's expected layout.")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Convert CrackForest to YOLO boxes + segmentation masks")
    p.add_argument("--source", default="../datasets/crackforest")
    p.add_argument("--out", default="../datasets/combined_crack")
    p.add_argument("--val-split", type=float, default=0.15)
    p.add_argument("--test-split", type=float, default=0.15)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    process(Path(args.source), Path(args.out), args.val_split, args.test_split, args.seed)
