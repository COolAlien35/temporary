import type { GatePlacement, GateType } from "@/lib/lab-data"

export type AlgorithmBadge = "Quantum Oracle" | "Interference Master" | "Phase Whisperer" | "Unitary Grandmaster"
export type BasisOutcome = string
export interface AlgorithmConfig {
  meta: { id: string; slug: string; title: string; trackNumber: number; tagline: string; difficulty: "EASY" | "MEDIUM" | "HARD"; estimatedMinutes: number; prerequisites: string[] }
  register: { qubits: number; labels: string[]; timesteps: number; allowedGates: GateType[]; fixedGates?: GatePlacement[] }
  learn: { steps: Array<{ title: string; narration: string }> }
  predict: { outcomes: BasisOutcome[]; numberOfOutcomes: number; answerKey: Record<string, number> }
  build: { targetCircuit: GatePlacement[]; gatePalette: GateType[]; gateBudget: number; starterTemplate?: GatePlacement[] }
  code: { guidedStarter: string; exploreStarter: string; reference: string }
  run: { defaultShots: number; noiseOptions: number[] }
  observe: { views: Array<"histogram" | "statevector" | "bloch" | "phase" | "amplitude" | "iterations"> }
  explain?: Array<{ question: string; rubric: string }>
  debug?: Array<{ title: string; fault: string; hints: string[]; fix: string }>
  challenge?: Array<{ title: string; goal: string; scoring: string }>
  master?: { calibration: number; badge: AlgorithmBadge }
  misconceptions?: Array<{ mistake: string; correction: string }>
}

export type CircuitGate = GatePlacement & { theta?: number; control?: number }
export interface SimulationResult { counts: Record<string, number>; probabilities: Record<string, number>; statevector: Array<{ re: number; im: number }>; blochVectors: Array<{ x: number; y: number; z: number }> }
