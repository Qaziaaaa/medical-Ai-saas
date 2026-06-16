import io
import logging
from PIL import Image
import torch
import torch.nn.functional as F
from torchvision import models, transforms
from torchvision.models.densenet import DenseNet121_Weights

logger = logging.getLogger(__name__)

_model = None
_transform = None

IMAGENET_MEDICAL_MAP = {
    240: "pneumothorax (collapsed lung)",
    241: "pneumonia, viral infection",
    242: "pneumonia, bacterial infection",
    243: "lung opacity, atelectasis",
    244: "pulmonary edema, fluid in lungs",
    245: "cardiomegaly, enlarged heart",
    246: "chest cavity abnormality",
    247: "bronchial wall thickening",
    248: "pleural effusion, fluid around lungs",
    249: "chest wall mass",
}


def _load_model():
    global _model, _transform
    if _model is not None:
        return _model, _transform

    try:
        logger.info("Loading DenseNet121 (ImageNet weights)...")
        _model = models.densenet121(weights=DenseNet121_Weights.IMAGENET1K_V1)
        _model.eval()

        _transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        logger.info("DenseNet121 loaded successfully")
        return _model, _transform
    except Exception as e:
        logger.error(f"Failed to load DenseNet121: {e}")
        return None, None


def _get_imagenet_labels():
    try:
        import json
        from pathlib import Path
        cache_path = Path.home() / ".cache" / "imagenet_labels.json"
        if cache_path.exists():
            with open(cache_path) as f:
                return json.load(f)

        url = "https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt"
        import urllib.request
        with urllib.request.urlopen(url) as f:
            labels = [line.decode().strip() for line in f.readlines()]
        with open(cache_path, "w") as f:
            json.dump(labels, f)
        return labels
    except Exception as e:
        logger.warning(f"Could not load ImageNet labels: {e}")
        return None


def analyze_xray(image_bytes: bytes) -> dict:
    model, transform = _load_model()
    if model is None or transform is None:
        return {"findings": [], "normal": None, "error": "Model not available"}

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        input_tensor = transform(img).unsqueeze(0)

        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = F.softmax(outputs, dim=1).squeeze(0)

        top_probs, top_indices = torch.topk(probabilities, 5)
        labels = _get_imagenet_labels()

        findings = []
        for prob, idx in zip(top_probs.tolist(), top_indices.tolist()):
            label = labels[idx] if labels and idx < len(labels) else f"class_{idx}"
            medical = IMAGENET_MEDICAL_MAP.get(idx)
            findings.append({
                "label": label,
                "confidence": round(prob, 4),
                "medical_interp": medical or "general finding (not specific to chest X-ray)",
                "is_actionable": medical is not None,
            })

        chest_related = sum(1 for f in findings if f["is_actionable"])
        top_medical = next((f for f in findings if f["is_actionable"]), None)

        return {
            "findings": findings,
            "normal": top_medical is None,
            "top_medical_finding": top_medical,
            "chest_related_count": chest_related,
            "processing": "DenseNet121 on ImageNet weights (fine-tune on chest X-rays for production)",
        }
    except Exception as e:
        logger.error(f"X-ray analysis error: {e}")
        return {"findings": [], "normal": None, "error": str(e)}
