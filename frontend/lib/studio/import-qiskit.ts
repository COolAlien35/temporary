import { nanoid } from "nanoid"
import type { StudioGate, StudioGateType } from "./types"

const METHOD_TO_GATE: Record<string, StudioGateType> = {
  id: "I",
  h: "H",
  x: "X",
  y: "Y",
  z: "Z",
  s: "S",
  sdg: "SDG",
  t: "T",
  tdg: "TDG",
}

const SINGLE_RE = /^qc\.(id|h|x|y|z|s|sdg|t|tdg)\(\s*(\d+)\s*\)\s*$/i
const ANGLE_SINGLE_RE = /^qc\.(rx|ry|rz)\(\s*([^,]+),\s*(\d+)\s*\)\s*$/i
const TWO_QUBIT_RE = /^qc\.(cx|cz|swap)\(\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i
const CP_RE = /^qc\.cp\(\s*([^,]+),\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i
const CCX_RE = /^qc\.ccx\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*$/i
const BARRIER_RE = /^qc\.barrier\(\s*(\d+)\s*\)\s*$/i
const MEASURE_RE = /^qc\.measure\(\s*(\d+)\s*,\s*\d+\s*\)\s*$/i
const IGNORABLE_RE = /^(from\s|import\s|qc\s*=|qc\.measure_all|#|$)/i

function parseTheta(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === "pi") return Math.PI
  if (trimmed === "pi/2") return Math.PI / 2
  if (trimmed === "pi/4") return Math.PI / 4
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : Math.PI / 2
}

export interface QiskitParseResult {
  gates: StudioGate[]
  unsupportedLines: number[]
}

/**
 * Parses the Qiskit-style subset emitted by `exportQiskit`. Teaching-tool round trip, not a
 * general Python parser — unrecognized lines are reported rather than silently dropped.
 */
export function importQiskit(code: string, maxQubits = 5): QiskitParseResult {
  const gates: StudioGate[] = []
  const unsupportedLines: number[] = []
  const nextStepForQubit: number[] = Array(maxQubits).fill(0)
  const stepFor = (...qs: number[]) => Math.max(...qs.map((q) => nextStepForQubit[q] ?? 0))
  const advance = (step: number, ...qs: number[]) => qs.forEach((q) => (nextStepForQubit[q] = step + 1))

  code.split("\n").forEach((raw, idx) => {
    const line = raw.trim()
    if (line === "" || IGNORABLE_RE.test(line)) return

    let m = line.match(SINGLE_RE)
    if (m) {
      const qubit = Number(m[2])
      const step = stepFor(qubit)
      gates.push({ id: nanoid(8), type: METHOD_TO_GATE[m[1].toLowerCase()], step, qubit })
      advance(step, qubit)
      return
    }

    m = line.match(ANGLE_SINGLE_RE)
    if (m) {
      const qubit = Number(m[3])
      const step = stepFor(qubit)
      gates.push({ id: nanoid(8), type: m[1].toUpperCase() as StudioGateType, step, qubit, theta: parseTheta(m[2]) })
      advance(step, qubit)
      return
    }

    m = line.match(TWO_QUBIT_RE)
    if (m) {
      const a = Number(m[2])
      const b = Number(m[3])
      const step = stepFor(a, b)
      const type = m[1].toLowerCase() === "cx" ? "CNOT" : m[1].toLowerCase() === "cz" ? "CZ" : "SWAP"
      gates.push({ id: nanoid(8), type, step, qubit: a, target: b })
      advance(step, a, b)
      return
    }

    m = line.match(CP_RE)
    if (m) {
      const a = Number(m[2])
      const b = Number(m[3])
      const step = stepFor(a, b)
      gates.push({ id: nanoid(8), type: "CP", step, qubit: a, target: b, theta: parseTheta(m[1]) })
      advance(step, a, b)
      return
    }

    m = line.match(CCX_RE)
    if (m) {
      const a = Number(m[1])
      const b = Number(m[2])
      const t = Number(m[3])
      const step = stepFor(a, b, t)
      gates.push({ id: nanoid(8), type: "CCX", step, qubit: a, target: b, control2: t })
      advance(step, a, b, t)
      return
    }

    m = line.match(BARRIER_RE)
    if (m) {
      const qubit = Number(m[1])
      const step = stepFor(qubit)
      gates.push({ id: nanoid(8), type: "BARRIER", step, qubit })
      advance(step, qubit)
      return
    }

    m = line.match(MEASURE_RE)
    if (m) {
      const qubit = Number(m[1])
      const step = stepFor(qubit)
      gates.push({ id: nanoid(8), type: "MEASURE", step, qubit })
      advance(step, qubit)
      return
    }

    unsupportedLines.push(idx + 1)
  })

  return { gates, unsupportedLines }
}
