from pydantic import BaseModel, Field


class ReportRequest(BaseModel):
    notes: str = Field(..., min_length=1, description="Doctor's clinical notes")
    patient_name: str = Field("Unknown", description="Patient name")
    age: int | None = Field(None, ge=0, le=150, description="Patient age")
    gender: str | None = Field(None, description="Patient gender")


class ReportResponse(BaseModel):
    report: str | None = None
    model: str = ""
    error: str | None = None
