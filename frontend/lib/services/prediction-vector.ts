/** Convert the current lab's 0–100 slider values to the wire's 0–1 vector. */
export function percentagesToPredictionVector(
  percentages: Record<string, number>,
  basisLabels: string[],
): number[] {
  if (basisLabels.length < 2 || new Set(basisLabels).size !== basisLabels.length) {
    throw new Error("Basis labels must be distinct and contain at least two outcomes")
  }
  if (Object.keys(percentages).length !== basisLabels.length ||
      basisLabels.some((label) => !Object.hasOwn(percentages, label))) {
    throw new Error("Prediction must include exactly the declared basis labels")
  }
  const values = basisLabels.map((label) => percentages[label])
  if (values.some((value) => value === undefined || !Number.isFinite(value) || value < 0 || value > 100)) {
    throw new Error("Prediction percentages must be finite values in [0, 100]")
  }
  const probabilities = values.map((value) => value / 100)
  if (Math.abs(probabilities.reduce((sum, value) => sum + value, 0) - 1) > 1e-6) {
    throw new Error("Prediction percentages must sum to 100")
  }
  return probabilities
}

export function percentConfidenceToUnit(confidence: number): number {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    throw new Error("Confidence must be a finite percentage in [0, 100]")
  }
  return confidence / 100
}
