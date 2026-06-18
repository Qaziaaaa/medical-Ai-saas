import logging

logger = logging.getLogger(__name__)

_NER_PIPELINE = None


def _get_ner_pipeline():
    global _NER_PIPELINE
    if _NER_PIPELINE is not None:
        return _NER_PIPELINE
    try:
        from transformers import pipeline as hf_pipeline

        logger.info("Loading BioBERT NER pipeline (brad1141/biobert-finetuned-ner)...")
        _NER_PIPELINE = hf_pipeline(
            "token-classification",
            model="brad1141/biobert-finetuned-ner",
            aggregation_strategy="simple",
        )
        logger.info("BioBERT NER pipeline loaded successfully")
        return _NER_PIPELINE
    except Exception as e:
        logger.warning(f"Failed to load BioBERT NER: {e}")
        return None


def extract_entities(text: str) -> dict:
    if not text or not text.strip():
        return {"entities": [], "error": None}

    ner = _get_ner_pipeline()
    all_entities = []

    if ner:
        try:
            results = ner(text)
            for r in results:
                all_entities.append({
                    "entity": r["word"],
                    "type": _map_biobert_label(r["entity_group"]),
                    "confidence": round(r["score"], 4),
                    "char_start": r["start"],
                    "char_end": r["end"],
                })
        except Exception as e:
            logger.error(f"BioBERT NER error: {e}")

    if not all_entities:
        from app.ner.patterns import extract_with_regex
        all_entities = extract_with_regex(text)

    return {
        "entities": all_entities,
        "total": len(all_entities),
        "method": "biobert_ner" if ner and all_entities else "regex_fallback",
    }


def _map_biobert_label(label: str) -> str:
    mapping = {
        "DISEASE": "DISEASE",
        "DIS": "DISEASE",
        "CONDITION": "DISEASE",
        "SYMPTOM": "SYMPTOM",
        "SYMP": "SYMPTOM",
        "MEDICATION": "MEDICATION",
        "DRUG": "MEDICATION",
        "CHEMICAL": "MEDICATION",
        "DOSAGE": "DOSAGE",
        "STRENGTH": "DOSAGE",
        "ALLERGEN": "ALLERGEN",
        "ALLERGY": "ALLERGEN",
    }
    return mapping.get(label.upper(), label)
