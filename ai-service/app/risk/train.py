import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "risk_model.json"


def _generate_synthetic_data(n=10000, seed=42):
    rng = np.random.default_rng(seed)

    ages = rng.integers(18, 95, n)
    genders = rng.integers(0, 2, n)
    visits = rng.poisson(2, n)
    conditions = rng.poisson(1.5, n)
    medications = rng.poisson(2, n)
    chronic = rng.binomial(1, 0.3, n)

    readmission_prob = (
        0.05
        + 0.3 * ((ages - 18) / 77)
        + 0.15 * (visits / 10)
        + 0.2 * (conditions / 5)
        + 0.1 * (medications / 5)
        + 0.2 * chronic
    )
    readmission_prob = np.clip(readmission_prob, 0, 1)

    readmitted = rng.binomial(1, readmission_prob)

    df = pd.DataFrame({
        "age": ages,
        "gender": genders,
        "visits_last_6mo": visits,
        "conditions_count": conditions,
        "medication_count": medications,
        "has_chronic_condition": chronic,
        "readmitted": readmitted,
    })
    return df


def train():
    logger.info("Generating synthetic patient data...")
    df = _generate_synthetic_data()

    X = df.drop("readmitted", axis=1)
    y = df["readmitted"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    logger.info("Training XGBoost model...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    logger.info(f"Model accuracy: {accuracy:.2%}")
    logger.info(f"Model AUC-ROC: {auc:.2%}")

    model.save_model(MODEL_PATH)
    logger.info(f"Model saved to {MODEL_PATH}")

    return {"accuracy": round(accuracy, 4), "auc": round(auc, 4)}


def load_model():
    if not MODEL_PATH.exists():
        logger.warning("No trained model found. Training now...")
        train()

    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
    return model
