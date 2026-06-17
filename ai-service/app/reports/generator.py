import logging
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)

_client = None

SOAP_PROMPT = """You are a medical report assistant. Convert the following doctor notes into a structured SOAP report.

Patient: {patient_name}, Age: {age}, Gender: {gender}

Doctor's Notes:
{notes}

Return a structured report in this exact format:

## Subjective
[Patient's reported symptoms and complaints in their own words, organized by system]

## Objective
[Vital signs, physical examination findings, and observable data]

## Assessment
[Diagnosis or differential diagnoses with brief reasoning]

## Plan
[Treatment plan including medications, follow-up, patient education, and referrals]

Be professional, concise, and medically accurate. If information is missing for a section, write "Not documented"."""


def _get_client() -> Groq | None:
    global _client
    if _client is not None:
        return _client

    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.warning("GROQ_API_KEY not set")
        return None

    try:
        _client = Groq(api_key=api_key)
        logger.info("GROQ client initialized")
        return _client
    except Exception as e:
        logger.error(f"Failed to init GROQ client: {e}")
        return None


def generate_soap_report(
    notes: str,
    patient_name: str = "Unknown",
    age: int | None = None,
    gender: str | None = None,
) -> dict:
    client = _get_client()
    if client is None:
        return {"report": None, "error": "GROQ service not available"}

    prompt = SOAP_PROMPT.format(
        patient_name=patient_name,
        age=age or "Unknown",
        gender=gender or "Unknown",
        notes=notes,
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
        )
        report = response.choices[0].message.content
        return {"report": report, "model": "llama-3.3-70b-versatile"}
    except Exception as e:
        logger.error(f"GROQ report generation error: {e}")
        return {"report": None, "error": str(e)}
