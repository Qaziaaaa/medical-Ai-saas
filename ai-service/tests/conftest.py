import pytest
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_ml_deps():
    """Mock heavy ML dependencies so tests don't need torch/transformers."""
    with (
        patch("app.triage.biobert_triage._get_classifier", return_value=None),
        patch("app.xray.analyzer._load_model", return_value=(None, None)),
        patch("app.risk.train.load_model") as mock_model,
        patch("app.reports.generator._get_client", return_value=None),
    ):
        mock_model.return_value = None
        yield
