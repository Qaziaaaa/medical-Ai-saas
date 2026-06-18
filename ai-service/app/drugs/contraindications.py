DRUG_ALLERGY_MAP = {
    "penicillin": {"allergens": ["penicillin", "amoxicillin", "ampicillin"], "severity": "contraindicated"},
    "amoxicillin": {"allergens": ["penicillin", "amoxicillin", "ampicillin"], "severity": "contraindicated"},
    "azithromycin": {"allergens": ["macrolide", "erythromycin", "azithromycin"], "severity": "caution"},
    "warfarin": {"allergens": ["warfarin", "coumadin"], "severity": "contraindicated"},
    "aspirin": {"allergens": ["aspirin", "nsaid", "salicylate"], "severity": "contraindicated"},
    "ibuprofen": {"allergens": ["nsaid", "ibuprofen", "aspirin"], "severity": "caution"},
    "naproxen": {"allergens": ["nsaid", "naproxen", "aspirin"], "severity": "caution"},
    "diclofenac": {"allergens": ["nsaid", "diclofenac", "aspirin"], "severity": "caution"},
    "codeine": {"allergens": ["opioid", "codeine", "morphine"], "severity": "caution"},
    "morphine": {"allergens": ["opioid", "morphine", "codeine"], "severity": "caution"},
    "sulfamethoxazole": {"allergens": ["sulfa", "sulfonamide", "sulfamethoxazole"], "severity": "contraindicated"},
    "hydrochlorothiazide": {"allergens": ["sulfa", "sulfonamide", "thiazide"], "severity": "caution"},
    "furosemide": {"allergens": ["sulfa", "sulfonamide"], "severity": "caution"},
    "metformin": {"allergens": ["metformin"], "severity": "contraindicated"},
    "clopidogrel": {"allergens": ["clopidogrel", "plavix"], "severity": "contraindicated"},
}

DRUG_DISEASE_CONTRAINDICATIONS = {
    "metformin": {
        "ckd": {"severity": "contraindicated", "details": "Risk of lactic acidosis in patients with eGFR < 30", "condition": "Chronic Kidney Disease (eGFR < 30)"},
        "chronic kidney disease": {"severity": "contraindicated", "details": "Risk of lactic acidosis in patients with eGFR < 30", "condition": "Chronic Kidney Disease (eGFR < 30)"},
        "renal failure": {"severity": "contraindicated", "details": "Risk of lactic acidosis", "condition": "Renal Failure"},
        "heart failure": {"severity": "caution", "details": "Increased risk of lactic acidosis in unstable HF", "condition": "Congestive Heart Failure"},
        "chf": {"severity": "caution", "details": "Increased risk of lactic acidosis in unstable HF", "condition": "Congestive Heart Failure"},
        "liver disease": {"severity": "caution", "details": "Avoid if severe hepatic impairment", "condition": "Liver Disease"},
    },
    "warfarin": {
        "liver disease": {"severity": "caution", "details": "Altered coagulation factor synthesis", "condition": "Liver Disease"},
        "bleeding disorder": {"severity": "contraindicated", "details": "Significantly increased bleeding risk", "condition": "Bleeding Disorder"},
        "hemophilia": {"severity": "contraindicated", "details": "Significantly increased bleeding risk", "condition": "Hemophilia"},
    },
    "aspirin": {
        "gerd": {"severity": "caution", "details": "May exacerbate gastric erosion", "condition": "GERD"},
        "acid reflux": {"severity": "caution", "details": "May exacerbate gastric erosion", "condition": "GERD"},
        "peptic ulcer": {"severity": "contraindicated", "details": "Increased risk of GI bleeding", "condition": "Peptic Ulcer Disease"},
        "bleeding disorder": {"severity": "contraindicated", "details": "Increased bleeding risk", "condition": "Bleeding Disorder"},
    },
    "ibuprofen": {
        "ckd": {"severity": "caution", "details": "NSAIDs can worsen renal function", "condition": "Chronic Kidney Disease"},
        "chronic kidney disease": {"severity": "caution", "details": "NSAIDs can worsen renal function", "condition": "Chronic Kidney Disease"},
        "gerd": {"severity": "caution", "details": "May exacerbate GERD symptoms", "condition": "GERD"},
        "acid reflux": {"severity": "caution", "details": "May exacerbate reflux symptoms", "condition": "GERD"},
        "peptic ulcer": {"severity": "contraindicated", "details": "Increased risk of GI bleeding", "condition": "Peptic Ulcer Disease"},
        "heart failure": {"severity": "caution", "details": "NSAIDs can worsen heart failure", "condition": "Heart Failure"},
        "asthma": {"severity": "caution", "details": "May exacerbate asthma in sensitive patients", "condition": "Asthma"},
    },
    "naproxen": {
        "ckd": {"severity": "caution", "details": "NSAIDs can worsen renal function", "condition": "Chronic Kidney Disease"},
        "chronic kidney disease": {"severity": "caution", "details": "NSAIDs can worsen renal function", "condition": "Chronic Kidney Disease"},
        "peptic ulcer": {"severity": "contraindicated", "details": "Increased risk of GI bleeding", "condition": "Peptic Ulcer Disease"},
        "heart failure": {"severity": "caution", "details": "NSAIDs can worsen heart failure", "condition": "Heart Failure"},
    },
    "diclofenac": {
        "ckd": {"severity": "caution", "details": "NSAIDs can worsen renal function", "condition": "Chronic Kidney Disease"},
        "chronic kidney disease": {"severity": "caution", "details": "NSAIDs can worsen renal function", "condition": "Chronic Kidney Disease"},
        "heart failure": {"severity": "caution", "details": "NSAIDs can worsen heart failure", "condition": "Heart Failure"},
        "peptic ulcer": {"severity": "contraindicated", "details": "Increased risk of GI bleeding", "condition": "Peptic Ulcer Disease"},
    },
    "lisinopril": {
        "ckd": {"severity": "caution", "details": "Monitor renal function closely", "condition": "Chronic Kidney Disease"},
        "chronic kidney disease": {"severity": "caution", "details": "Monitor renal function closely", "condition": "Chronic Kidney Disease"},
        "renal artery stenosis": {"severity": "contraindicated", "details": "Risk of acute renal failure", "condition": "Renal Artery Stenosis"},
        "pregnancy": {"severity": "contraindicated", "details": "Risk of fetal harm in second/third trimester", "condition": "Pregnancy"},
        "hyperkalemia": {"severity": "contraindicated", "details": "ACE inhibitors increase potassium", "condition": "Hyperkalemia"},
    },
    "metoprolol": {
        "asthma": {"severity": "caution", "details": "Beta-blockers may exacerbate asthma", "condition": "Asthma"},
        "copd": {"severity": "caution", "details": "Beta-blockers may worsen COPD symptoms", "condition": "COPD"},
        "bradycardia": {"severity": "contraindicated", "details": "Risk of excessive heart rate slowing", "condition": "Bradycardia"},
        "heart block": {"severity": "contraindicated", "details": "Risk of complete heart block", "condition": "Heart Block"},
    },
    "prednisone": {
        "diabetes": {"severity": "caution", "details": "Corticosteroids increase blood glucose", "condition": "Diabetes Mellitus"},
        "type 2 diabetes": {"severity": "caution", "details": "Corticosteroids increase blood glucose", "condition": "Diabetes Mellitus"},
        "osteoporosis": {"severity": "caution", "details": "Long-term use worsens bone density", "condition": "Osteoporosis"},
        "infection": {"severity": "caution", "details": "Immunosuppression may mask infection", "condition": "Active Infection"},
    },
    "digoxin": {
        "ckd": {"severity": "caution", "details": "Reduced clearance increases toxicity risk", "condition": "Chronic Kidney Disease"},
        "chronic kidney disease": {"severity": "caution", "details": "Reduced clearance increases toxicity risk", "condition": "Chronic Kidney Disease"},
        "hypokalemia": {"severity": "contraindicated", "details": "Hypokalemia increases digoxin toxicity", "condition": "Hypokalemia"},
    },
    "spironolactone": {
        "ckd": {"severity": "caution", "details": "Risk of hyperkalemia with reduced renal function", "condition": "Chronic Kidney Disease"},
        "chronic kidney disease": {"severity": "caution", "details": "Risk of hyperkalemia with reduced renal function", "condition": "Chronic Kidney Disease"},
        "hyperkalemia": {"severity": "contraindicated", "details": "Spironolactone increases potassium", "condition": "Hyperkalemia"},
    },
}

