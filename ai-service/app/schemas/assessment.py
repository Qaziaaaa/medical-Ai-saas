from pydantic import BaseModel, Field


class PatientInfo(BaseModel):
    age: int | None = None
    gender: str | None = None
    conditions: list[str] = []
    medications: list[str] = []
    allergies: list[str] = []


class TriageAssessment(BaseModel):
    triage_level: str = "unknown"
    method: str = "none"
    confidence: float | None = None
    reason: str | None = None


class RiskAssessment(BaseModel):
    risk_level: str = "unknown"
    risk_score: float = 0
    contributing_factors: list[str] = []


class AssessmentRequest(BaseModel):
    symptoms: str | None = Field(None, description="Patient-reported symptoms")
    age: int | None = Field(None, ge=0, le=150, description="Patient age")
    gender: str | None = Field(None, pattern="^(male|female)$", description="Patient gender")
    medical_conditions: list[str] = Field(default_factory=list, description="Known medical conditions")
    medications: list[str] = Field(default_factory=list, description="Current medications")
    allergies: list[str] = Field(default_factory=list, description="Known allergies")
    visits_last_6mo: int = Field(0, ge=0, description="Number of visits in last 6 months")
    conditions_count: int = Field(0, ge=0, description="Number of conditions")
    medication_count: int = Field(0, ge=0, description="Number of medications")
    has_chronic: bool = Field(False, description="Has chronic condition")


class AssessmentResponse(BaseModel):
    patient: PatientInfo
    triage: TriageAssessment
    risk: RiskAssessment
    contraindications: dict
    summary: str
    recommendations: list[str] = []
