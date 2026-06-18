import re

DISEASE_PATTERNS = [
    (re.compile(r"\b(hypertension|high blood pressure)\b", re.I), "DISEASE"),
    (re.compile(r"\b(diabetes|type [12] diabetes|dm)\b", re.I), "DISEASE"),
    (re.compile(r"\b(asthma|copd|chronic obstructive pulmonary)\b", re.I), "DISEASE"),
    (re.compile(r"\b(chf|congestive heart failure|heart failure)\b", re.I), "DISEASE"),
    (re.compile(r"\b(cad|coronary artery disease)\b", re.I), "DISEASE"),
    (re.compile(r"\b(afib|atrial fibrillation)\b", re.I), "DISEASE"),
    (re.compile(r"\b(ckd|chronic kidney disease|renal failure)\b", re.I), "DISEASE"),
    (re.compile(r"\b(o[aá]?d|osteoarthritis)\b", re.I), "DISEASE"),
    (re.compile(r"\b(ra|rheumatoid arthritis)\b", re.I), "DISEASE"),
    (re.compile(r"\b(depression|mdd|major depressive)\b", re.I), "DISEASE"),
    (re.compile(r"\b(anxiety|gad|generalized anxiety)\b", re.I), "DISEASE"),
    (re.compile(r"\b(hypothyroidism|hyperthyroidism)\b", re.I), "DISEASE"),
    (re.compile(r"\b(gerd|acid reflux|reflux)\b", re.I), "DISEASE"),
    (re.compile(r"\b(ibs|irritable bowel)\b", re.I), "DISEASE"),
    (re.compile(r"\b(cancer|malignancy|neoplasm)\b", re.I), "DISEASE"),
    (re.compile(r"\b(pneumonia)\b", re.I), "DISEASE"),
    (re.compile(r"\b(uti|urinary tract infection)\b", re.I), "DISEASE"),
    (re.compile(r"\b(pvd|peripheral vascular disease)\b", re.I), "DISEASE"),
    (re.compile(r"\b(dvt|deep vein thrombosis|pulmonary embolism|pe)\b", re.I), "DISEASE"),
    (re.compile(r"\b(hld|hyperlipidemia|high cholesterol)\b", re.I), "DISEASE"),
]

MEDICATION_PATTERNS = [
    (re.compile(r"\b(lisinopril|enalapril|ramipril)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(metformin|glucophage)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(warfarin|coumadin)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(aspirin|acetylsalicylic acid)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(atorvastatin|simvastatin|rosuvastatin)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(amlodipine|nifedipine)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(omeprazole|pantoprazole|esomeprazole)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(metoprolol|atenolol|propranolol)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(ibuprofen|naproxen|diclofenac)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(acetaminophen|paracetamol|tylenol)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(levothyroxine|synthroid)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(alprazolam|lorazepam|clonazepam)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(fluoxetine|sertraline|escitalopram|citalopram)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(furosemide|lasix)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(hydrochlorothiazide|hctz)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(prednisone|methylprednisolone)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(amoxicillin|penicillin|azithromycin)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(clopidogrel|plavix)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(digoxin|lanoxin)\b", re.I), "MEDICATION"),
    (re.compile(r"\b(spironolactone|aldactone)\b", re.I), "MEDICATION"),
]

DOSAGE_PATTERN = re.compile(r"(\d+)\s*(mg|mcg|mcg|g|ml|units?|tablets?|tabs?|caps?|puffs?)\b", re.I)

ALLERGY_PATTERNS = [
    (re.compile(r"\ballergic?\s*to\s+(\w+)", re.I), "ALLERGEN"),
    (re.compile(r"\b(sulfa|penicillin|latex|codeine|morphine)\s+allergy\b", re.I), "ALLERGEN"),
]

SYMPTOM_PATTERNS = [
    (re.compile(r"\b(headache|migraine)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(fever|pyrexia|chills)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(cough|coughing)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(nausea|vomiting|emesis)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(diarrhea|diarrhoea)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(fatigue|tired|lethargy)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(dizziness|vertigo|lightheaded)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(chest pain|chest tightness)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(shortness of breath|dyspnea|sob)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(edema|swelling)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(pain|aching|soreness)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(rash|hives|urticaria)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(insomnia|sleeplessness)\b", re.I), "SYMPTOM"),
    (re.compile(r"\b(weight loss|weight gain)\b", re.I), "SYMPTOM"),
]


def extract_with_regex(text: str) -> list[dict]:
    if not text or not text.strip():
        return []

    entities = []
    seen = set()

    for pattern, etype in DISEASE_PATTERNS + MEDICATION_PATTERNS + SYMPTOM_PATTERNS:
        for match in pattern.finditer(text):
            key = (match.group(0).lower().strip(), etype)
            if key not in seen:
                seen.add(key)
                entities.append({
                    "entity": match.group(0).strip(),
                    "type": etype,
                    "char_start": match.start(),
                    "char_end": match.end(),
                })

    for match in DOSAGE_PATTERN.finditer(text):
        key = (match.group(0).lower().strip(), "DOSAGE")
        if key not in seen:
            seen.add(key)
            entities.append({
                "entity": match.group(0).strip(),
                "type": "DOSAGE",
                "char_start": match.start(),
                "char_end": match.end(),
            })

    for pattern, etype in ALLERGY_PATTERNS:
        for match in pattern.finditer(text):
            value = match.group(1) if match.lastindex else match.group(0)
            key = (value.lower().strip(), etype)
            if key not in seen:
                seen.add(key)
                entities.append({
                    "entity": value.strip(),
                    "type": etype,
                    "char_start": match.start(),
                    "char_end": match.end(),
                })

    entities.sort(key=lambda e: e["char_start"])
    return entities
