from pydantic import BaseModel, Field


class DrugInteractionResult(BaseModel):
    severity: str = Field(..., pattern="^(major|moderate|minor)$")
    effect: str
    recommendation: str
    pair: list[str]


class InteractionCounts(BaseModel):
    major: int = 0
    moderate: int = 0
    minor: int = 0


class InteractionResponse(BaseModel):
    interactions: list[DrugInteractionResult] = []
    total_pairs: int = 0
    has_interaction: bool = False
    counts: InteractionCounts = InteractionCounts()


class InteractionRequest(BaseModel):
    medications: list[str] = Field(..., min_length=2, description="List of medication names")
