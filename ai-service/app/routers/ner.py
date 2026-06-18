from fastapi import APIRouter
from app.schemas.ner import NERRequest, NERResponse
from app.ner.extractor import extract_entities

router = APIRouter(prefix="/analyze", tags=["ner"])


@router.post("/ner", response_model=NERResponse)
async def extract_medical_entities(data: NERRequest):
    return NERResponse(**extract_entities(data.text))
