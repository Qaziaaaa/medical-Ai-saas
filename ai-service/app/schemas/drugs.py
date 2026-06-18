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


class ContraindicationResult(BaseModel):
    drug: str
    severity: str = Field(..., pattern="^(contraindicated|caution)$")
    type: str = Field(..., pattern="^(allergy|disease)$")
    detail: str
    allergen: str | None = None
    condition: str | None = None


class ContraindicationCounts(BaseModel):
    contraindicated: int = 0
    caution: int = 0


class ContraindicationResponse(BaseModel):
    contraindications: list[ContraindicationResult] = []
    total: int = 0
    has_contraindication: bool = False
    counts: ContraindicationCounts = ContraindicationCounts()


class ContraindicationRequest(BaseModel):
    medications: list[str] = Field(..., min_length=1, description="List of medication names")
    allergies: list[str] = Field(default_factory=list, description="Patient allergy list")
    conditions: list[str] = Field(default_factory=list, description="Patient medical condition list")
