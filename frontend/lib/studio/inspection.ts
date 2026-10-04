import { computeBlochVectors } from "@/lib/sim/run-circuit"
import type { SimResult, StudioCircuit } from "./types"

export function circuitSignature(circuit: StudioCircuit): string {
  return JSON.stringify({ qubits: circuit.qubits, gates: [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit || a.id.localeCompare(b.id)) })
}

/** Step snapshots are ideal states; sampled counts always belong to the final run. */
export function inspectedResult(result: SimResult, stepIndex: number | null): SimResult {
  const statevector = stepIndex === null ? null : result.stepStates[stepIndex]
  if (!statevector) return result
  const probabilities = Object.fromEntries(statevector.map((amplitude, index) => [index.toString(2).padStart(result.qubits, "0"), amplitude.re ** 2 + amplitude.im ** 2]))
  return { ...result, statevector, probabilities, blochVectors: computeBlochVectors(statevector, result.qubits) }
}
