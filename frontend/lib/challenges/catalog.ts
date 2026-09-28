import type { StudioCircuit, StudioGateType } from "@/lib/studio/types"
import { runCircuit } from "@/lib/sim/run-circuit"

export type CircuitChallenge = {
  id: string
  type: "Circuit"
  title: string
  topic: string
  difficulty: "Beginner" | "Intermediate"
  description: string
  target: string
  hint: string
  qubits: number
  expected: Record<string, number>
  tolerance: number
  minGates: number
  maxGates: number
  requiredGates?: StudioGateType[]
  starter: StudioCircuit
}

export const challenges: CircuitChallenge[] = [
  {
    id: "balanced-qubit",
    type: "Circuit",
    title: "Make a balanced qubit",
    topic: "Superposition",
    difficulty: "Beginner",
    description: "Starting from |0⟩, create a state whose measurement outcomes are equally likely.",
    target: "P(0) = 0.5 and P(1) = 0.5",
    hint: "The Hadamard gate turns |0⟩ into an equal superposition.",
    qubits: 1,
    expected: { "0": 0.5, "1": 0.5 },
    tolerance: 0.03,
    minGates: 1,
    maxGates: 2,
    requiredGates: ["H"],
    starter: { name: "Balanced qubit", qubits: 1, gates: [] },
  },
  {
    id: "flip-the-bit",
    type: "Circuit",
    title: "Flip the measured bit",
    topic: "Quantum gates",
    difficulty: "Beginner",
    description: "Prepare a single qubit that is measured as 1 every time, using a short circuit.",
    target: "P(1) ≥ 0.98",
    hint: "The X gate swaps |0⟩ and |1⟩.",
    qubits: 1,
    expected: { "0": 0, "1": 1 },
    tolerance: 0.02,
    minGates: 1,
    maxGates: 2,
    requiredGates: ["X"],
    starter: { name: "Flip the bit", qubits: 1, gates: [] },
  },
  {
    id: "bell-pair",
    type: "Circuit",
    title: "Build a Bell pair",
    topic: "Entanglement",
    difficulty: "Intermediate",
    description: "Create two correlated qubits: only 00 and 11 should appear, with equal probability.",
    target: "P(00) = P(11) = 0.5; P(01) = P(10) = 0",
    hint: "Put q0 into superposition, then use it to control a CNOT targeting q1.",
    qubits: 2,
    expected: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
    tolerance: 0.04,
    minGates: 2,
    maxGates: 3,
    requiredGates: ["H", "CNOT"],
    starter: { name: "Bell pair", qubits: 2, gates: [] },
  },
]

export function gradeChallenge(challenge: CircuitChallenge, circuit: StudioCircuit) {
  const validQubits = circuit.qubits === challenge.qubits
  const validGateCount = circuit.gates.length >= challenge.minGates && circuit.gates.length <= challenge.maxGates
  const presentGates = new Set(circuit.gates.map((gate) => gate.type))
  const missingGates = (challenge.requiredGates ?? []).filter((gate) => !presentGates.has(gate))
  const result = runCircuit(circuit.qubits, circuit.gates, { shots: 1024 })
  const probabilities = result.probabilities
  const distance = Object.keys(challenge.expected).reduce((sum, outcome) => sum + Math.abs((probabilities[outcome] ?? 0) - challenge.expected[outcome]), 0) / 2
  const checks = [
    { pass: validQubits, text: validQubits ? `${challenge.qubits} qubit register` : `Use exactly ${challenge.qubits} qubit${challenge.qubits === 1 ? "" : "s"}` },
    { pass: validGateCount, text: validGateCount ? `Gate count within ${challenge.minGates}–${challenge.maxGates}` : `Use ${challenge.minGates}–${challenge.maxGates} gates` },
    { pass: missingGates.length === 0, text: missingGates.length ? `Add required gate${missingGates.length > 1 ? "s" : ""}: ${missingGates.join(", ")}` : "Required gates included" },
    { pass: distance <= challenge.tolerance, text: distance <= challenge.tolerance ? "Target measurement distribution reached" : `Distribution is ${Math.round(distance * 100)}% away from target (limit ${Math.round(challenge.tolerance * 100)}%)` },
  ]
  const passed = checks.every((check) => check.pass)
  const score = passed ? 100 : Math.min(69, Math.round(checks.filter((check) => check.pass).length / checks.length * 70))
  return { passed, score, checks, probabilities }
}
