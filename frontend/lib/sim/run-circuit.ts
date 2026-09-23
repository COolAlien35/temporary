import type { BlochVector, Complex, SimResult, StudioGate } from "@/lib/studio/types"

/**
 * A small, self-contained TypeScript statevector simulator. Supports up to 5 qubits (32-dim
 * state), the full Circuit Studio gate set, a simplified depolarizing-noise model that mixes
 * the ideal distribution toward uniform, and independent-bit readout error applied at sampling
 * time. This is a teaching-tool simulator, not a physically exact noise channel.
 */

const add = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
const mul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
const scale = (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s })
const phase = (theta: number): Complex => ({ re: Math.cos(theta), im: Math.sin(theta) })
const conj = (a: Complex): Complex => ({ re: a.re, im: -a.im })

type Matrix2 = [[Complex, Complex], [Complex, Complex]]

const c = (re: number, im = 0): Complex => ({ re, im })

function singleQubitMatrix(gate: StudioGate): Matrix2 | null {
  const h = 1 / Math.sqrt(2)
  const t = gate.theta ?? Math.PI / 2
  switch (gate.type) {
    case "I":
      return [[c(1), c(0)], [c(0), c(1)]]
    case "H":
      return [[c(h), c(h)], [c(h), c(-h)]]
    case "X":
      return [[c(0), c(1)], [c(1), c(0)]]
    case "Y":
      return [[c(0), c(0, -1)], [c(0, 1), c(0)]]
    case "Z":
      return [[c(1), c(0)], [c(0), c(-1)]]
    case "S":
      return [[c(1), c(0)], [c(0), c(0, 1)]]
    case "SDG":
      return [[c(1), c(0)], [c(0), c(0, -1)]]
    case "T":
      return [[c(1), c(0)], [c(0), phase(Math.PI / 4)]]
    case "TDG":
      return [[c(1), c(0)], [c(0), phase(-Math.PI / 4)]]
    case "RX": {
      const cos = Math.cos(t / 2)
      const sin = Math.sin(t / 2)
      return [[c(cos), c(0, -sin)], [c(0, -sin), c(cos)]]
    }
    case "RY": {
      const cos = Math.cos(t / 2)
      const sin = Math.sin(t / 2)
      return [[c(cos), c(-sin)], [c(sin), c(cos)]]
    }
    case "RZ": {
      return [[phase(-t / 2), c(0)], [c(0), phase(t / 2)]]
    }
    default:
      return null
  }
}

function applySingle(state: Complex[], q: number, matrix: Matrix2) {
  const bit = 1 << q
  for (let i = 0; i < state.length; i++) {
    if ((i & bit) === 0) {
      const j = i | bit
      const a = state[i]
      const b = state[j]
      state[i] = add(mul(matrix[0][0], a), mul(matrix[0][1], b))
      state[j] = add(mul(matrix[1][0], a), mul(matrix[1][1], b))
    }
  }
}

function applyCNOT(state: Complex[], control: number, target: number) {
  const cBit = 1 << control
  const tBit = 1 << target
  for (let i = 0; i < state.length; i++) {
    if ((i & cBit) !== 0 && (i & tBit) === 0) {
      const j = i | tBit
      const tmp = state[i]
      state[i] = state[j]
      state[j] = tmp
    }
  }
}

function applyCZ(state: Complex[], control: number, target: number) {
  const cBit = 1 << control
  const tBit = 1 << target
  for (let i = 0; i < state.length; i++) {
    if ((i & cBit) !== 0 && (i & tBit) !== 0) state[i] = scale(state[i], -1)
  }
}

function applyCP(state: Complex[], control: number, target: number, theta: number) {
  const cBit = 1 << control
  const tBit = 1 << target
  const ph = phase(theta)
  for (let i = 0; i < state.length; i++) {
    if ((i & cBit) !== 0 && (i & tBit) !== 0) state[i] = mul(state[i], ph)
  }
}

function applySwap(state: Complex[], a: number, b: number) {
  const aBit = 1 << a
  const bBit = 1 << b
  for (let i = 0; i < state.length; i++) {
    const abit = (i & aBit) !== 0
    const bbit = (i & bBit) !== 0
    if (abit !== bbit) {
      const j = (i & ~aBit & ~bBit) | (abit ? bBit : 0) | (bbit ? aBit : 0)
      if (j > i) {
        const tmp = state[i]
        state[i] = state[j]
        state[j] = tmp
      }
    }
  }
}

function applyToffoli(state: Complex[], c1: number, c2: number, target: number) {
  const c1Bit = 1 << c1
  const c2Bit = 1 << c2
  const tBit = 1 << target
  for (let i = 0; i < state.length; i++) {
    if ((i & c1Bit) !== 0 && (i & c2Bit) !== 0 && (i & tBit) === 0) {
      const j = i | tBit
      const tmp = state[i]
      state[i] = state[j]
      state[j] = tmp
    }
  }
}

function applyGate(state: Complex[], gate: StudioGate) {
  if (gate.type === "MEASURE" || gate.type === "BARRIER") return
  const single = singleQubitMatrix(gate)
  if (single) return applySingle(state, gate.qubit, single)
  switch (gate.type) {
    case "CNOT":
      return applyCNOT(state, gate.qubit, gate.target ?? (gate.qubit === 0 ? 1 : 0))
    case "CZ":
      return applyCZ(state, gate.qubit, gate.target ?? (gate.qubit === 0 ? 1 : 0))
    case "SWAP":
      return applySwap(state, gate.qubit, gate.target ?? (gate.qubit === 0 ? 1 : 0))
    case "CP":
      return applyCP(state, gate.qubit, gate.target ?? (gate.qubit === 0 ? 1 : 0), gate.theta ?? Math.PI / 2)
    case "CCX":
      return applyToffoli(state, gate.qubit, gate.target ?? 1, gate.control2 ?? 2)
    default:
      return
  }
}

