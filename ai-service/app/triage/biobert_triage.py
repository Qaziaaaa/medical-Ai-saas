import logging
from transformers import pipeline, Pipeline

logger = logging.getLogger(__name__)

CANDIDATE_LABELS = ["immediate emergency", "urgent medical", "non-urgent", "no medical concern"]

_mapped_levels = {
    "immediate emergency": "immediate",
    "urgent medical": "urgent",
    "non-urgent": "non-urgent",
    "no medical concern": "non-urgent",
}

_classifier: Pipeline | None = None


def _get_classifier() -> Pipeline | None:
    global _classifier
    if _classifier is not None:
        return _classifier

    try:
        logger.info("Loading zero-shot classification model (typeform/distilbert-base-uncased-mnli)...")
        _classifier = pipeline(
            "zero-shot-classification",
            model="typeform/distilbert-base-uncased-mnli",
        )
        logger.info("Zero-shot model loaded successfully")
        return _classifier
    except Exception as e:
        logger.warning(f"Failed to load zero-shot model: {e}")
        return None


def biobert_triage(symptoms: str, age: int | None = None) -> dict:
    if not symptoms or not symptoms.strip():
        return {"triage_level": "unknown", "method": "biobert", "confidence": 0, "reason": "No symptoms provided"}

    classifier = _get_classifier()
    if classifier is None:
        return {"triage_level": "unknown", "method": "biobert", "confidence": 0, "reason": "Model not available"}

    try:
        text = symptoms
        if age is not None:
            text = f"Patient aged {age}. Symptoms: {symptoms}"

        result = classifier(text, CANDIDATE_LABELS, multi_label=False)

        top_label = result["labels"][0]
        top_score = result["scores"][0]

        return {
            "triage_level": _mapped_levels.get(top_label, "unknown"),
            "method": "biobert",
            "confidence": round(top_score, 4),
            "all_scores": {
                label: round(score, 4)
                for label, score in zip(result["labels"], result["scores"])
            },
        }
    except Exception as e:
        logger.error(f"BioBERT inference error: {e}")
        return {"triage_level": "unknown", "method": "biobert", "confidence": 0, "reason": str(e)}
