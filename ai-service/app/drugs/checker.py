from app.drugs.data import DRUG_INTERACTIONS


def check_interaction(drug_a: str, drug_b: str) -> dict | None:
    a = drug_a.lower().strip()
    b = drug_b.lower().strip()

    if a in DRUG_INTERACTIONS and b in DRUG_INTERACTIONS[a]:
        return DRUG_INTERACTIONS[a][b] | {"pair": [drug_a, drug_b]}

    if b in DRUG_INTERACTIONS and a in DRUG_INTERACTIONS[b]:
        return DRUG_INTERACTIONS[b][a] | {"pair": [drug_a, drug_b]}

    return None


def check_prescription(medications: list[str]) -> dict:
    if not medications or len(medications) < 2:
        return {"interactions": [], "total_pairs": 0, "has_interaction": False}

    all_interactions = []
    checked = set()

    for i in range(len(medications)):
        for j in range(i + 1, len(medications)):
            pair_key = f"{medications[i].lower().strip()}|{medications[j].lower().strip()}"
            if pair_key in checked:
                continue
            checked.add(pair_key)

            result = check_interaction(medications[i], medications[j])
            if result:
                all_interactions.append(result)

    major = sum(1 for i in all_interactions if i.get("severity") == "major")
    moderate = sum(1 for i in all_interactions if i.get("severity") == "moderate")
    minor = sum(1 for i in all_interactions if i.get("severity") == "minor")

    return {
        "interactions": all_interactions,
        "total_pairs": len(checked),
        "has_interaction": len(all_interactions) > 0,
        "counts": {"major": major, "moderate": moderate, "minor": minor},
    }
