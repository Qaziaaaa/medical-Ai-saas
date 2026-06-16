import pandas as pd
from app.risk.train import load_model


def predict_risk(age: int, gender: str | None, visits: int, conditions: int, medications: int, chronic: bool) -> dict:
    model = load_model()

    gender_encoded = 0 if gender == "male" else 1

    features = pd.DataFrame([{
        "age": age,
        "gender": gender_encoded,
        "visits_last_6mo": visits,
        "conditions_count": conditions,
        "medication_count": medications,
        "has_chronic_condition": 1 if chronic else 0,
    }])

    probability = float(model.predict_proba(features)[0, 1])

    if probability > 0.7:
        level = "high"
    elif probability > 0.3:
        level = "moderate"
    else:
        level = "low"

    return {
        "risk_score": round(probability, 4),
        "risk_level": level,
        "contributing_factors": _get_factors(age, visits, conditions, chronic),
    }


def _get_factors(age: int, visits: int, conditions: int, chronic: bool) -> list[str]:
    factors = []
    if age > 65:
        factors.append("age over 65")
    if visits > 5:
        factors.append(f"frequent visits ({visits} in 6 months)")
    if conditions > 3:
        factors.append(f"multiple conditions ({conditions})")
    if chronic:
        factors.append("chronic condition")
    return factors
