import pytest
from app.drugs.checker import check_interaction, check_prescription


class TestCheckInteraction:
    def test_known_interaction_forward(self):
        result = check_interaction("warfarin", "aspirin")
        assert result is not None
        assert result["severity"] == "major"
        assert "bleeding" in result["effect"].lower()

    def test_known_interaction_reverse(self):
        result = check_interaction("aspirin", "warfarin")
        assert result is not None
        assert result["severity"] == "major"

    def test_no_interaction(self):
        result = check_interaction("warfarin", "acetaminophen")
        assert result is None

    def test_case_insensitive(self):
        r1 = check_interaction("WARFARIN", "Aspirin")
        r2 = check_interaction("warfarin", "aspirin")
        if r1 and r2:
            assert r1["severity"] == r2["severity"]

    def test_strip_whitespace(self):
        result = check_interaction("  warfarin  ", "  aspirin  ")
        assert result is not None

    def test_unknown_drug(self):
        result = check_interaction("warfarin", "nonexistent_drug_xyz")
        assert result is None

    def test_pair_in_result(self):
        result = check_interaction("warfarin", "aspirin")
        assert result["pair"] == ["warfarin", "aspirin"]

    def test_all_severity_levels(self):
        major = check_interaction("warfarin", "aspirin")
        assert major["severity"] == "major"

        moderate = check_interaction("aspirin", "ibuprofen")
        assert moderate["severity"] == "moderate"

        minor = check_interaction("ibuprofen", "metformin")
        assert minor["severity"] == "minor"


class TestCheckPrescription:
    def test_single_medication_no_interactions(self):
        result = check_prescription(["warfarin"])
        assert result["interactions"] == []
        assert result["total_pairs"] == 0
        assert result["has_interaction"] is False

    def test_empty_list(self):
        result = check_prescription([])
        assert result["interactions"] == []
        assert result["total_pairs"] == 0

    def test_two_drugs_with_interaction(self):
        result = check_prescription(["warfarin", "aspirin"])
        assert result["has_interaction"] is True
        assert len(result["interactions"]) == 1
        assert result["total_pairs"] == 1

    def test_multiple_drugs_no_duplicate_pairs(self):
        result = check_prescription(["warfarin", "aspirin", "ibuprofen"])
        assert result["has_interaction"] is True
        assert result["total_pairs"] == 3
        pairs_seen = set()
        for interaction in result["interactions"]:
            pair = tuple(sorted(interaction["pair"]))
            pairs_seen.add(pair)
        assert len(pairs_seen) == len(result["interactions"])

    def test_counts_by_severity(self):
        result = check_prescription(["warfarin", "aspirin", "lisinopril"])
        counts = result["counts"]
        assert isinstance(counts["major"], int)
        assert isinstance(counts["moderate"], int)
        assert isinstance(counts["minor"], int)

    def test_no_interaction_between_unrelated(self):
        result = check_prescription(["metformin", "lisinopril"])
        assert result["has_interaction"] is False
        assert result["interactions"] == []

    def test_case_insensitive_medication_names(self):
        r1 = check_prescription(["WARFARIN", "ASPIRIN"])
        r2 = check_prescription(["warfarin", "aspirin"])
        assert r1["has_interaction"] == r2["has_interaction"]
