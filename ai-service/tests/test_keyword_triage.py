import pytest
from app.triage.keyword_triage import keyword_triage


class TestKeywordTriage:
    def test_immediate_keywords(self):
        for kw in ["chest pain", "not breathing", "heart attack", "stroke", "no pulse"]:
            result = keyword_triage(f"Patient has {kw}")
            assert result["triage_level"] == "immediate", f"Failed for: {kw}"
            assert result["method"] == "keyword"
            assert result["matched_keyword"] == kw

    def test_urgent_keywords(self):
        for kw in ["high fever", "broken bone", "severe headache", "vomiting blood"]:
            result = keyword_triage(f"Complaint: {kw}")
            assert result["triage_level"] == "urgent", f"Failed for: {kw}"
            assert result["matched_keyword"] == kw

    def test_non_urgent_keywords(self):
        for kw in ["cold", "cough", "mild headache", "sore throat", "rash"]:
            result = keyword_triage(f"Patient reports {kw}")
            assert result["triage_level"] == "non-urgent", f"Failed for: {kw}"
            assert result["matched_keyword"] == kw

    def test_partial_word_no_match(self):
        result = keyword_triage("chest")
        assert result["triage_level"] == "unknown"
        assert result["matched_keyword"] is None

    def test_empty_string(self):
        result = keyword_triage("")
        assert result["triage_level"] == "unknown"

    def test_whitespace_only(self):
        result = keyword_triage("   ")
        assert result["triage_level"] == "unknown"

    def test_no_matching_keywords(self):
        result = keyword_triage("Patient has a stubbed toe")
        assert result["triage_level"] == "unknown"
        assert "No matching keywords" in result.get("reason", "")

    def test_case_insensitive(self):
        result = keyword_triage("CHEST PAIN and fever")
        assert result["triage_level"] == "immediate"

    def test_keyword_in_long_text(self):
        result = keyword_triage(
            "Patient is a 45-year-old male presenting with chest pain radiating to left arm"
        )
        assert result["triage_level"] == "immediate"
        assert result["matched_keyword"] == "chest pain"

    def test_highest_priority_wins(self):
        result = keyword_triage("cough and chest pain")
        assert result["triage_level"] == "immediate", "Immediate should win over non-urgent"

    def test_urgent_over_non_urgent(self):
        result = keyword_triage("cough and high fever")
        assert result["triage_level"] == "urgent", "Urgent should win over non-urgent"

    def test_first_keyword_matched_in_list(self):
        result = keyword_triage("runny nose and chest pain")
        assert result["matched_keyword"] == "chest pain"
