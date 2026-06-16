import logging
from fastapi import APIRouter, UploadFile, File
from app.schemas.xray import XrayResponse
from app.xray.analyzer import analyze_xray

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
