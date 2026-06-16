from fastapi import APIRouter
from app.schemas.risk import RiskRequest, RiskResponse
from app.risk.predictor import predict_risk

router = APIRouter(prefix="/analyze", tags=["risk"])


@router.post("/risk", response_model=RiskResponse)
async def risk_analysis(data: RiskRequest):
    return RiskResponse(
        **predict_risk(
            age=data.age,
            gender=data.gender,
            visits=data.visits_last_6mo,
            conditions=data.conditions_count,
            medications=data.medication_count,
            chronic=data.has_chronic_condition,
        )
    )
