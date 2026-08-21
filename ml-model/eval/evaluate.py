"""
Evaluates a trained checkpoint against the held-out test split and fails
(non-zero exit) if recall drops below --min-recall. This is the "model CI"
gate referenced in the PRD (Section 15) — run it before promoting any
checkpoint to models/ and before the inference service picks it up.

    python evaluate.py --weights runs/train/exp/weights/best.pt \
                        --data ../training/dataset.yaml \
                        --min-recall 0.90
"""

import argparse
import json
import sys
from pathlib import Path

from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Evaluate + gate a crack-detection checkpoint")
    p.add_argument("--weights", required=True)
    p.add_argument("--data", required=True)
    p.add_argument("--min-recall", type=float, default=0.90)
    p.add_argument("--report-out", default="eval_report.json")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    model = YOLO(args.weights)
    metrics = model.val(data=args.data, split="test")

    report = {
        "weights": args.weights,
        "recall": float(metrics.box.mr),
        "precision": float(metrics.box.mp),
        "map50": float(metrics.box.map50),
        "map50_95": float(metrics.box.map),
        "min_recall_required": args.min_recall,
    }
    Path(args.report_out).write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))

    if report["recall"] < args.min_recall:
        print(
            f"FAIL: recall {report['recall']:.4f} is below the required "
            f"minimum {args.min_recall:.4f} — this checkpoint must not be promoted.",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"PASS: recall {report['recall']:.4f} >= {args.min_recall:.4f}")


if __name__ == "__main__":
    main()
