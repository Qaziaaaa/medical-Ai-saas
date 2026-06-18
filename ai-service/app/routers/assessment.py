from fastapi import APIRouter
from app.schemas.assessment import AssessmentRequest, AssessmentResponse
from app.assessment.assessor import unified_assessment

router = APIRouter(prefix="/analyze", tags=["assessment"])


@router.post("/assessment", response_model=AssessmentResponse)
async def full_patient_assessment(data: AssessmentRequest):
    return AssessmentResponse(
        **unified_assessment(
            symptoms=data.symptoms,
            age=data.age,
            gender=data.gender,
            medical_conditions=data.medical_conditions,
            medications=data.medications,
            allergies=data.allergies,
            visits_last_6mo=data.visits_last_6mo,
            conditions_count=data.conditions_count,
            medication_count=data.medication_count,
            has_chronic=data.has_chronic,
        )
    )
