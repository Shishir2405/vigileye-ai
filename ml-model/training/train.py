"""
Fine-tunes YOLOv11 for crack detection with experiment tracking (W&B).

    python train.py --data dataset.yaml --epochs 100 --img 640

Recall is the metric this project optimizes for (a missed crack is worse
than a false positive) — see PRD Section 19 and eval/evaluate.py, which
gates promotion on recall specifically, not just mAP.
"""

import argparse

import wandb
from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fine-tune YOLOv11 for crack detection")
    p.add_argument("--data", default="dataset.yaml")
    p.add_argument("--base-model", default="yolo11m.pt", help="Ultralytics base checkpoint to fine-tune from")
    p.add_argument("--epochs", type=int, default=100)
    p.add_argument("--img", type=int, default=640)
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--project", default="runs/train")
    p.add_argument("--name", default="vigileye-yolov11")
    p.add_argument("--wandb-project", default="vigileye-ml")
    p.add_argument("--no-wandb", action="store_true")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    if not args.no_wandb:
        wandb.init(project=args.wandb_project, name=args.name, config=vars(args))

    model = YOLO(args.base_model)
    model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.img,
        batch=args.batch,
        project=args.project,
        name=args.name,
        # Bias training toward recall: penalize missed boxes more than
        # extra ones, and lower the confidence threshold used for eval.
        box=7.5,
        cls=0.5,
        dfl=1.5,
        conf=0.15,
        iou=0.5,
        patience=20,
        pretrained=True,
        optimizer="AdamW",
        lr0=1e-3,
        cos_lr=True,
        augment=True,
    )

    metrics = model.val(data=args.data, split="test")
    print(f"Held-out test — recall: {metrics.box.mr:.4f}  mAP50: {metrics.box.map50:.4f}")

    if not args.no_wandb:
        wandb.log({"test/recall": metrics.box.mr, "test/mAP50": metrics.box.map50})
        wandb.finish()


if __name__ == "__main__":
    main()
