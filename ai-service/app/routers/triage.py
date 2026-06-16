import asyncio
from fastapi import APIRouter
from app.schemas.triage import TriageRequest, TriageResponse
from app.triage.keyword_triage import keyword_triage
from app.triage.biobert_triage import biobert_triage

router = APIRouter(prefix="/analyze", tags=["triage"])

SAFETY_KW = {
    "chest pain", "not breathing", "no pulse", "unconscious",
    "severe bleeding", "heart attack", "stroke",
}


def _needs_safety_override(symptoms: str) -> bool:
    s = symptoms.lower()
    return any(kw in s for kw in SAFETY_KW)


_LEVEL_RANK = {"immediate": 3, "urgent": 2, "non-urgent": 1, "unknown": 0}


def _higher_level(a: str, b: str) -> bool:
    return _LEVEL_RANK.get(a, 0) > _LEVEL_RANK.get(b, 0)


@router.post("/triage", response_model=TriageResponse)
async def triage_analysis(data: TriageRequest):
    kw = keyword_triage(data.symptoms)

    if _needs_safety_override(data.symptoms):
        return TriageResponse(
            triage_level=kw["triage_level"],
            method="keyword",
            confidence=0,
            matched_keyword=kw.get("matched_keyword"),
            reason="Safety override: dangerous symptom detected",
        )

    bio = await asyncio.to_thread(biobert_triage, data.symptoms, data.age)

    if kw["triage_level"] != "unknown":
        level = kw["triage_level"]
        method = "keyword"
        reason = f"Keyword match: {kw.get('matched_keyword')}"
        if _higher_level(kw["triage_level"], bio["triage_level"]):
            reason = f"Keyword was more specific (kw={kw['triage_level']}, bio={bio['triage_level']})"
        return TriageResponse(
            triage_level=level,
            method=method,
            confidence=bio["confidence"],
            all_scores=bio.get("all_scores"),
            matched_keyword=kw.get("matched_keyword"),
            reason=reason,
        )

    if bio["triage_level"] != "unknown" and bio["confidence"] >= 0.35:
        return TriageResponse(
            triage_level=bio["triage_level"],
            method="biobert",
            confidence=bio["confidence"],
            all_scores=bio.get("all_scores"),
            reason=f"BioBERT confidence: {bio['confidence']:.2f}",
        )

    return TriageResponse(
        triage_level="non-urgent",
        method="biobert",
        confidence=bio["confidence"],
        all_scores=bio.get("all_scores"),
        reason=f"Default: BioBERT confidence {bio['confidence']:.2f} below threshold",
    )
