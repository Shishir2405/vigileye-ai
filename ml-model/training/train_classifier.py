"""
Fallback path recommended in the VigilEye build doc (Section 2) for
SDNET2018, whose ground truth is crack/no-crack classification only (no
boxes, no masks): fine-tune a MobileNetV2 (default) or ResNet18 image
classifier instead of forcing a detector onto labels that don't support
real localization.

This is the honest counterpart to train.py (which trains the YOLO
detector on CrackForest's real bounding boxes). Use this script's output
as a whole-image crack/no-crack signal — e.g. a fast pre-filter before the
more expensive detector runs, or standalone when only classification-level
ground truth exists.

    python train_classifier.py --data ../datasets/sdnet2018_prepared/classification \
                                --arch mobilenet_v2 --epochs 15 --batch 64
"""

import argparse
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms


def build_model(arch: str) -> nn.Module:
    if arch == "mobilenet_v2":
        model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
        model.classifier[1] = nn.Linear(model.last_channel, 2)
    elif arch == "resnet18":
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        model.fc = nn.Linear(model.fc.in_features, 2)
    else:
        raise ValueError(f"Unknown arch: {arch}")
    return model


def build_loaders(data_dir: Path, batch: int, img_size: int) -> tuple[DataLoader, DataLoader, list[str]]:
    train_tf = transforms.Compose(
        [
            transforms.Resize((img_size, img_size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    eval_tf = transforms.Compose(
        [
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    train_ds = datasets.ImageFolder(data_dir / "train", transform=train_tf)
    val_ds = datasets.ImageFolder(data_dir / "val", transform=eval_tf)

    train_loader = DataLoader(train_ds, batch_size=batch, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=batch, shuffle=False, num_workers=2)
    return train_loader, val_loader, train_ds.classes


def evaluate(model: nn.Module, loader: DataLoader, device: str) -> dict:
    """Recall/precision on the 'crack' class — same recall-first framing as evaluate.py."""
    model.eval()
    tp = fp = fn = tn = 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            preds = model(images).argmax(dim=1)
            for pred, label in zip(preds.tolist(), labels.tolist()):
                if label == 0 and pred == 0:
                    tp += 1  # class 0 = 'crack' (ImageFolder sorts alphabetically: crack, no_crack)
                elif label == 1 and pred == 0:
                    fp += 1
                elif label == 0 and pred == 1:
                    fn += 1
                else:
                    tn += 1
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    accuracy = (tp + tn) / max(1, tp + fp + fn + tn)
    return {"recall": recall, "precision": precision, "accuracy": accuracy}


def main() -> None:
    p = argparse.ArgumentParser(description="Fine-tune a crack/no-crack classifier on SDNET2018")
    p.add_argument("--data", default="../datasets/sdnet2018_prepared/classification")
    p.add_argument("--arch", default="mobilenet_v2", choices=["mobilenet_v2", "resnet18"])
    p.add_argument("--epochs", type=int, default=15)
    p.add_argument("--batch", type=int, default=64)
    p.add_argument("--img-size", type=int, default=224)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--out", default="../models/sdnet-classifier.pt")
    args = p.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"device: {device}")

    train_loader, val_loader, classes = build_loaders(Path(args.data), args.batch, args.img_size)
    print(f"classes: {classes} (index 0 = '{classes[0]}')")

    model = build_model(args.arch).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(args.epochs):
        model.train()
        running_loss = 0.0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        metrics = evaluate(model, val_loader, device)
        print(
            f"epoch {epoch + 1}/{args.epochs}  loss={running_loss / len(train_loader):.4f}  "
            f"val_recall={metrics['recall']:.4f}  val_precision={metrics['precision']:.4f}  "
            f"val_accuracy={metrics['accuracy']:.4f}"
        )

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model_state": model.state_dict(), "arch": args.arch, "classes": classes}, args.out)
    print(f"\nSaved to {args.out}. Export to ONNX with export/export_classifier_onnx.py before serving.")


if __name__ == "__main__":
    main()
