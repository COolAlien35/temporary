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

const SINGLE_RE = /^(id|h|x|y|z|s|sdg|t|tdg)\s+q\[(\d+)\]\s*;$/i
const ANGLE_SINGLE_RE = /^(rx|ry|rz)\(([^)]+)\)\s+q\[(\d+)\]\s*;$/i
const TWO_QUBIT_RE = /^(cx|cz|swap)\s+q\[(\d+)\]\s*,\s*q\[(\d+)\]\s*;$/i
const CP_RE = /^cp\(([^)]+)\)\s+q\[(\d+)\]\s*,\s*q\[(\d+)\]\s*;$/i
const CCX_RE = /^ccx\s+q\[(\d+)\]\s*,\s*q\[(\d+)\]\s*,\s*q\[(\d+)\]\s*;$/i
const BARRIER_RE = /^barrier\s+q\[(\d+)\]\s*;$/i
const MEASURE_RE = /^measure\s+q\[(\d+)\]\s*->\s*c\[(\d+)\]\s*;$/i
const IGNORABLE_RE = /^(OPENQASM|include|qreg|creg|\/\/|$)/i

function parseTheta(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === "pi") return Math.PI
  if (trimmed === "pi/2") return Math.PI / 2
  if (trimmed === "pi/4") return Math.PI / 4
  if (trimmed === "-pi/2") return -Math.PI / 2
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : Math.PI / 2
}

export interface QasmParseResult {
  gates: StudioGate[]
  qubits: number
  unsupportedLines: number[]
}

/**
 * Parses the subset of OpenQASM 2.0 emitted by `exportQasm`. This is a teaching-tool round
 * trip, not a general QASM parser — unrecognized lines are reported rather than dropped.
 */
export function importQasm(code: string, maxQubits = 5): QasmParseResult {
  const gates: StudioGate[] = []
  const unsupportedLines: number[] = []
  const nextStepForQubit: number[] = Array(maxQubits).fill(0)
  let qubits = 2

  const qregMatch = code.match(/qreg\s+q\[(\d+)\]/)
  if (qregMatch) qubits = Math.min(maxQubits, Math.max(1, Number(qregMatch[1])))

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

  return { gates, qubits, unsupportedLines }
}
