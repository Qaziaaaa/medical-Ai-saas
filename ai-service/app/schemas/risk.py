from pydantic import BaseModel, Field


class RiskRequest(BaseModel):
    age: int = Field(..., ge=0, le=150)
    gender: str | None = Field(None, pattern="^(male|female|other)$")
    visits_last_6mo: int = Field(0, ge=0)
    conditions_count: int = Field(0, ge=0)
    medication_count: int = Field(0, ge=0)
    has_chronic_condition: bool = False


class RiskResponse(BaseModel):
    risk_score: float
    risk_level: str
    contributing_factors: list[str] = []
