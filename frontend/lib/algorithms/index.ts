import type { AlgorithmConfig } from "./types"

const baseCode = (qubits: number) => `from qiskit import QuantumCircuit\n\nqc = QuantumCircuit(${qubits}, ${qubits})\n# TODO: build the circuit\nqc.measure_all()`
const steps = (names: string[]) => names.map((title) => ({ title, narration: `${title} is part of the algorithm walkthrough.` }))

export const algorithmConfigs: Record<string, AlgorithmConfig> = {
  "deutsch-jozsa": {
    meta: { id: "dj", slug: "deutsch-jozsa", title: "Deutsch–Jozsa", trackNumber: 1, tagline: "Classify a hidden oracle with one query.", difficulty: "MEDIUM", estimatedMinutes: 25, prerequisites: [] },
    register: { qubits: 2, labels: ["q0 input", "q1 helper"], timesteps: 6, allowedGates: ["H", "X", "Z", "CNOT"] },
    learn: { steps: steps(["The oracle problem", "Prepare the helper", "Create superposition", "Phase kickback", "Interference", "Measure the answer", "Reflect"]) },
    predict: { outcomes: ["00", "01", "10", "11"], numberOfOutcomes: 4, answerKey: { "00": 100, "01": 0, "10": 0, "11": 0 } },
    build: { targetCircuit: [], gatePalette: ["H", "X", "Z", "CNOT"], gateBudget: 8 }, code: { guidedStarter: baseCode(2), exploreStarter: baseCode(2), reference: baseCode(2) }, run: { defaultShots: 1024, noiseOptions: [0, 1, 3, 5, 10] }, observe: { views: ["histogram", "statevector", "bloch"] }, master: { calibration: 80, badge: "Quantum Oracle" }, misconceptions: [{ mistake: "Skipping the helper preparation", correction: "The X and H gates create phase kickback." }]
  },
  qft: {
    meta: { id: "qft", slug: "qft", title: "Quantum Fourier Transform", trackNumber: 2, tagline: "Turn periodic structure into phase information.", difficulty: "HARD", estimatedMinutes: 35, prerequisites: ["deutsch-jozsa"] },
    register: { qubits: 3, labels: ["q0", "q1", "q2"], timesteps: 8, allowedGates: ["H", "S", "T"] },
    learn: { steps: steps(["Signals and frequencies", "First phase", "Controlled phase", "Build the pattern", "Phasors rotate", "Bit reversal", "Read phases"]) },
    predict: { outcomes: ["000", "001", "010", "011", "100", "101", "110", "111"], numberOfOutcomes: 8, answerKey: Object.fromEntries(["000", "001", "010", "011", "100", "101", "110", "111"].map((x) => [x, 12.5])) },
    build: { targetCircuit: [], gatePalette: ["H", "S", "T"], gateBudget: 12 }, code: { guidedStarter: baseCode(3), exploreStarter: baseCode(3), reference: baseCode(3) }, run: { defaultShots: 1024, noiseOptions: [0, 1, 3, 5, 10] }, observe: { views: ["histogram", "phase", "statevector"] }, master: { calibration: 80, badge: "Phase Whisperer" }
  },
  grovers: {
    meta: { id: "grover", slug: "grovers", title: "Grover's Search", trackNumber: 3, tagline: "Amplify the marked answer from noise.", difficulty: "MEDIUM", estimatedMinutes: 30, prerequisites: ["qft"] },
    register: { qubits: 2, labels: ["q0", "q1"], timesteps: 8, allowedGates: ["H", "X", "Z", "CNOT"] },
    learn: { steps: steps(["Uniform amplitudes", "Oracle marks target", "Reflect about mean", "Target grows", "One iteration", "Measure", "Compare classical"]) },
    predict: { outcomes: ["00", "01", "10", "11"], numberOfOutcomes: 4, answerKey: { "00": 100, "01": 0, "10": 0, "11": 0 } },
    build: { targetCircuit: [], gatePalette: ["H", "X", "Z", "CNOT"], gateBudget: 14 }, code: { guidedStarter: baseCode(2), exploreStarter: baseCode(2), reference: baseCode(2) }, run: { defaultShots: 1024, noiseOptions: [0, 1, 3, 5, 10] }, observe: { views: ["histogram", "amplitude", "iterations"] }, master: { calibration: 80, badge: "Interference Master" }
  },
  shor: { meta: { id: "shor", slug: "shor", title: "Shor's Factoring", trackNumber: 4, tagline: "Order finding for factoring.", difficulty: "HARD", estimatedMinutes: 45, prerequisites: ["grovers"] }, register: { qubits: 3, labels: ["q0", "q1", "q2"], timesteps: 3, allowedGates: ["H"] }, learn: { steps: steps(["Factoring preview", "Order finding", "Coming soon"]) }, predict: { outcomes: [], numberOfOutcomes: 0, answerKey: {} }, build: { targetCircuit: [], gatePalette: [], gateBudget: 0 }, code: { guidedStarter: "", exploreStarter: "", reference: "" }, run: { defaultShots: 256, noiseOptions: [0] }, observe: { views: [] } },
  qec: { meta: { id: "qec", slug: "qec", title: "Quantum Error Correction", trackNumber: 5, tagline: "Protect fragile quantum information.", difficulty: "HARD", estimatedMinutes: 40, prerequisites: ["shor"] }, register: { qubits: 3, labels: ["data", "ancilla 1", "ancilla 2"], timesteps: 3, allowedGates: ["H"] }, learn: { steps: steps(["Why errors matter", "Syndromes", "Coming soon"]) }, predict: { outcomes: [], numberOfOutcomes: 0, answerKey: {} }, build: { targetCircuit: [], gatePalette: [], gateBudget: 0 }, code: { guidedStarter: "", exploreStarter: "", reference: "" }, run: { defaultShots: 256, noiseOptions: [0] }, observe: { views: [] } }
}

export function getAlgorithmConfig(slug: string) { return algorithmConfigs[slug] }
export function validateConfig(config: AlgorithmConfig) { if (!config.meta?.slug || !config.register || !config.learn) throw new Error(`Invalid algorithm config: ${config.meta?.title ?? "unknown"}`); return true }
