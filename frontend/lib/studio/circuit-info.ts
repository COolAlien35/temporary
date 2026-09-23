import type { CircuitInfo, StudioGate } from "./types"

export function computeCircuitInfo(qubits: number, gates: StudioGate[]): CircuitInfo {
  const steps = new Set(gates.map((g) => g.step))
  const gateCountByType: Record<string, number> = {}
  for (const gate of gates) gateCountByType[gate.type] = (gateCountByType[gate.type] ?? 0) + 1
  const tCount = (gateCountByType.T ?? 0) + (gateCountByType.TDG ?? 0)
  return {
    depth: steps.size,
    qubits,
    gateCount: gates.length,
    gateCountByType,
    tCount,
  }
}
