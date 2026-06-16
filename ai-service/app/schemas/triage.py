from pydantic import BaseModel, Field


class TriageRequest(BaseModel):
    symptoms: str = Field(..., min_length=1, description="Patient symptoms description")
    age: int | None = Field(None, ge=0, le=150, description="Patient age")
    gender: str | None = Field(None, pattern="^(male|female|other)$", description="Patient gender")


class TriageResponse(BaseModel):
    triage_level: str = Field(..., description="immediate | urgent | non-urgent | unknown")
    method: str = Field(..., description="keyword | biobert")
    matched_keyword: str | None = Field(None, description="Keyword that triggered the match")
    reason: str | None = Field(None, description="Explanation if no match found")
