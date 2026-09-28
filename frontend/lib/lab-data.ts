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
  timesteps?: number
  basisStates: BasisState[]
  backendName: string
  statusColor: string
  learn: {
    calloutTitle: string
    equation: string
    body: string[]
    steps?: string[]
  }
  correctDistribution: Record<BasisState, number>
  correctGates: GatePlacement[]
  debugCircuit?: GatePlacement[]
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
  superposition: {
    slug: "superposition", name: "Superposition", qubits: 2, basisStates: ["00", "01", "10", "11"], backendName: "Local State-Vector Simulator", statusColor: "bg-cyan-400",
    learn: { calloutTitle: "One gate, two possible outcomes", equation: "H|0⟩ = (|0⟩ + |1⟩)/√2", body: ["A Hadamard gate transforms |0⟩ into an equal superposition of |0⟩ and |1⟩. When measured, either outcome appears with probability one half.", "In this two-qubit lab, the second qubit is left untouched. The circuit result should therefore contain 00 and 01, while q1 stays at zero."], steps: ["Set both qubits to |0⟩", "Apply H to q0", "Run repeated measurements", "Check that q1 remains zero"] },
    correctDistribution: { "00": 50, "01": 50, "10": 0, "11": 0 }, correctGates: [{ id: "h-q0", step: 0, qubit: 0, gate: "H" }], debugCircuit: [{ id: "h-q0", step: 0, qubit: 0, gate: "H" }, { id: "fault", step: 1, qubit: 1, gate: "X" }],
    seededFault: { gateId: "fault", description: "An X gate was added to q1, which should remain untouched in this single-qubit superposition experiment." },
    challenge: { difficulty: "EASY", gateBudget: 3, iterationCap: 1, targetDistribution: { "00": 50, "01": 50, "10": 0, "11": 0 }, tolerance: 3, goal: "Create an equal superposition on q0 while keeping q1 at zero, using at most 3 gates.", hints: ["Use a Hadamard gate on q0.", "Leave q1 unchanged."] },
  },
  gates: {
    slug: "gates", name: "Gate Toolkit", qubits: 2, basisStates: ["00", "01", "10", "11"], backendName: "Local State-Vector Simulator", statusColor: "bg-cyan-400",
    learn: { calloutTitle: "Reversible transformations", equation: "X|0⟩ = |1⟩ · Z|1⟩ = −|1⟩", body: ["Quantum gates are reversible operations on a state. X swaps the computational basis states; Z changes the phase of |1⟩ without changing its measurement probability.", "This lab applies X then Z to q0. The final measurement is 01 with certainty; the Z phase is visible in the statevector even though it does not change the histogram."], steps: ["Start with |00⟩", "Apply X to flip q0", "Apply Z to change its phase", "Compare statevector and measurement results"] },
    correctDistribution: { "00": 0, "01": 100, "10": 0, "11": 0 }, correctGates: [{ id: "x-q0", step: 0, qubit: 0, gate: "X" }, { id: "z-q0", step: 1, qubit: 0, gate: "Z" }], debugCircuit: [{ id: "x-q0", step: 0, qubit: 0, gate: "X" }, { id: "z-q0", step: 1, qubit: 0, gate: "Z" }, { id: "fault", step: 2, qubit: 1, gate: "X" }],
    seededFault: { gateId: "fault", description: "An extra X gate flips q1 even though the lesson circuit acts only on q0." },
    challenge: { difficulty: "EASY", gateBudget: 4, iterationCap: 2, targetDistribution: { "00": 0, "01": 100, "10": 0, "11": 0 }, tolerance: 2, goal: "Prepare q0 in |1⟩ while leaving q1 in |0⟩, using no more than 4 gates.", hints: ["An X gate flips |0⟩ to |1⟩.", "A phase gate is not needed to match a measurement-only target."] },
  },
  entanglement: {
    slug: "entanglement", name: "Entanglement", qubits: 2, basisStates: ["00", "01", "10", "11"], backendName: "Local State-Vector Simulator", statusColor: "bg-violet-400",
    learn: { calloutTitle: "Correlated joint states", equation: "CNOT(H⊗I)|00⟩ = (|00⟩ + |11⟩)/√2", body: ["A Hadamard on q0 creates two branches. A CNOT controlled by q0 correlates q1 with those branches, producing a Bell state.", "Each qubit alone is random, but joint measurements match: only 00 and 11 should appear. These correlations cannot be represented as independent qubit states."], steps: ["Prepare |00⟩", "Apply H to q0", "Apply CNOT from q0 to q1", "Run shots and compare both qubits jointly"] },
    correctDistribution: { "00": 50, "01": 0, "10": 0, "11": 50 }, correctGates: [{ id: "h-q0", step: 0, qubit: 0, gate: "H" }, { id: "cx-01", step: 1, qubit: 0, gate: "CNOT", target: 1 }], debugCircuit: [{ id: "h-q0", step: 0, qubit: 0, gate: "H" }, { id: "cx-01", step: 1, qubit: 0, gate: "CNOT", target: 1 }, { id: "fault", step: 2, qubit: 1, gate: "X" }],
    seededFault: { gateId: "fault", description: "An X gate on q1 breaks the expected 00/11 correlation by flipping the second qubit." },
    challenge: { difficulty: "MEDIUM", gateBudget: 4, iterationCap: 2, targetDistribution: { "00": 50, "01": 0, "10": 0, "11": 50 }, tolerance: 3, goal: "Create a Bell pair whose measurements are correlated, using no more than 4 gates.", hints: ["Start with |00⟩.", "Put q0 into superposition, then use it to control a CNOT on q1."] },
  },
  "deutsch-jozsa": {
    slug: "deutsch-jozsa",
    name: "Deutsch\u2013Jozsa",
    qubits: 2,
    timesteps: 6,
    basisStates: ["00", "01", "10", "11"],
    backendName: "QASM Simulator",
    statusColor: "bg-amber-400",
    learn: {
      calloutTitle: "The oracle problem",
      equation: "|\\psi\\rangle = H^{\\otimes n} \\, U_f \\, H^{\\otimes n} \\, |0\\rangle^{\\otimes n}",
      body: [
        "The Deutsch\u2013Jozsa algorithm decides, in a single query, whether a black-box function f is constant (returns the same value for every input) or balanced (returns 0 for exactly half of all inputs and 1 for the other half).",
        "A classical algorithm needs up to 2^(n-1) + 1 queries in the worst case. By placing the register into superposition with Hadamard gates before and after the oracle, interference cancels every amplitude except the one corresponding to the correct answer \u2014 collapsing the entire search into one measurement.",
        "For this balanced two-qubit oracle, q0 is the input and q1 is the helper. The helper measurement remains random; the reliable signature is q0=1, so outcomes 01 and 11 each occur about half the time.",
      ],
    },
    correctDistribution: { "00": 0, "01": 50, "10": 0, "11": 50 },
    correctGates: [
      { id: "helper-x", step: 0, qubit: 1, gate: "X" },
      { id: "input-h", step: 1, qubit: 0, gate: "H" },
      { id: "helper-h", step: 1, qubit: 1, gate: "H" },
      { id: "oracle-cnot", step: 3, qubit: 0, gate: "CNOT", target: 1 },
      { id: "input-final-h", step: 4, qubit: 0, gate: "H" },
    ],
    debugCircuit: [
      { id: "helper-x", step: 0, qubit: 1, gate: "X" }, { id: "input-h", step: 1, qubit: 0, gate: "H" }, { id: "helper-h", step: 1, qubit: 1, gate: "H" },
      { id: "fault-z", step: 2, qubit: 1, gate: "Z" }, { id: "oracle-cnot", step: 3, qubit: 0, gate: "CNOT", target: 1 }, { id: "input-final-h", step: 4, qubit: 0, gate: "H" },
    ],
    seededFault: { gateId: "fault-z", description: "A Z fault changes the helper from |−⟩ to |+⟩ before the oracle, removing the phase kickback signal." },
    challenge: {
      difficulty: "MEDIUM",
      gateBudget: 6,
      iterationCap: 3,
      targetDistribution: { "00": 0, "01": 50, "10": 0, "11": 50 },
      tolerance: 5,
      goal: "Reproduce the balanced-oracle signature with q0 measured as 1 on every shot, using no more than 6 gates.",
      hints: [
        "Superposition on both qubits before the oracle is non-negotiable \u2014 spend gates there first.",
        "The balanced oracle is one CNOT from input q0 to helper q1.",
        "The final Hadamard on q0 converts phase kickback into the input measurement bit.",
        "Every gate beyond the minimal 5 costs efficiency score, even if the distribution still matches.",
      ],
    },
  },
  grovers: {
    slug: "grovers", name: "Grover's Search", qubits: 2, timesteps: 8, basisStates: ["00", "01", "10", "11"], backendName: "Local State-Vector Simulator", statusColor: "bg-amber-400",
    learn: { calloutTitle: "Amplitude amplification", equation: "|s⟩ → O → D|s⟩", body: ["Search a two-bit space with the marked state |11⟩. Hadamards prepare a uniform superposition; a CZ oracle flips the marked state's phase, then the diffusion operator reflects amplitudes about their mean.", "This two-qubit example uses one Grover iteration in a local statevector simulator. It demonstrates amplitude amplification and does not claim scalable quantum advantage."], steps: ["Prepare equal amplitudes", "Mark |11⟩ with CZ", "Reflect about the mean", "Measure the marked-state probability"] },
    correctDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 },
    correctGates: [
      { id: "h0", step: 0, qubit: 0, gate: "H" }, { id: "h1", step: 0, qubit: 1, gate: "H" }, { id: "oracle", step: 1, qubit: 0, gate: "CZ", target: 1 },
      { id: "dh0", step: 2, qubit: 0, gate: "H" }, { id: "dh1", step: 2, qubit: 1, gate: "H" }, { id: "dx0", step: 3, qubit: 0, gate: "X" }, { id: "dx1", step: 3, qubit: 1, gate: "X" },
      { id: "diffusion", step: 4, qubit: 0, gate: "CZ", target: 1 }, { id: "ix0", step: 5, qubit: 0, gate: "X" }, { id: "ix1", step: 5, qubit: 1, gate: "X" }, { id: "fh0", step: 6, qubit: 0, gate: "H" }, { id: "fh1", step: 6, qubit: 1, gate: "H" },
    ],
    debugCircuit: [
      { id: "h0", step: 0, qubit: 0, gate: "H" }, { id: "h1", step: 0, qubit: 1, gate: "H" }, { id: "oracle", step: 1, qubit: 0, gate: "CZ", target: 1 },
      { id: "dh0", step: 2, qubit: 0, gate: "H" }, { id: "dh1", step: 2, qubit: 1, gate: "H" }, { id: "dx0", step: 3, qubit: 0, gate: "X" }, { id: "dx1", step: 3, qubit: 1, gate: "X" }, { id: "diffusion", step: 4, qubit: 0, gate: "CZ", target: 1 }, { id: "ix0", step: 5, qubit: 0, gate: "X" }, { id: "ix1", step: 5, qubit: 1, gate: "X" }, { id: "fh0", step: 6, qubit: 0, gate: "H" }, { id: "fh1", step: 6, qubit: 1, gate: "H" }, { id: "fault-x", step: 7, qubit: 0, gate: "X" },
    ],
    seededFault: { gateId: "fault-x", description: "An extra X gate flips q0 after amplification, moving the marked outcome away from |11⟩." },
    challenge: { difficulty: "MEDIUM", gateBudget: 12, iterationCap: 1, targetDistribution: { "00": 0, "01": 0, "10": 0, "11": 100 }, tolerance: 3, goal: "Amplify the marked state |11⟩ with one oracle and one diffusion iteration.", hints: ["Begin with H on both qubits.", "Use CZ to phase-mark |11⟩.", "The diffusion reflection is H, X, CZ, X, H on both qubits."] },
  },
}

export function getAlgorithm(slug: string): AlgorithmDef {
  return ALGORITHMS[slug] as AlgorithmDef
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
  { gate: "CZ", label: "Controlled-Z" },
]
