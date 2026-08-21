"""
Exports a trained YOLOv11 checkpoint to ONNX for the inference service
(service/inference.py loads the ONNX model via onnxruntime, not the raw
PyTorch checkpoint, so serving doesn't depend on the training environment).

    python export_onnx.py --weights best.pt --out ../models/yolov11-crack.onnx

For edge deployment (Jetson/Raspberry Pi), continue the chain from the
resulting ONNX file: ONNX → TensorRT (Jetson) or ONNX → TFLite (ARM/Pi),
with INT8 post-training quantization to hit real-time frame rates.
"""

import argparse

from ultralytics import YOLO


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export a YOLOv11 checkpoint to ONNX")
    p.add_argument("--weights", required=True)
    p.add_argument("--out", default="../models/yolov11-crack.onnx")
    p.add_argument("--img", type=int, default=640)
    p.add_argument("--dynamic", action="store_true", help="Dynamic input shape (skip for edge/TensorRT targets)")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    model = YOLO(args.weights)
    exported_path = model.export(format="onnx", imgsz=args.img, dynamic=args.dynamic, simplify=True)
    print(f"Exported ONNX model to: {exported_path}")
    print(f"Copy/rename it to {args.out} for the inference service to pick up.")


if __name__ == "__main__":
    main()
