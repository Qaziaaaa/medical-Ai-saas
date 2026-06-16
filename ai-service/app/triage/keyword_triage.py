RISK_KEYWORDS = {
    "immediate": [
        "chest pain", "difficulty breathing", "not breathing",
        "unconscious", "severe bleeding", "heart attack",
        "stroke", "no pulse", "not responsive", "choking",
    ],
    "urgent": [
        "high fever", "broken bone", "severe headache",
        "deep cut", "burn", "vomiting blood", "blood in stool",
        "severe burn", "difficulty speaking", "numbness on one side",
        "blurred vision", "confusion", "fever",
    ],
    "non-urgent": [
        "cold", "cough", "mild headache", "rash",
        "sore throat", "stomach ache", "runny nose",
        "mild fever", "earache", "itchy",
    ],
}


def keyword_triage(symptoms: str) -> dict:
    if not symptoms or not symptoms.strip():
        return {"triage_level": "unknown", "method": "keyword", "reason": "No symptoms provided"}

    symptoms_lower = symptoms.lower()

    for level, keywords in RISK_KEYWORDS.items():
        for keyword in keywords:
            if keyword in symptoms_lower:
                return {
                    "triage_level": level,
                    "method": "keyword",
                    "matched_keyword": keyword,
                }

    return {"triage_level": "unknown", "method": "keyword", "reason": "No matching keywords"}
