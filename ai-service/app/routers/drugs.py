from fastapi import APIRouter
from app.schemas.drugs import InteractionRequest, InteractionResponse
from app.drugs.checker import check_prescription

router = APIRouter(prefix="/analyze", tags=["drugs"])


@router.post("/interactions", response_model=InteractionResponse)
async def check_drug_interactions(data: InteractionRequest):
    return InteractionResponse(**check_prescription(data.medications))
