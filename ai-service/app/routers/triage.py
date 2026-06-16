from fastapi import APIRouter, Depends
from app.schemas.triage import TriageRequest, TriageResponse
from app.triage.keyword_triage import keyword_triage

router = APIRouter(prefix="/analyze", tags=["triage"])


@router.post("/triage", response_model=TriageResponse)
async def triage_analysis(data: TriageRequest):
    result = keyword_triage(data.symptoms)

    return TriageResponse(
        triage_level=result["triage_level"],
        method=result["method"],
        matched_keyword=result.get("matched_keyword"),
        reason=result.get("reason"),
    )
