import { nanoid } from "nanoid"
import type { StudioCircuit, StudioGate, StudioGateType } from "./types"

function g(type: StudioGateType, step: number, qubit: number, extra: Partial<StudioGate> = {}): StudioGate {
  return { id: nanoid(8), type, step, qubit, ...extra }
}

export interface Template {
  key: string
  name: string
  description: string
  qubits: number
  gates: StudioGate[]
  keywords: string[]
}

export const TEMPLATES: Template[] = [
  {
    key: "bell",
    name: "Bell state",
    description: "Maximally entangles two qubits: H then CNOT.",
    qubits: 2,
    gates: [g("H", 0, 0), g("CNOT", 1, 0, { target: 1 })],
    keywords: ["bell", "entangle", "epr"],
  },
  {
    key: "ghz",
    name: "GHZ (3 qubits)",
    description: "Extends the Bell pair into a 3-qubit maximally entangled state.",
    qubits: 3,
    gates: [g("H", 0, 0), g("CNOT", 1, 0, { target: 1 }), g("CNOT", 2, 1, { target: 2 })],
    keywords: ["ghz", "entangle", "three qubit"],
  },
  {
    key: "superposition",
    name: "Superposition",
    description: "Puts every qubit into an equal superposition with Hadamards.",
    qubits: 3,
    gates: [g("H", 0, 0), g("H", 0, 1), g("H", 0, 2)],
    keywords: ["superposition", "hadamard", "uniform"],
  },
  {
    key: "dj-constant",
    name: "Deutsch\u2013Jozsa (constant)",
    description: "Oracle that always returns 0 \u2014 the input register collapses to |0\u27e9.",
    qubits: 2,
    gates: [g("X", 0, 1), g("H", 1, 0), g("H", 1, 1), g("H", 2, 0), g("MEASURE", 3, 0)],
    keywords: ["deutsch", "jozsa", "constant", "oracle"],
  },
  {
    key: "dj-balanced",
    name: "Deutsch\u2013Jozsa (balanced)",
    description: "Oracle realized with a CNOT \u2014 the input register never collapses to |0\u27e9.",
    qubits: 2,
    gates: [g("X", 0, 1), g("H", 1, 0), g("H", 1, 1), g("CNOT", 2, 0, { target: 1 }), g("H", 3, 0), g("MEASURE", 4, 0)],
    keywords: ["deutsch", "jozsa", "balanced", "oracle"],
  },
  {
    key: "grover-2q",
    name: "Grover (2 qubits)",
    description: "One Grover iteration amplifying the |11\u27e9 marked state.",
    qubits: 2,
    gates: [
      g("H", 0, 0), g("H", 0, 1),
      g("CZ", 1, 0, { target: 1 }),
      g("H", 2, 0), g("H", 2, 1),
      g("X", 3, 0), g("X", 3, 1),
      g("CZ", 4, 0, { target: 1 }),
      g("X", 5, 0), g("X", 5, 1),
      g("H", 6, 0), g("H", 6, 1),
    ],
    keywords: ["grover", "search", "amplitude amplification"],
  },
  {
    key: "qft-3q",
    name: "QFT (3 qubits)",
    description: "Quantum Fourier transform turning periodic structure into phase.",
    qubits: 3,
    gates: [
      g("H", 0, 0),
      g("CP", 1, 1, { target: 0, theta: Math.PI / 2 }),
      g("CP", 2, 2, { target: 0, theta: Math.PI / 4 }),
      g("H", 3, 1),
      g("CP", 4, 2, { target: 1, theta: Math.PI / 2 }),
      g("H", 5, 2),
      g("SWAP", 6, 0, { target: 2 }),
    ],
    keywords: ["qft", "fourier", "phase"],
  },
  {
    key: "teleportation",
    name: "Teleportation",
    description: "Textbook teleportation demo: entangle, Bell-measure, and correct the receiver.",
    qubits: 3,
    gates: [
      g("H", 0, 1),
      g("CNOT", 1, 1, { target: 2 }),
      g("CNOT", 2, 0, { target: 1 }),
      g("H", 3, 0),
      g("CNOT", 4, 1, { target: 2 }),
      g("CZ", 5, 0, { target: 2 }),
      g("MEASURE", 6, 0),
      g("MEASURE", 6, 1),
      g("MEASURE", 7, 2),
    ],
    keywords: ["teleportation", "teleport", "bell measurement"],
  },
  {
    key: "qrng",
    name: "Quantum random number",
    description: "A single Hadamard and measurement \u2014 a true-random coin flip.",
    qubits: 1,
    gates: [g("H", 0, 0), g("MEASURE", 1, 0)],
    keywords: ["random", "rng", "coin flip"],
  },
]

export function getTemplate(key: string): Template | undefined {
  return TEMPLATES.find((t) => t.key === key)
}

export function matchTemplateByPrompt(prompt: string): Template | undefined {
  const lower = prompt.toLowerCase()
  return TEMPLATES.find((t) => t.keywords.some((k) => lower.includes(k)))
}

export function instantiateTemplate(template: Template): StudioCircuit {
  return { name: template.name, qubits: template.qubits, gates: template.gates.map((gate) => ({ ...gate, id: nanoid(8) })) }
}
