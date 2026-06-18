import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from app.schemas.xray import XrayResponse
from app.xray.analyzer import analyze_xray, use_finetuned_model

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyze", tags=["xray"])


@router.post("/xray", response_model=XrayResponse)
async def xray_analysis(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        return XrayResponse(
            findings=[],
            normal=None,
            error="Only image files are supported",
        )

    contents = await file.read()
    result = analyze_xray(contents)

    return XrayResponse(**result)


class FineTuneRequest(BaseModel):
    data_dir: str
    epochs: int = 10
    batch_size: int = 32
    lr: float = 0.0001
    multilabel: bool = False
    nih_labels: bool = False


class FineTuneStatus(BaseModel):
    status: str
    message: str
    model_loaded: bool | None = None


@router.post("/xray/finetune", response_model=FineTuneStatus)
async def trigger_finetune(params: FineTuneRequest):
    """Administrative endpoint to trigger X-ray model fine-tuning."""
    try:
        import sys
        from io import StringIO
        from app.xray.finetune import run_training

        old_stdout = sys.stdout
        sys.stdout = StringIO()

        run_training(params)

        sys.stdout = old_stdout

        loaded = use_finetuned_model(enabled=True)
        return FineTuneStatus(
            status="completed",
            message="Fine-tuning completed. Model loaded." if loaded else "Fine-tuning completed. Use fine-tuned model on next restart.",
            model_loaded=loaded,
        )
    except Exception as e:
        logger.error(f"Fine-tuning failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/xray/use-finetuned", response_model=FineTuneStatus)
async def toggle_finetuned(enabled: bool = True):
    """Toggle between fine-tuned and ImageNet-pretrained model."""
    result = use_finetuned_model(enabled)
    return FineTuneStatus(
        status="ok",
        message=f"Fine-tuned model {'loaded' if result else 'not available. Using ImageNet weights.' if enabled else 'disabled. Using ImageNet weights.'}",
        model_loaded=result if enabled else None,
    )
