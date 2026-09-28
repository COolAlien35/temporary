"""Versioned agreement metric for two ordered probability distributions."""

from collections.abc import Sequence
from math import fsum, isfinite
from typing import Literal

METRIC_VERSION: Literal["tvd-v1"] = "tvd-v1"
PROBABILITY_TOLERANCE = 1e-6
MAX_MEASURED_QUBITS = 8


def validate_vector(values: Sequence[float], expected_size: int) -> None:
    if len(values) != expected_size:
        raise ValueError("Probability vector does not match the basis size")
    if any(not isfinite(value) or value < 0 or value > 1 for value in values):
        raise ValueError("Probabilities must be finite values in [0, 1]")
    if abs(fsum(values) - 1) > PROBABILITY_TOLERANCE:
        raise ValueError("Probabilities must sum to 1 within 0.000001")


def prediction_agreement(predicted: Sequence[float], simulated: Sequence[float]) -> float:
    """Return 1 - total variation distance, without display rounding."""
    validate_vector(predicted, len(simulated))
    validate_vector(simulated, len(predicted))
    distance = 0.5 * fsum(abs(a - b) for a, b in zip(predicted, simulated, strict=True))
    return max(0.0, min(1.0, 1.0 - distance))
