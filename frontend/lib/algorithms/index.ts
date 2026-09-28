import type { AlgorithmConfig } from "./types"
import type { GatePlacement, GateType } from "@/lib/lab-data"

const baseCode = (qubits: number) => `from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(${qubits}, ${qubits})\n# TODO: build the circuit\nqc.measure_all()`
const steps = (names: string[]) => names.map((title) => ({ title, narration: `${title} is part of the algorithm walkthrough.` }))

function beginnerTrack({ slug, id, title, tagline, learn, targetCircuit, outcomes, palette, gateBudget }: {
  slug: string; id: string; title: string; tagline: string; learn: string[]; targetCircuit: GatePlacement[]; outcomes: Record<string, number>; palette: GateType[]; gateBudget: number
}): AlgorithmConfig {
  const qubits = 2
  const code = `${baseCode(qubits)}\n# Add H, X, Z or CNOT gates to match the target outcomes.`
  return {
    meta: { id, slug, title, trackNumber: 0, tagline, difficulty: "EASY", estimatedMinutes: 15, prerequisites: [] },
    register: { qubits, labels: ["q0", "q1"], timesteps: 4, allowedGates: palette },
    learn: { steps: steps(learn) },
    predict: { outcomes: Object.keys(outcomes), numberOfOutcomes: Object.keys(outcomes).length, answerKey: outcomes },
    build: { targetCircuit: targetCircuit.map((gate) => ({ ...gate })), starterTemplate: targetCircuit.map((gate) => ({ ...gate })), gatePalette: palette, gateBudget },
    code: { guidedStarter: code, exploreStarter: code, reference: code },
    run: { defaultShots: 1024, noiseOptions: [0, 2] },
    observe: { views: ["histogram", "statevector", "bloch"] },
    explain: [{ question: "Which gate changed the outcomes most?", rubric: "Use the circuit and measured counts to explain the change." }],
    debug: [{ title: "Find the extra operation", fault: "A gate changes an outcome that should remain fixed.", hints: ["Compare the fault description with the circuit wires."], fix: "Disable the injected fault and rerun." }],
    challenge: [{ title: `Rebuild ${title}`, goal: tagline, scoring: `Match the target distribution within the ${gateBudget}-gate budget.` }],
    master: { calibration: 80, badge: "Unitary Grandmaster" },
  }
}

