"""Wire schemas for predictions and completed, server-derived pairs."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

from app.modules.predictions.metric import (
    MAX_MEASURED_QUBITS,
    METRIC_VERSION,
    prediction_agreement,
    validate_vector,
)

ComparisonBasis = Literal["ideal_probability", "noisy_probability", "sampled_frequency"]


class LearningSessionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lesson_id: str = Field(min_length=1, max_length=120)
    lesson_version: int = Field(ge=1)


class LearningSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lesson_id: str
    lesson_version: int
    created_at: datetime


class LearningSessionPage(BaseModel):
    items: list[LearningSessionRead]
    next_cursor: UUID | None


class PredictionSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    lesson_id: str = Field(min_length=1, max_length=120)
    lesson_version: int = Field(ge=1)
    learning_session_id: UUID
    prediction_vector: list[FiniteFloat]
    basis_labels: list[str]
    measurement_qubits: list[int] = Field(min_length=1, max_length=MAX_MEASURED_QUBITS)
    comparison_basis: ComparisonBasis
    confidence: FiniteFloat | None = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def validate_distribution(self) -> "PredictionSubmission":
        count = len(self.measurement_qubits)
        if len(set(self.measurement_qubits)) != count or any(
            qubit < 0 or qubit >= MAX_MEASURED_QUBITS for qubit in self.measurement_qubits
        ):
            raise ValueError("Measurement qubits must be unique indexes from 0 to 7")
        expected_labels = {format(index, f"0{count}b") for index in range(1 << count)}
        if (
            len(self.basis_labels) != len(expected_labels)
            or set(self.basis_labels) != expected_labels
        ):
            raise ValueError("Basis labels must contain every measured bitstring exactly once")
        validate_vector(self.prediction_vector, len(expected_labels))
        return self


class PredictionRead(PredictionSubmission):
    id: UUID
    locked_at: datetime
    pairing_status: Literal["unpaired", "pending", "paired", "failed"] = "unpaired"
    run_id: UUID | None = None


class PredictionPage(BaseModel):
    items: list[PredictionRead]
    next_cursor: UUID | None


class PredictionPair(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: Literal[1]
    prediction_id: UUID
    run_id: UUID
    prediction_vector: list[FiniteFloat]
    simulated_vector: list[FiniteFloat]
    basis_labels: list[str]
    measurement_qubits: list[int]
    comparison_basis: ComparisonBasis
    metric_version: Literal["tvd-v1"] = METRIC_VERSION
    prediction_match: FiniteFloat = Field(ge=0, le=1)
    backend: str = Field(min_length=1, max_length=80)
    shots: int | None = Field(default=None, ge=1)
    seed: int | None = None
    circuit_revision: int = Field(ge=1)

    @model_validator(mode="after")
    def validate_pair(self) -> "PredictionPair":
        count = len(self.measurement_qubits)
        if not 1 <= count <= MAX_MEASURED_QUBITS:
            raise ValueError("Invalid measurement qubit count")
        if len(set(self.measurement_qubits)) != count or any(
            qubit < 0 or qubit >= MAX_MEASURED_QUBITS for qubit in self.measurement_qubits
        ):
            raise ValueError("Invalid measurement qubit mapping")
        expected_labels = {format(index, f"0{count}b") for index in range(1 << count)}
        if (
            len(self.basis_labels) != len(expected_labels)
            or set(self.basis_labels) != expected_labels
        ):
            raise ValueError("Invalid basis labels")
        expected = prediction_agreement(self.prediction_vector, self.simulated_vector)
        if abs(expected - self.prediction_match) > 1e-9:
            raise ValueError("Prediction match does not agree with the versioned metric")
        if self.comparison_basis == "sampled_frequency" and self.shots is None:
            raise ValueError("Sampled comparisons require a shot count")
        return self


class OutcomeDelta(BaseModel):
    basis_label: str
    predicted: FiniteFloat = Field(ge=0, le=1)
    simulated: FiniteFloat = Field(ge=0, le=1)
    delta: FiniteFloat = Field(ge=-1, le=1)


class AgreementHistoryItem(BaseModel):
    learning_session_id: UUID
    prediction_id: UUID
    run_id: UUID
    locked_at: datetime
    comparison_basis: ComparisonBasis
    metric_version: Literal["tvd-v1"] = METRIC_VERSION
    prediction_match: FiniteFloat = Field(ge=0, le=1)
    confidence: FiniteFloat | None = Field(default=None, ge=0, le=1)
    backend: str
    shots: int | None
    seed: int | None
    circuit_revision: int
    largest_deltas: list[OutcomeDelta] = Field(max_length=3)


class AgreementHistory(BaseModel):
    lesson_id: str
    lesson_version: int
    learning_session_id: UUID
    items: list[AgreementHistoryItem] = Field(max_length=5)
    scanned_count: int = Field(ge=0, le=25)
    older_records_not_scanned: bool
    unavailable_sources: list[Literal["missed_questions", "hints", "next_lessons"]]
