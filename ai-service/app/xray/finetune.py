"""
Fine-tuning pipeline for DenseNet121 on chest X-ray datasets (CheXpert, NIH ChestX-ray14).

Usage:
    python -m app.xray.finetune --data_dir ./chexpert --epochs 10 --lr 0.0001
    python -m app.xray.finetune --data_dir ./nih --epochs 15 --lr 0.0001 --multilabel

Fine-tuned weights are saved to app/xray/checkpoints/ by default.
"""

import argparse
import json
import logging
import os
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from PIL import Image

logger = logging.getLogger(__name__)

DISEASE_LABELS_CHEXPERT = [
    "No Finding", "Enlarged Cardiomegaly", "Cardiomegaly", "Lung Opacity",
    "Lung Lesion", "Edema", "Consolidation", "Pneumonia", "Atelectasis",
    "Pneumothorax", "Pleural Effusion", "Pleural Other", "Fracture",
    "Support Devices",
]

DISEASE_LABELS_NIH = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration", "Mass",
    "Nodule", "Pneumonia", "Pneumothorax", "Consolidation", "Edema",
    "Emphysema", "Fibrosis", "Pleural Thickening", "Hernia",
]

CHECKPOINT_DIR = Path(__file__).resolve().parent / "checkpoints"


class ChestXrayDataset(Dataset):
    def __init__(self, image_dir, metadata_path, transform=None, multilabel=False):
        self.image_dir = Path(image_dir)
        self.transform = transform or transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        self.multilabel = multilabel
        self.samples = []

        with open(metadata_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(",")
                img_path = parts[0]
                labels = [float(x) if x else -1 for x in parts[1:]]
                self.samples.append((img_path, labels))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_rel, labels = self.samples[idx]
        img_path = self.image_dir / img_rel
        try:
            image = Image.open(img_path).convert("RGB")
        except (FileNotFoundError, OSError):
            image = Image.new("RGB", (224, 224), color=0)

        if self.transform:
            image = self.transform(image)

        label_tensor = torch.tensor(labels, dtype=torch.float)
        if not self.multilabel:
            label_tensor = label_tensor[0].long() if label_tensor.numel() == 1 else label_tensor

        return image, label_tensor


def build_model(num_classes: int, multilabel: bool = False) -> nn.Module:
    model = models.densenet121(weights=models.DenseNet121_Weights.IMAGENET1K_V1)
    in_features = model.classifier.in_features

    if multilabel:
        model.classifier = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )
    else:
        model.classifier = nn.Linear(in_features, num_classes)

    return model


def train_epoch(model, loader, criterion, optimizer, device, multilabel):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for images, labels in loader:
        images, labels = images.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(images)

        if multilabel:
            loss = criterion(outputs, labels)
        else:
            loss = criterion(outputs, labels)

        loss.backward()
        optimizer.step()
        total_loss += loss.item() * images.size(0)

        if not multilabel:
            _, predicted = torch.max(outputs, 1)
            if labels.dim() > 1:
                labels = labels.argmax(dim=1)
            correct += (predicted == labels).sum().item()
            total += labels.size(0)

    avg_loss = total_loss / len(loader.dataset)
    acc = correct / total if total > 0 else 0
    return avg_loss, acc


def evaluate(model, loader, criterion, device, multilabel):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)

            if multilabel:
                loss = criterion(outputs, labels)
            else:
                loss = criterion(outputs, labels)

            total_loss += loss.item() * images.size(0)

            if not multilabel:
                _, predicted = torch.max(outputs, 1)
                if labels.dim() > 1:
                    labels = labels.argmax(dim=1)
                correct += (predicted == labels).sum().item()
                total += labels.size(0)

    avg_loss = total_loss / len(loader.dataset)
    acc = correct / total if total > 0 else 0
    return avg_loss, acc


def run_training(args):
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    logger.info(f"Using device: {device}")

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    labels = DISEASE_LABELS_NIH if args.nih_labels else DISEASE_LABELS_CHEXPERT
    num_classes = len(labels)

    model = build_model(num_classes, args.multilabel).to(device)

    transform_train = transforms.Compose([
        transforms.Resize(256),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    transform_val = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    train_dataset = ChestXrayDataset(
        image_dir=args.data_dir,
        metadata_path=os.path.join(args.data_dir, "train.csv"),
        transform=transform_train,
        multilabel=args.multilabel,
    )
    val_dataset = ChestXrayDataset(
        image_dir=args.data_dir,
        metadata_path=os.path.join(args.data_dir, "val.csv"),
        transform=transform_val,
        multilabel=args.multilabel,
    )

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)

    if args.multilabel:
        criterion = nn.BCEWithLogitsLoss()
    else:
        criterion = nn.CrossEntropyLoss()

    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", patience=3, factor=0.5)

    best_val_loss = float("inf")
    metrics = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}

    logger.info(f"Training for {args.epochs} epochs on {len(train_dataset)} samples...")

    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device, args.multilabel)
        val_loss, val_acc = evaluate(model, val_loader, criterion, device, args.multilabel)

        metrics["train_loss"].append(round(train_loss, 4))
        metrics["train_acc"].append(round(train_acc, 4))
        metrics["val_loss"].append(round(val_loss, 4))
        metrics["val_acc"].append(round(val_acc, 4))

        scheduler.step(val_loss)
        current_lr = optimizer.param_groups[0]["lr"]

        logger.info(
            f"Epoch {epoch+1}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | "
            f"LR: {current_lr:.2e}"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            checkpoint = {
                "epoch": epoch + 1,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": val_loss,
                "val_acc": val_acc,
                "disease_labels": labels,
                "multilabel": args.multilabel,
            }
            checkpoint_path = CHECKPOINT_DIR / "best_model.pt"
            torch.save(checkpoint, checkpoint_path)
            logger.info(f"  → Saved best model to {checkpoint_path}")

    metrics_path = CHECKPOINT_DIR / "training_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Training metrics saved to {metrics_path}")

    final_path = CHECKPOINT_DIR / "final_model.pt"
    torch.save({
        "epoch": args.epochs,
        "model_state_dict": model.state_dict(),
        "disease_labels": labels,
        "multilabel": args.multilabel,
    }, final_path)
    logger.info(f"Final model saved to {final_path}")

    return metrics


def load_finetuned_model(checkpoint_path: str | None = None, device: str = "cpu"):
    path = checkpoint_path or str(CHECKPOINT_DIR / "best_model.pt")
    if not os.path.exists(path):
        logger.warning(f"No fine-tuned model found at {path}")
        return None, None

    checkpoint = torch.load(path, map_location=device, weights_only=True)
    num_classes = len(checkpoint["disease_labels"])
    model = build_model(num_classes, checkpoint.get("multilabel", False))
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    model.to(device)

    logger.info(f"Loaded fine-tuned model from {path} (epoch {checkpoint.get('epoch', '?')})")
    return model, checkpoint["disease_labels"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune DenseNet121 on chest X-rays")
    parser.add_argument("--data_dir", required=True, help="Directory with train.csv, val.csv and images")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.0001, help="Learning rate")
    parser.add_argument("--workers", type=int, default=4, help="Data loader workers")
    parser.add_argument("--multilabel", action="store_true", help="Multi-label classification")
    parser.add_argument("--nih_labels", action="store_true", help="Use NIH labels instead of CheXpert")
    parser.add_argument("--cpu", action="store_true", help="Force CPU training")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    run_training(args)
