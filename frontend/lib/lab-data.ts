export type BasisState = "00" | "01" | "10" | "11"

export type GateType = "H" | "X" | "Y" | "Z" | "S" | "T" | "CNOT" | "CZ" | "SWAP" | "CP"

/** Number of time-step columns in the circuit grid, shared by the Build stage grid and the Code editor's parser. */
export const CIRCUIT_STEPS = 4

export interface GatePlacement {
  id: string
  step: number
  qubit: number
  gate: GateType
  /** target qubit index, only used for multi-qubit gates like CNOT */
  target?: number
}

export interface StageDef {
  id: number
  key: "learn" | "predict" | "build" | "run" | "observe" | "explain" | "debug" | "challenge" | "master"
  label: string
  description: string
}

export const STAGES: StageDef[] = [
  { id: 1, key: "learn", label: "Learn", description: "Fundamental grounding" },
  { id: 2, key: "predict", label: "Predict", description: "Commit a hypothesis" },
  { id: 3, key: "build", label: "Build", description: "Assemble the circuit" },
  { id: 4, key: "run", label: "Run", description: "Execute the simulation" },
  { id: 5, key: "observe", label: "Observe", description: "Compare outcomes" },
  { id: 6, key: "explain", label: "Explain", description: "Socratic debrief" },
  { id: 7, key: "debug", label: "Debug", description: "Isolate the fault" },
  { id: 8, key: "challenge", label: "Challenge", description: "Optimize the circuit" },
  { id: 9, key: "master", label: "Master", description: "Synthesis complete" },
]

export const XP_PER_STAGE: Record<number, number> = {
  1: 40,
  2: 80,
  3: 90,
  4: 60,
  5: 100,
  6: 70,
  7: 120,
  8: 150,
  9: 50,
}

export interface AlgorithmDef {
  slug: string
  name: string
  qubits: number
  basisStates: BasisState[]
  backendName: string
  statusColor: string
  learn: {
    calloutTitle: string
    equation: string
    body: string[]
  }
  correctDistribution: Record<BasisState, number>
  correctGates: GatePlacement[]
  seededFault: {
    gateId: string
    description: string
  }
  challenge: {
    difficulty: "EASY" | "MEDIUM" | "HARD"
    gateBudget: number
    iterationCap: number
    targetDistribution: Record<BasisState, number>
    tolerance: number
    goal: string
    hints: string[]
  }
}

export const ALGORITHMS: Record<string, AlgorithmDef> = {
  "deutsch-jozsa": {
    slug: "deutsch-jozsa",
    name: "Deutsch\u2013Jozsa",
    qubits: 2,
    basisStates: ["00", "01", "10", "11"],
    backendName: "QASM Simulator",
    statusColor: "bg-amber-400",
    learn: {
      calloutTitle: "The oracle problem",
      equation: "|\\psi\\rangle = H^{\\otimes n} \\, U_f \\, H^{\\otimes n} \\, |0\\rangle^{\\otimes n}",
      body: [
        "The Deutsch\u2013Jozsa algorithm decides, in a single query, whether a black-box function f is constant (returns the same value for every input) or balanced (returns 0 for exactly half of all inputs and 1 for the other half).",
        "A classical algorithm needs up to 2^(n-1) + 1 queries in the worst case. By placing the register into superposition with Hadamard gates before and after the oracle, interference cancels every amplitude except the one corresponding to the correct answer \u2014 collapsing the entire search into one measurement.",
        "For our 2-qubit register, a constant oracle leaves the system in |00\u27e9 with certainty. A balanced oracle guarantees the measurement never lands on |00\u27e9.",
      ],
    },
    correctDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 },
    correctGates: [
      { id: "g1", step: 0, qubit: 0, gate: "H" },
      { id: "g2", step: 0, qubit: 1, gate: "H" },
      { id: "g3", step: 1, qubit: 0, gate: "X" },
      { id: "g4", step: 2, qubit: 0, gate: "H" },
      { id: "g5", step: 2, qubit: 1, gate: "H" },
    ],
    seededFault: {
      gateId: "g3",
      description: "An extraneous Pauli-X gate was inserted on q[0] before the final Hadamard layer, biasing the oracle response.",
    },
    challenge: {
      difficulty: "MEDIUM",
      gateBudget: 6,
      iterationCap: 3,
      targetDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 },
      tolerance: 5,
      goal: "Reproduce the balanced-oracle signature |11\u27e9 with 100% confidence using no more than 6 gates.",
      hints: [
        "Superposition on both qubits before the oracle is non-negotiable \u2014 spend gates there first.",
        "The oracle for a balanced function can be realized with a single CNOT in this reduced model.",
        "Closing Hadamards undo the opening ones only where the oracle left no phase kick \u2014 that asymmetry is the signal.",
        "Every gate beyond the minimal 5 costs efficiency score, even if the distribution still matches.",
      ],
    },
  },
}

export function getAlgorithm(slug: string): AlgorithmDef {
  return ALGORITHMS[slug] ?? ALGORITHMS["deutsch-jozsa"]
}

export const GATE_COLORS: Record<GateType, string> = {
  H: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  X: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  Y: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  Z: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  S: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  T: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  CNOT: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  CZ: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  SWAP: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  CP: "bg-violet-500/15 text-violet-300 border-violet-500/40",
}

export const GATE_PALETTE: { gate: GateType; label: string }[] = [
  { gate: "H", label: "Hadamard" },
  { gate: "X", label: "Pauli X" },
  { gate: "Y", label: "Pauli Y" },
  { gate: "Z", label: "Pauli Z" },
  { gate: "S", label: "Phase S" },
  { gate: "T", label: "Phase T" },
  { gate: "CNOT", label: "Multi-qubit" },
]
