from pydantic import BaseModel, Field


class NEREntity(BaseModel):
    entity: str = Field(..., description="Extracted text")
    type: str = Field(..., description="Entity type: DISEASE | MEDICATION | DOSAGE | ALLERGEN | SYMPTOM")
    confidence: float | None = Field(None, ge=0, le=1, description="Model confidence score")
    char_start: int | None = Field(None, description="Character start position")
    char_end: int | None = Field(None, description="Character end position")


class NERRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Clinical notes or text to extract entities from")


class NERResponse(BaseModel):
    entities: list[NEREntity] = []
    total: int = 0
    method: str = Field(..., description="biobert_ner | regex_fallback")
    error: str | None = None
