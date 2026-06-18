from pydantic import BaseModel, Field


class Finding(BaseModel):
    label: str
    confidence: float
    medical_interp: str | None = None
    is_actionable: bool = False


class XrayResponse(BaseModel):
    findings: list[Finding]
    normal: bool | None
    top_medical_finding: Finding | None = None
    chest_related_count: int = 0
    processing: str = ""
    error: str | None = None
