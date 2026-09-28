from math import inf, nan
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.modules.predictions.metric import prediction_agreement
from app.modules.predictions.schemas import PredictionPair, PredictionSubmission


def submission(**overrides):
    payload = {
        "schema_version": 1,
        "lesson_id": "u1-quantum-foundations",
        "lesson_version": 1,
        "learning_session_id": str(uuid4()),
        "prediction_vector": [0.25, 0.75],
        "basis_labels": ["0", "1"],
        "measurement_qubits": [0],
        "comparison_basis": "sampled_frequency",
        "confidence": 0.8,
    }
    payload.update(overrides)
    return PredictionSubmission.model_validate(payload)


def test_prediction_contract_requires_ordered_complete_probability_distribution():
    prediction = submission()
    assert prediction.prediction_vector == [0.25, 0.75]
    assert prediction.basis_labels == ["0", "1"]
    assert prediction.confidence == 0.8

    for invalid in (
        {"prediction_vector": [25, 75]},
        {"prediction_vector": [0.2, 0.2]},
        {"prediction_vector": [nan, 1]},
        {"prediction_vector": [inf, 0]},
        {"prediction_vector": [-0.1, 1.1]},
        {"basis_labels": ["1", "1"]},
        {"basis_labels": ["0", "01"]},
        {"measurement_qubits": [0, 0]},
        {"measurement_qubits": [8]},
        {"simulated_vector": [0.25, 0.75]},
        {"confidence": 80},
    ):
        with pytest.raises(ValidationError):
            submission(**invalid)


def test_basis_order_is_explicit_and_validation_supports_two_qubits():
    prediction = submission(
        prediction_vector=[0.1, 0.2, 0.3, 0.4],
        basis_labels=["10", "00", "11", "01"],
        measurement_qubits=[2, 0],
    )
    assert prediction.basis_labels == ["10", "00", "11", "01"]
    with pytest.raises(ValidationError):
        submission(
            prediction_vector=[0.1, 0.2, 0.3, 0.4],
            basis_labels=["10", "00", "11", "11"],
            measurement_qubits=[2, 0],
        )


def test_tvd_agreement_matches_identical_disjoint_and_partial_distributions():
    assert prediction_agreement([1.0, 0.0], [1.0, 0.0]) == 1.0
    assert prediction_agreement([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert prediction_agreement([0.75, 0.25], [0.5, 0.5]) == 0.75
    with pytest.raises(ValueError):
        prediction_agreement([1.0, 0.0], [0.5, 0.25, 0.25])
    with pytest.raises(ValueError):
        prediction_agreement([nan, 0.0], [1.0, 0.0])


def test_completed_pair_rejects_fabricated_score_or_missing_sampling_metadata():
    payload = {
        "schema_version": 1,
        "prediction_id": str(uuid4()),
        "run_id": str(uuid4()),
        "prediction_vector": [0.75, 0.25],
        "simulated_vector": [0.5, 0.5],
        "basis_labels": ["0", "1"],
        "measurement_qubits": [0],
        "comparison_basis": "sampled_frequency",
        "metric_version": "tvd-v1",
        "prediction_match": 0.75,
        "backend": "qiskit-aer",
        "shots": 1024,
        "circuit_revision": 3,
    }
    assert PredictionPair.model_validate(payload).prediction_match == 0.75
    with pytest.raises(ValidationError):
        PredictionPair.model_validate({**payload, "prediction_match": 0.95})
    with pytest.raises(ValidationError):
        PredictionPair.model_validate({**payload, "shots": None})
    with pytest.raises(ValidationError):
        PredictionPair.model_validate({**payload, "basis_labels": ["1", "1"]})
