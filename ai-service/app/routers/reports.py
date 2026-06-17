from fastapi import APIRouter
from app.schemas.reports import ReportRequest, ReportResponse
from app.reports.generator import generate_soap_report

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportResponse)
async def generate_report(data: ReportRequest):
    result = generate_soap_report(
        notes=data.notes,
        patient_name=data.patient_name,
        age=data.age,
        gender=data.gender,
    )
    return ReportResponse(**result)