ALL_SEVERITY_ORDER = {"contraindicated": 0, "caution": 1}


def check_allergy_contraindications(medications: list[str], allergies: list[str]) -> list[dict]:
    if not medications or not allergies:
        return []

    results = []
    allergy_lower = [a.lower().strip() for a in allergies]

    for drug in medications:
        drug_key = drug.lower().strip()
        info = DRUG_ALLERGY_MAP.get(drug_key)
        if not info:
            continue

        for allergen in info["allergens"]:
            if any(allergen in a or a in allergen for a in allergy_lower):
                results.append({
                    "drug": drug,
                    "allergen": allergen,
                    "severity": info["severity"],
                    "type": "allergy",
                    "detail": f"Patient has recorded allergy to {allergen}",
                })
                break

    return results


def check_disease_contraindications(medications: list[str], conditions: list[str]) -> list[dict]:
    if not medications or not conditions:
        return []

    results = []
    condition_lower = [c.lower().strip() for c in conditions]

    for drug in medications:
        drug_key = drug.lower().strip()
        contraindications = DRUG_DISEASE_CONTRAINDICATIONS.get(drug_key, {})

        for condition in condition_lower:
            for contraindication_key, info in contraindications.items():
                if contraindication_key in condition or condition in contraindication_key:
                    results.append({
                        "drug": drug,
                        "condition": info["condition"],
                        "severity": info["severity"],
                        "type": "disease",
                        "detail": info["details"],
                    })
                    break

    return results


def check_all_contraindications(medications: list[str], allergies: list[str] | None = None, conditions: list[str] | None = None) -> dict:
    allergy_results = check_allergy_contraindications(medications, allergies or [])
    disease_results = check_disease_contraindications(medications, conditions or [])
    all_results = allergy_results + disease_results

    contraindicated = sum(1 for r in all_results if r["severity"] == "contraindicated")
    caution = sum(1 for r in all_results if r["severity"] == "caution")

    return {
        "contraindications": all_results,
        "total": len(all_results),
        "has_contraindication": len(all_results) > 0,
        "counts": {"contraindicated": contraindicated, "caution": caution},
    }
