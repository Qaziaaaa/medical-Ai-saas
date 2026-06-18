import logging

logger = logging.getLogger(__name__)


def unified_assessment(
    symptoms: str | None = None,
    age: int | None = None,
    gender: str | None = None,
    medical_conditions: list[str] | None = None,
    medications: list[str] | None = None,
    allergies: list[str] | None = None,
    visits_last_6mo: int = 0,
    conditions_count: int = 0,
    medication_count: int = 0,
    has_chronic: bool = False,
) -> dict:
    triage_result = _run_triage(symptoms, age)
    risk_result = _run_risk(age, gender, visits_last_6mo, conditions_count, medication_count, has_chronic)
    contraindications = _run_contraindications(medications, allergies, medical_conditions)
    summary, recommendations = _generate_summary(triage_result, risk_result, contraindications)

    return {
        "patient": {
            "age": age,
            "gender": gender,
            "conditions": medical_conditions or [],
            "medications": medications or [],
            "allergies": allergies or [],
        },
        "triage": triage_result,
        "risk": risk_result,
        "contraindications": contraindications,
        "summary": summary,
        "recommendations": recommendations,
    }


def _run_triage(symptoms: str | None, age: int | None) -> dict:
    if not symptoms:
        return {"triage_level": "unknown", "method": "none", "reason": "No symptoms provided"}
    try:
        from app.triage.keyword_triage import keyword_triage
        result = keyword_triage(symptoms)
        if result["triage_level"] != "unknown":
            result["method"] = "keyword"
            return result
    except Exception as e:
        logger.warning(f"Keyword triage failed: {e}")

    try:
        from app.triage.biobert_triage import biobert_triage
        result = biobert_triage(symptoms, age)
        if result["triage_level"] != "unknown":
            result["method"] = "biobert"
            return result
    except Exception as e:
        logger.warning(f"BioBERT triage failed: {e}")

    return {"triage_level": "unknown", "method": "none", "reason": "All triage methods unavailable"}


def _run_risk(age: int | None, gender: str | None, visits: int, conditions: int, medications: int, chronic: bool) -> dict:
    if age is None:
        return {"risk_level": "unknown", "risk_score": 0, "reason": "Age required for risk assessment"}
    try:
        from app.risk.predictor import predict_risk
        return predict_risk(age, gender, visits, conditions, medications, chronic)
    except Exception as e:
        logger.warning(f"Risk prediction failed: {e}")
        return {"risk_level": "unknown", "risk_score": 0, "reason": str(e)}


def _run_contraindications(medications: list[str] | None, allergies: list[str] | None, conditions: list[str] | None) -> dict:
    if not medications:
        return {"contraindications": [], "total": 0, "has_contraindication": False, "counts": {"contraindicated": 0, "caution": 0}}
    try:
        from app.drugs.contraindications import check_all_contraindications
        return check_all_contraindications(medications, allergies, conditions)
    except Exception as e:
        logger.warning(f"Contraindication check failed: {e}")
        return {"contraindications": [], "total": 0, "has_contraindication": False, "counts": {"contraindicated": 0, "caution": 0}}


def _generate_summary(triage: dict, risk: dict, contraindications: dict) -> tuple[str, list[str]]:
    parts = []
    recs = []

    triage_level = triage.get("triage_level", "unknown")
    if triage_level == "immediate":
        parts.append("Patient requires immediate emergency care.")
        recs.append("Refer to emergency department immediately")
    elif triage_level == "urgent":
        parts.append("Patient requires urgent medical attention.")
        recs.append("Schedule urgent appointment within 24 hours")
    elif triage_level == "non-urgent":
        parts.append("Patient condition appears non-urgent.")
        recs.append("Schedule routine follow-up")

    risk_level = risk.get("risk_level", "unknown")
    if risk_level == "high":
        parts.append("High overall health risk detected.")
        recs.append("Comprehensive care management recommended")
    elif risk_level == "moderate":
        parts.append("Moderate overall health risk detected.")
        recs.append("Preventive health screening recommended")

    if contraindications.get("has_contraindication"):
        counts = contraindications.get("counts", {})
        if counts.get("contraindicated", 0) > 0:
            parts.append(f"Found {counts['contraindicated']} contraindicated medication(s).")
            recs.append("Review and adjust contraindicated medications")
        if counts.get("caution", 0) > 0:
            parts.append(f"Found {counts['caution']} medication(s) requiring caution.")
            recs.append("Monitor patients with caution-flagged medications")

    if not parts:
        parts.append("No significant issues detected.")

    return " ".join(parts), recs
