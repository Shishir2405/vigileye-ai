"""
Converts the raw SDNET2018 dataset (Maguire, Dorafshan & Thomas, Utah State
University — https://digitalcommons.usu.edu/all_datasets/48/) into training
data for this project.

SDNET2018 ships as three structure-type folders, each split into cracked (C)
and uncracked (U) subfolders of 256x256 JPEGs:

    D/  bridge Decks   -> D/CD (cracked), D/UD (uncracked)
    P/  Pavements      -> P/CP (cracked), P/UP (uncracked)
    W/  Walls          -> W/CW (uncracked), W/UW (uncracked)

IMPORTANT — read this before trusting any downstream "localization" claim:
SDNET2018 is a CLASSIFICATION dataset. Every image is labeled crack/no-crack
as a whole; there are no bounding boxes and no segmentation masks. This
script supports both approved uses from ../ACCURACY.md's dataset section:

  1. classification/  — the recommended, honest primary use: a crack/
     no-crack image classifier (ResNet18/MobileNetV2 fine-tune), which is
     exactly what SDNET2018's ground truth supports.
  2. weak_yolo/        — OPTIONAL, clearly-labeled weak supervision: for
     every cracked image, the "box" is the *entire frame* (a crack was
     found somewhere in this image, not precisely where). This is NOT real
     localization — do not present weak_yolo detections as precise bounding
     boxes to a judge or user. It exists only so the existing YOLO training
     path (train.py) can optionally warm-start on SDNET2018's scale before
     fine-tuning on CrackForest's real bounding boxes for actual
     localization accuracy.

    python prepare_sdnet2018.py --source ../datasets/sdnet2018 \
                                 --out ../datasets/sdnet2018_prepared \
                                 --val-split 0.15 --test-split 0.15
"""

import argparse
import random
import shutil
from pathlib import Path

# (subfolder-prefix, structure-type-name) — matches SDNET2018's own naming.
STRUCTURE_TYPES = [("D", "deck"), ("P", "pavement"), ("W", "wall")]


def find_class_dirs(source: Path, type_prefix: str) -> tuple[Path, Path]:
    """Returns (cracked_dir, uncracked_dir) for a structure type, e.g. D -> (D/CD, D/UD)."""
    base = source / type_prefix
    cracked = base / f"C{type_prefix}"
    uncracked = base / f"U{type_prefix}"
    if not cracked.exists() or not uncracked.exists():
        raise SystemExit(
            f"Expected {cracked} and {uncracked} to exist. SDNET2018's zip layout can vary "
            f"slightly by mirror — check {base} and adjust STRUCTURE_TYPES/find_class_dirs if needed."
        )
    return cracked, uncracked


def collect_labeled_images(source: Path) -> list[tuple[Path, str, str]]:
    """Returns (image_path, label, structure_type) for every image, label in {'crack','no_crack'}."""
    items = []
    for prefix, structure_type in STRUCTURE_TYPES:
        cracked_dir, uncracked_dir = find_class_dirs(source, prefix)
        items += [(p, "crack", structure_type) for p in sorted(cracked_dir.glob("*.jpg"))]
        items += [(p, "no_crack", structure_type) for p in sorted(uncracked_dir.glob("*.jpg"))]
    return items


def split(items: list, val_split: float, test_split: float, seed: int) -> dict[str, list]:
    random.seed(seed)
    shuffled = items[:]
    random.shuffle(shuffled)
    n = len(shuffled)
    n_val = int(n * val_split)
    n_test = int(n * test_split)
    return {
        "val": shuffled[:n_val],
        "test": shuffled[n_val : n_val + n_test],
        "train": shuffled[n_val + n_test :],
    }


def write_classification_set(splits: dict[str, list], out: Path) -> None:
    for split_name, items in splits.items():
        for img_path, label, structure_type in items:
            dest_dir = out / "classification" / split_name / label
            dest_dir.mkdir(parents=True, exist_ok=True)
            # Prefix filename with structure type to avoid collisions across D/P/W (SDNET
            # filenames repeat, e.g. 001.jpg exists under both CD and CP).
            shutil.copy(img_path, dest_dir / f"{structure_type}_{img_path.name}")


def write_weak_yolo_set(splits: dict[str, list], out: Path) -> None:
    """Whole-frame boxes for cracked images, empty label files for uncracked —
    see the module docstring: this is weak supervision, not real localization."""
    for split_name, items in splits.items():
        img_dir = out / "weak_yolo" / "images" / split_name
        label_dir = out / "weak_yolo" / "labels" / split_name
        img_dir.mkdir(parents=True, exist_ok=True)
        label_dir.mkdir(parents=True, exist_ok=True)

        for img_path, label, structure_type in items:
            stem = f"{structure_type}_{img_path.stem}"
            shutil.copy(img_path, img_dir / f"{stem}.jpg")
            if label == "crack":
                # whole-frame box: class 0, centered, full width/height
                (label_dir / f"{stem}.txt").write_text("0 0.5 0.5 1.0 1.0")
            else:
                (label_dir / f"{stem}.txt").write_text("")  # no objects


def main() -> None:
    p = argparse.ArgumentParser(description="Convert SDNET2018 to classification + optional weak-YOLO format")
    p.add_argument("--source", default="../datasets/sdnet2018", help="Path to the extracted SDNET2018 zip contents")
    p.add_argument("--out", default="../datasets/sdnet2018_prepared")
    p.add_argument("--val-split", type=float, default=0.15)
    p.add_argument("--test-split", type=float, default=0.15)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--skip-weak-yolo", action="store_true", help="Only build the classification set")
    args = p.parse_args()

    source = Path(args.source)
    out = Path(args.out)
    items = collect_labeled_images(source)
    if not items:
        raise SystemExit(f"No images found under {source} — check the extracted folder structure.")

    n_crack = sum(1 for _, label, _ in items if label == "crack")
    print(f"Found {len(items)} images total ({n_crack} crack / {len(items) - n_crack} no_crack)")

    splits = split(items, args.val_split, args.test_split, args.seed)
    for name, subset in splits.items():
        n_c = sum(1 for _, label, _ in subset if label == "crack")
        print(f"{name}: {len(subset)} images ({n_c} crack / {len(subset) - n_c} no_crack)")

    write_classification_set(splits, out)
    print(f"\nclassification/ written to {out / 'classification'}")

    if not args.skip_weak_yolo:
        write_weak_yolo_set(splits, out)
        print(f"weak_yolo/ written to {out / 'weak_yolo'} (whole-frame boxes — weak supervision, see module docstring)")


if __name__ == "__main__":
    main()
