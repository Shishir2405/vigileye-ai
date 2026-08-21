"""
Exports a trained SDNET2018 classifier checkpoint (from
../training/train_classifier.py) to ONNX for the inference service.

    python export_classifier_onnx.py --weights ../models/sdnet-classifier.pt \
                                      --out ../models/sdnet-classifier.onnx
"""

import argparse
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent.parent / "training"))
from train_classifier import build_model  # noqa: E402 (needs sys.path set first)


def main() -> None:
    p = argparse.ArgumentParser(description="Export the SDNET2018 classifier checkpoint to ONNX")
    p.add_argument("--weights", required=True)
    p.add_argument("--out", default="../models/sdnet-classifier.onnx")
    p.add_argument("--img-size", type=int, default=224)
    args = p.parse_args()

    ckpt = torch.load(args.weights, map_location="cpu")
    model = build_model(ckpt["arch"])
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    dummy_input = torch.randn(1, 3, args.img_size, args.img_size)
    torch.onnx.export(
        model,
        dummy_input,
        args.out,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported ONNX classifier to {args.out}. classes={ckpt['classes']} (index 0 = '{ckpt['classes'][0]}')")


if __name__ == "__main__":
    main()
