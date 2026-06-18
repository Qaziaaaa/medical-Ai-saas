from fastapi import APIRouter
from app.schemas.drugs import InteractionRequest, InteractionResponse, ContraindicationRequest, ContraindicationResponse
from app.drugs.checker import check_prescription
from app.drugs.contraindications import check_all_contraindications

router = APIRouter(prefix="/analyze", tags=["drugs"])


@router.post("/interactions", response_model=InteractionResponse)
async def check_drug_interactions(data: InteractionRequest):
    return InteractionResponse(**check_prescription(data.medications))


@router.post("/contraindications", response_model=ContraindicationResponse)
async def check_contraindications(data: ContraindicationRequest):
    return ContraindicationResponse(
        **check_all_contraindications(data.medications, data.allergies, data.conditions)
    )