export const algorithmConfigs: Record<string, AlgorithmConfig> = {
  superposition: beginnerTrack({ slug: "superposition", id: "superposition", title: "Superposition", tagline: "Create and measure a balanced qubit state.", learn: ["Prepare the register", "Apply Hadamard", "Read the outcomes"], targetCircuit: [{ id: "h-q0", step: 0, qubit: 0, gate: "H" }], outcomes: { "00": 50, "01": 50, "10": 0, "11": 0 }, palette: ["H", "X", "Z"], gateBudget: 3 }),
  gates: beginnerTrack({ slug: "gates", id: "gates", title: "Gate Toolkit", tagline: "See how reversible gates transform basis states.", learn: ["Start from |00⟩", "Apply X", "Track the Z phase"], targetCircuit: [{ id: "x-q0", step: 0, qubit: 0, gate: "X" }, { id: "z-q0", step: 1, qubit: 0, gate: "Z" }], outcomes: { "00": 0, "01": 100, "10": 0, "11": 0 }, palette: ["H", "X", "Y", "Z", "S", "T"], gateBudget: 4 }),
  entanglement: beginnerTrack({ slug: "entanglement", id: "entanglement", title: "Entanglement", tagline: "Prepare a Bell pair and inspect its correlations.", learn: ["Prepare |00⟩", "Superpose q0", "Correlate q1 with CNOT"], targetCircuit: [{ id: "h-q0", step: 0, qubit: 0, gate: "H" }, { id: "cx-01", step: 1, qubit: 0, gate: "CNOT", target: 1 }], outcomes: { "00": 50, "01": 0, "10": 0, "11": 50 }, palette: ["H", "X", "Z", "CNOT"], gateBudget: 4 }),
  qaoa: {
    meta: { id: "qaoa", slug: "qaoa", title: "QAOA · Max-Cut", trackNumber: 6, tagline: "Explore a parameterized search for a graph cut.", difficulty: "HARD", estimatedMinutes: 30, prerequisites: ["entanglement"] },
    register: { qubits: 3, labels: ["vertex 0", "vertex 1", "vertex 2"], timesteps: 8, allowedGates: ["H", "X", "Z", "CNOT"] },
    learn: { steps: steps(["Encode a graph objective", "Prepare a uniform state", "Apply cost and mixer layers", "Inspect the expected cut value"]) },
    predict: { outcomes: ["000", "001", "010", "011", "100", "101", "110", "111"], numberOfOutcomes: 8, answerKey: {} },
    build: { targetCircuit: [], gatePalette: ["H", "X", "Z", "CNOT"], gateBudget: 20 }, code: { guidedStarter: "# QAOA parameters are edited in the optimization workbench", exploreStarter: "# QAOA parameters are edited in the optimization workbench", reference: "" }, run: { defaultShots: 2048, noiseOptions: [0] }, observe: { views: ["histogram", "iterations"] }, master: { calibration: 80, badge: "Interference Master" },
  },
  vqe: {
    meta: { id: "vqe", slug: "vqe", title: "VQE · Toy Hamiltonian", trackNumber: 7, tagline: "Tune a small ansatz against an explicit energy objective.", difficulty: "HARD", estimatedMinutes: 30, prerequisites: ["entanglement"] },
    register: { qubits: 2, labels: ["q0", "q1"], timesteps: 5, allowedGates: ["H", "X", "Y", "Z", "CNOT"] },
    learn: { steps: steps(["Define the toy Hamiltonian", "Choose an ansatz", "Estimate energy locally", "Compare parameter iterations"]) },
    predict: { outcomes: ["00", "01", "10", "11"], numberOfOutcomes: 4, answerKey: {} },
    build: { targetCircuit: [], gatePalette: ["H", "X", "Y", "Z", "CNOT"], gateBudget: 12 }, code: { guidedStarter: "# VQE parameters are edited in the optimization workbench", exploreStarter: "# VQE parameters are edited in the optimization workbench", reference: "" }, run: { defaultShots: 2048, noiseOptions: [0] }, observe: { views: ["histogram", "iterations"] }, master: { calibration: 80, badge: "Unitary Grandmaster" },
  },
  "deutsch-jozsa": {
    meta: { id: "dj", slug: "deutsch-jozsa", title: "Deutsch–Jozsa", trackNumber: 1, tagline: "Classify a hidden oracle with one query.", difficulty: "MEDIUM", estimatedMinutes: 25, prerequisites: [] },
    register: { qubits: 2, labels: ["q0 input", "q1 helper"], timesteps: 6, allowedGates: ["H", "X", "Z", "CNOT"] },
    learn: { steps: steps(["The oracle problem", "Prepare the helper", "Create superposition", "Phase kickback", "Interference", "Measure the answer", "Reflect"]) },
    predict: { outcomes: ["00", "01", "10", "11"], numberOfOutcomes: 4, answerKey: { "00": 0, "01": 50, "10": 0, "11": 50 } },
    build: { targetCircuit: [{ id: "helper-x", step: 0, qubit: 1, gate: "X" }, { id: "input-h", step: 1, qubit: 0, gate: "H" }, { id: "helper-h", step: 1, qubit: 1, gate: "H" }, { id: "oracle-cnot", step: 3, qubit: 0, gate: "CNOT", target: 1 }, { id: "input-final-h", step: 4, qubit: 0, gate: "H" }], gatePalette: ["H", "X", "Z", "CNOT"], gateBudget: 6 }, code: { guidedStarter: baseCode(2), exploreStarter: baseCode(2), reference: baseCode(2) }, run: { defaultShots: 1024, noiseOptions: [0, 1, 3, 5, 10] }, observe: { views: ["histogram", "statevector", "bloch"] }, master: { calibration: 80, badge: "Quantum Oracle" }, misconceptions: [{ mistake: "Skipping the helper preparation", correction: "X then H prepares the helper in |−⟩, allowing phase kickback." }]
  },
  qft: {
    meta: { id: "qft", slug: "qft", title: "Quantum Fourier Transform", trackNumber: 2, tagline: "Turn periodic structure into phase information.", difficulty: "HARD", estimatedMinutes: 35, prerequisites: ["deutsch-jozsa"] },
    register: { qubits: 3, labels: ["q0", "q1", "q2"], timesteps: 8, allowedGates: ["H", "S", "T"] },
    learn: { steps: steps(["Signals and frequencies", "First phase", "Controlled phase", "Build the pattern", "Phasors rotate", "Bit reversal", "Read phases"]) },
    predict: { outcomes: ["000", "001", "010", "011", "100", "101", "110", "111"], numberOfOutcomes: 8, answerKey: Object.fromEntries(["000", "001", "010", "011", "100", "101", "110", "111"].map((x) => [x, 12.5])) },
    build: { targetCircuit: [], gatePalette: ["H", "S", "T"], gateBudget: 12 }, code: { guidedStarter: baseCode(3), exploreStarter: baseCode(3), reference: baseCode(3) }, run: { defaultShots: 1024, noiseOptions: [0, 1, 3, 5, 10] }, observe: { views: ["histogram", "phase", "statevector"] }, master: { calibration: 80, badge: "Phase Whisperer" }
  },
  grovers: {
    meta: { id: "grover", slug: "grovers", title: "Grover's Search", trackNumber: 3, tagline: "Amplify the marked answer with a local two-qubit search.", difficulty: "MEDIUM", estimatedMinutes: 30, prerequisites: ["deutsch-jozsa"] },
    register: { qubits: 2, labels: ["q0", "q1"], timesteps: 8, allowedGates: ["H", "X", "Z", "CNOT", "CZ"] },
    learn: { steps: steps(["Uniform amplitudes", "Oracle marks target", "Reflect about mean", "Target grows", "One iteration", "Measure", "Compare classical"]) },
    predict: { outcomes: ["00", "01", "10", "11"], numberOfOutcomes: 4, answerKey: { "00": 100, "01": 0, "10": 0, "11": 0 } },
    build: { targetCircuit: [], gatePalette: ["H", "X", "Z", "CNOT", "CZ"], gateBudget: 12 }, code: { guidedStarter: baseCode(2), exploreStarter: baseCode(2), reference: baseCode(2) }, run: { defaultShots: 1024, noiseOptions: [0, 1, 3, 5, 10] }, observe: { views: ["histogram", "amplitude", "iterations"] }, master: { calibration: 80, badge: "Interference Master" }
  },
  shor: { meta: { id: "shor", slug: "shor", title: "Shor's Factoring", trackNumber: 4, tagline: "Order finding for factoring.", difficulty: "HARD", estimatedMinutes: 45, prerequisites: ["grovers"] }, register: { qubits: 3, labels: ["q0", "q1", "q2"], timesteps: 3, allowedGates: ["H"] }, learn: { steps: steps(["Factoring preview", "Order finding", "Coming soon"]) }, predict: { outcomes: [], numberOfOutcomes: 0, answerKey: {} }, build: { targetCircuit: [], gatePalette: [], gateBudget: 0 }, code: { guidedStarter: "", exploreStarter: "", reference: "" }, run: { defaultShots: 256, noiseOptions: [0] }, observe: { views: [] } },
  qec: { meta: { id: "qec", slug: "qec", title: "Quantum Error Correction", trackNumber: 5, tagline: "Protect fragile quantum information.", difficulty: "HARD", estimatedMinutes: 40, prerequisites: ["shor"] }, register: { qubits: 3, labels: ["data", "ancilla 1", "ancilla 2"], timesteps: 3, allowedGates: ["H"] }, learn: { steps: steps(["Why errors matter", "Syndromes", "Coming soon"]) }, predict: { outcomes: [], numberOfOutcomes: 0, answerKey: {} }, build: { targetCircuit: [], gatePalette: [], gateBudget: 0 }, code: { guidedStarter: "", exploreStarter: "", reference: "" }, run: { defaultShots: 256, noiseOptions: [0] }, observe: { views: [] } }
}

export function getAlgorithmConfig(slug: string) { return algorithmConfigs[slug] }
export function validateConfig(config: AlgorithmConfig) { if (!config.meta?.slug || !config.register || !config.learn) throw new Error(`Invalid algorithm config: ${config.meta?.title ?? "unknown"}`); return true }
