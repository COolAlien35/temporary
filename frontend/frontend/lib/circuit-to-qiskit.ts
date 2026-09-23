import type { GatePlacement, GateType } from "@/lib/lab-data"

const QISKIT_METHOD: Record<GateType, string> = {
  H: "h",
  X: "x",
  Y: "y",
  Z: "z",
  S: "s",
  T: "t",
  CNOT: "cx",
}

/**
 * Renders the placed gates as a readable Qiskit-style Python snippet. This is a one-way,
 * best-effort mirror of the visual circuit grid (not a real Qiskit runtime) — it exists so
 * the Code tab has something faithful to read and re-parse, not to execute real gate math.
 */
export function circuitToQiskit(gates: GatePlacement[], qubits: number): string {
  const lines: string[] = ["from qiskit import QuantumCircuit", "", `qc = QuantumCircuit(${qubits})`, ""]

  const sorted = [...gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit)

  if (sorted.length === 0) {
    lines.push(
      "# No gates placed yet. Build the circuit in the Circuit tab,",
      "# or write qc.<gate>(qubit) calls here and press Apply to Circuit.",
    )
  } else {
    let lastStep = sorted[0].step
    for (const g of sorted) {
      if (g.step !== lastStep) {
        lines.push("")
        lastStep = g.step
      }
      const method = QISKIT_METHOD[g.gate]
      if (g.gate === "CNOT") {
        const target = g.target ?? (g.qubit === 0 ? 1 : 0)
        lines.push(`qc.${method}(${g.qubit}, ${target})`)
      } else {
        lines.push(`qc.${method}(${g.qubit})`)
      }
    }
  }

  lines.push("", "qc.measure_all()")

  return lines.join("\n")
}
