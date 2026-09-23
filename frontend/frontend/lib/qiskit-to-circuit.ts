import type { GatePlacement, GateType } from "@/lib/lab-data"

const METHOD_TO_GATE: Record<string, GateType> = {
  h: "H",
  x: "X",
  y: "Y",
  z: "Z",
  s: "S",
  t: "T",
  cx: "CNOT",
}

const SINGLE_QUBIT_RE = /^qc\.(h|x|y|z|s|t)\(\s*(\d+)\s*\)\s*$/i
const CNOT_RE = /^qc\.cx\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i
const IGNORABLE_RE = /^(from\s|import\s|qc\s*=|qc\.measure|qc\.barrier|#)/i

export interface QiskitParseResult {
  gates: Omit<GatePlacement, "id">[]
  /** 1-indexed line numbers the parser couldn't map onto a gate. */
  unsupportedLines: number[]
}

/**
 * Parses a Qiskit-style snippet back into circuit-grid gate placements. This only recognizes
 * the small subset of calls `circuitToQiskit` emits (single-qubit gates and `cx`) — it is a
 * teaching-tool round-trip, not a Python/Qiskit parser, so anything else is reported as an
 * unsupported line rather than silently dropped.
 */
export function qiskitToCircuit(code: string, qubits: number, maxSteps: number): QiskitParseResult {
  const gates: Omit<GatePlacement, "id">[] = []
  const unsupportedLines: number[] = []

  // Each qubit wire fills in left-to-right: the Nth gate written for a given qubit lands in
  // time step N, mirroring how the visual grid reads.
  const nextStepForQubit: number[] = Array(qubits).fill(0)

  code.split("\n").forEach((raw, idx) => {
    const line = raw.trim()
    if (line === "" || IGNORABLE_RE.test(line)) return

    const singleMatch = line.match(SINGLE_QUBIT_RE)
    if (singleMatch) {
      const gate = METHOD_TO_GATE[singleMatch[1].toLowerCase()]
      const qubit = Number(singleMatch[2])
      if (qubit >= qubits) {
        unsupportedLines.push(idx + 1)
        return
      }
      const step = nextStepForQubit[qubit]
      if (step >= maxSteps) {
        unsupportedLines.push(idx + 1)
        return
      }
      gates.push({ step, qubit, gate })
      nextStepForQubit[qubit] = step + 1
      return
    }

    const cnotMatch = line.match(CNOT_RE)
    if (cnotMatch) {
      const control = Number(cnotMatch[1])
      const target = Number(cnotMatch[2])
      if (control >= qubits || target >= qubits || control === target) {
        unsupportedLines.push(idx + 1)
        return
      }
      const step = Math.max(nextStepForQubit[control], nextStepForQubit[target])
      if (step >= maxSteps) {
        unsupportedLines.push(idx + 1)
        return
      }
      gates.push({ step, qubit: control, gate: "CNOT", target })
      nextStepForQubit[control] = step + 1
      nextStepForQubit[target] = step + 1
      return
    }

    unsupportedLines.push(idx + 1)
  })

  return { gates, unsupportedLines }
}