function toProbabilities(state: Complex[], qubits: number): Record<string, number> {
  const out: Record<string, number> = {}
  state.forEach((amp, i) => {
    out[i.toString(2).padStart(qubits, "0")] = amp.re * amp.re + amp.im * amp.im
  })
  return out
}

export function uniformDist(qubits: number): Record<string, number> {
  const dim = 1 << qubits
  const out: Record<string, number> = {}
  for (let i = 0; i < dim; i++) out[i.toString(2).padStart(qubits, "0")] = 1 / dim
  return out
}

function mixTowardUniform(ideal: Record<string, number>, uniform: Record<string, number>, weight: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of Object.keys(ideal)) out[key] = ideal[key] * (1 - weight) + uniform[key] * weight
  return out
}

/** Live preview of the depolarizing mix used by the Noise Lab sliders, without a full re-run. */
export function previewNoisyProbabilities(probabilities: Record<string, number>, depolarizing: number, gateWeightCount: number): Record<string, number> {
  if (depolarizing <= 0) return { ...probabilities }
  const qubits = Math.round(Math.log2(Object.keys(probabilities).length || 1))
  const uniform = uniformDist(Math.max(1, qubits))
  const weight = 1 - Math.pow(1 - depolarizing, Math.max(1, gateWeightCount))
  return mixTowardUniform(probabilities, uniform, weight)
}

export function classicalFidelity(p: Record<string, number>, q: Record<string, number>): number {
  let sum = 0
  for (const key of Object.keys(p)) sum += Math.sqrt(Math.max(0, p[key]) * Math.max(0, q[key] ?? 0))
  return Math.max(0, Math.min(1, sum * sum))
}

function sampleCounts(probabilities: Record<string, number>, shots: number, readoutError: number, qubits: number): Record<string, number> {
  const entries = Object.entries(probabilities)
  const counts: Record<string, number> = {}
  for (let shot = 0; shot < shots; shot++) {
    let r = Math.random()
    let key = entries[0]?.[0] ?? "0".repeat(qubits)
    for (const [k, p] of entries) {
      r -= p
      if (r <= 0) {
        key = k
        break
      }
    }
    if (readoutError > 0) {
      key = key
        .split("")
        .map((bit) => (Math.random() < readoutError ? (bit === "0" ? "1" : "0") : bit))
        .join("")
    }
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function computeBlochVectors(state: Complex[], qubits: number): BlochVector[] {
  const vectors: BlochVector[] = []
  for (let q = 0; q < qubits; q++) {
    const bit = 1 << q
    let rho00 = 0
    let rho11 = 0
    let rho01: Complex = { re: 0, im: 0 }
    for (let i = 0; i < state.length; i++) {
      if ((i & bit) === 0) {
        const j = i | bit
        rho00 += state[i].re * state[i].re + state[i].im * state[i].im
        rho11 += state[j].re * state[j].re + state[j].im * state[j].im
        rho01 = add(rho01, mul(state[i], conj(state[j])))
      }
    }
    const x = 2 * rho01.re
    const y = -2 * rho01.im
    const z = rho00 - rho11
    const length = Math.sqrt(x * x + y * y + z * z)
    vectors.push({ x, y, z, length, mixed: length < 0.98 })
  }
  return vectors
}

export interface RunCircuitOptions {
  shots?: number
  depolarizing?: number
  readoutError?: number
}

export function runCircuit(qubits: number, gates: StudioGate[], options: RunCircuitOptions = {}): SimResult {
  const { shots = 1024, depolarizing = 0, readoutError = 0 } = options
  const dim = 1 << qubits
  const state: Complex[] = Array.from({ length: dim }, (_, i) => ({ re: i === 0 ? 1 : 0, im: 0 }))

  const steps = Array.from(new Set(gates.map((g) => g.step))).sort((a, b) => a - b)
  const sorted = [...gates].sort((a, b) => a.step - b.step)
  const stepStates: Complex[][] = []

  for (const step of steps) {
    for (const gate of sorted.filter((g) => g.step === step)) applyGate(state, gate)
    stepStates.push(state.map((amp) => ({ ...amp })))
  }

  const probabilities = toProbabilities(state, qubits)
  const uniform = uniformDist(qubits)
  const gateWeightCount = gates.filter((g) => g.type !== "BARRIER" && g.type !== "MEASURE").length
  const depolTotal = 1 - Math.pow(1 - depolarizing, Math.max(1, gateWeightCount))
  const noisyProbabilities = depolarizing > 0 ? mixTowardUniform(probabilities, uniform, depolTotal) : { ...probabilities }
  const counts = sampleCounts(noisyProbabilities, shots, readoutError, qubits)
  const blochVectors = computeBlochVectors(state, qubits)
  const fidelity = classicalFidelity(probabilities, noisyProbabilities)

  return { statevector: state, probabilities, noisyProbabilities, counts, blochVectors, fidelity, stepStates, qubits, shots }
}
