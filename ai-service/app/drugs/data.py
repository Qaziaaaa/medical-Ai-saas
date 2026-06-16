DRUG_INTERACTIONS = {
    "warfarin": {
        "aspirin": {"severity": "major", "effect": "Increased bleeding risk", "recommendation": "Monitor INR closely, avoid concurrent use"},
        "ibuprofen": {"severity": "major", "effect": "Increased bleeding risk", "recommendation": "Use acetaminophen instead"},
        "naproxen": {"severity": "major", "effect": "Increased bleeding risk", "recommendation": "Use acetaminophen instead"},
        "diclofenac": {"severity": "major", "effect": "Increased bleeding risk", "recommendation": "Avoid NSAIDs, monitor INR"},
        "clopidogrel": {"severity": "major", "effect": "Significantly increased bleeding risk", "recommendation": "Avoid combination unless essential"},
        "fluconazole": {"severity": "major", "effect": "Enhanced anticoagulant effect", "recommendation": "Reduce warfarin dose, monitor INR"},
        "metronidazole": {"severity": "major", "effect": "Enhanced anticoagulant effect", "recommendation": "Reduce warfarin dose, monitor INR"},
        "amiodarone": {"severity": "major", "effect": "Enhanced anticoagulant effect", "recommendation": "Reduce warfarin dose by 25-50%"},
        "simvastatin": {"severity": "moderate", "effect": "Increased anticoagulant effect", "recommendation": "Monitor INR more frequently"},
    },
    "aspirin": {
        "warfarin": {"severity": "major", "effect": "Increased bleeding risk", "recommendation": "Monitor INR closely, avoid concurrent use"},
        "ibuprofen": {"severity": "moderate", "effect": "Increased GI bleeding risk", "recommendation": "Use with caution, add GI protection"},
        "naproxen": {"severity": "moderate", "effect": "Increased GI bleeding risk", "recommendation": "Use with caution, add GI protection"},
        "clopidogrel": {"severity": "major", "effect": "Significantly increased bleeding risk", "recommendation": "Only use if prescribed by cardiologist"},
        "methotrexate": {"severity": "major", "effect": "Increased methotrexate toxicity", "recommendation": "Avoid concurrent use"},
    },
    "ibuprofen": {
        "warfarin": {"severity": "major", "effect": "Increased bleeding risk", "recommendation": "Use acetaminophen instead"},
        "aspirin": {"severity": "moderate", "effect": "Increased GI bleeding risk", "recommendation": "Use with caution"},
        "lisinopril": {"severity": "moderate", "effect": "Reduced antihypertensive effect", "recommendation": "Monitor blood pressure"},
        "metformin": {"severity": "minor", "effect": "No significant interaction", "recommendation": "No action needed"},
    },
    "lisinopril": {
        "ibuprofen": {"severity": "moderate", "effect": "Reduced antihypertensive effect, increased renal risk", "recommendation": "Monitor BP and renal function"},
        "naproxen": {"severity": "moderate", "effect": "Reduced antihypertensive effect, increased renal risk", "recommendation": "Monitor BP and renal function"},
        "spironolactone": {"severity": "major", "effect": "Dangerously high potassium levels", "recommendation": "Monitor potassium closely, consider alternative"},
        "potassium": {"severity": "major", "effect": "Hyperkalemia risk", "recommendation": "Avoid potassium supplements"},
        "metformin": {"severity": "minor", "effect": "No significant interaction", "recommendation": "No action needed"},
    },
    "metformin": {
        "ibuprofen": {"severity": "minor", "effect": "No significant interaction", "recommendation": "No action needed"},
        "lisinopril": {"severity": "minor", "effect": "No significant interaction", "recommendation": "No action needed"},
        "prednisone": {"severity": "moderate", "effect": "Reduced hypoglycemic effect", "recommendation": "Monitor blood glucose, adjust metformin dose"},
    },
    "simvastatin": {
        "warfarin": {"severity": "moderate", "effect": "Increased anticoagulant effect", "recommendation": "Monitor INR"},
        "amiodarone": {"severity": "major", "effect": "Increased risk of myopathy/rhabdomyolysis", "recommendation": "Limit simvastatin to 20mg daily"},
        "fluconazole": {"severity": "major", "effect": "Increased risk of myopathy", "recommendation": "Avoid simvastatin during azole therapy"},
        "clarithromycin": {"severity": "major", "effect": "Increased risk of rhabdomyolysis", "recommendation": "Temporarily stop simvastatin during course"},
    },
    "amiodarone": {
        "warfarin": {"severity": "major", "effect": "Enhanced anticoagulant effect", "recommendation": "Reduce warfarin dose"},
        "simvastatin": {"severity": "major", "effect": "Increased risk of myopathy", "recommendation": "Limit simvastatin to 20mg daily"},
        "digoxin": {"severity": "major", "effect": "Increased digoxin toxicity", "recommendation": "Reduce digoxin dose by 50%"},
    },
    "fluconazole": {
        "warfarin": {"severity": "major", "effect": "Enhanced anticoagulant effect", "recommendation": "Reduce warfarin dose"},
        "simvastatin": {"severity": "major", "effect": "Increased risk of myopathy", "recommendation": "Avoid simvastatin during azole therapy"},
    },
    "prednisone": {
        "metformin": {"severity": "moderate", "effect": "Reduced hypoglycemic effect", "recommendation": "Monitor blood glucose"},
        "ibuprofen": {"severity": "moderate", "effect": "Increased GI bleeding risk", "recommendation": "Use with caution, add GI protection"},
        "naproxen": {"severity": "moderate", "effect": "Increased GI bleeding risk", "recommendation": "Use with caution"},
    },
    "clopidogrel": {
        "warfarin": {"severity": "major", "effect": "Significantly increased bleeding risk", "recommendation": "Avoid combination unless essential"},
        "aspirin": {"severity": "major", "effect": "Significantly increased bleeding risk", "recommendation": "Only use if prescribed by cardiologist"},
    },
    "digoxin": {
        "amiodarone": {"severity": "major", "effect": "Increased digoxin toxicity", "recommendation": "Reduce digoxin dose by 50%"},
    },
    "spironolactone": {
        "lisinopril": {"severity": "major", "effect": "Dangerously high potassium levels", "recommendation": "Monitor potassium closely"},
    },
    "clarithromycin": {
        "simvastatin": {"severity": "major", "effect": "Increased risk of rhabdomyolysis", "recommendation": "Temporarily stop simvastatin during course"},
    },
    "metronidazole": {
        "warfarin": {"severity": "major", "effect": "Enhanced anticoagulant effect", "recommendation": "Reduce warfarin dose, monitor INR"},
    },
}
