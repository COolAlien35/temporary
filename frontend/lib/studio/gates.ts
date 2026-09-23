import type { StudioGateType } from "./types"

export type GateCategory = "single" | "multi" | "measurement" | "barrier"

export interface GateDef {
  type: StudioGateType
  label: string
  symbol: string
  category: GateCategory
  description: string
  matrix?: string
  hasAngle?: boolean
  /** number of qubit "slots" this gate occupies: 1 = single wire, 2 = control+target, 3 = two controls + target */
  slots: 1 | 2 | 3
  color: string
}

export const GATE_DEFS: Record<StudioGateType, GateDef> = {
  I: { type: "I", label: "Identity", symbol: "I", category: "single", slots: 1, description: "Leaves the qubit unchanged.", matrix: "[[1,0],[0,1]]", color: "border-slate-400/40 bg-slate-400/10 text-slate-300" },
  H: { type: "H", label: "Hadamard", symbol: "H", category: "single", slots: 1, description: "Creates an equal superposition of |0⟩ and |1⟩.", matrix: "1/√2 [[1,1],[1,-1]]", color: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  X: { type: "X", label: "Pauli-X", symbol: "X", category: "single", slots: 1, description: "Bit-flip: swaps |0⟩ and |1⟩.", matrix: "[[0,1],[1,0]]", color: "border-rose-400/40 bg-rose-400/10 text-rose-300" },
  Y: { type: "Y", label: "Pauli-Y", symbol: "Y", category: "single", slots: 1, description: "Bit- and phase-flip about the Y axis.", matrix: "[[0,-i],[i,0]]", color: "border-rose-400/40 bg-rose-400/10 text-rose-300" },
  Z: { type: "Z", label: "Pauli-Z", symbol: "Z", category: "single", slots: 1, description: "Phase-flip: negates the |1⟩ amplitude.", matrix: "[[1,0],[0,-1]]", color: "border-rose-400/40 bg-rose-400/10 text-rose-300" },
  S: { type: "S", label: "Phase S", symbol: "S", category: "single", slots: 1, description: "Quarter-turn phase gate: multiplies |1⟩ by i.", matrix: "[[1,0],[0,i]]", color: "border-violet-400/40 bg-violet-400/10 text-violet-300" },
  SDG: { type: "SDG", label: "S-dagger", symbol: "S†", category: "single", slots: 1, description: "Inverse of S: multiplies |1⟩ by -i.", matrix: "[[1,0],[0,-i]]", color: "border-violet-400/40 bg-violet-400/10 text-violet-300" },
  T: { type: "T", label: "Phase T", symbol: "T", category: "single", slots: 1, description: "Eighth-turn phase gate: multiplies |1⟩ by e^(iπ/4).", matrix: "[[1,0],[0,e^(iπ/4)]]", color: "border-violet-400/40 bg-violet-400/10 text-violet-300" },
  TDG: { type: "TDG", label: "T-dagger", symbol: "T†", category: "single", slots: 1, description: "Inverse of T: multiplies |1⟩ by e^(-iπ/4).", matrix: "[[1,0],[0,e^(-iπ/4)]]", color: "border-violet-400/40 bg-violet-400/10 text-violet-300" },
  RX: { type: "RX", label: "Rotate X", symbol: "Rx", category: "single", slots: 1, hasAngle: true, description: "Rotates the qubit around the X axis by θ.", matrix: "[[cos θ/2, -i sin θ/2],[-i sin θ/2, cos θ/2]]", color: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  RY: { type: "RY", label: "Rotate Y", symbol: "Ry", category: "single", slots: 1, hasAngle: true, description: "Rotates the qubit around the Y axis by θ.", matrix: "[[cos θ/2, -sin θ/2],[sin θ/2, cos θ/2]]", color: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  RZ: { type: "RZ", label: "Rotate Z", symbol: "Rz", category: "single", slots: 1, hasAngle: true, description: "Rotates the qubit around the Z axis by θ.", matrix: "[[e^(-iθ/2),0],[0,e^(iθ/2)]]", color: "border-amber-400/40 bg-amber-400/10 text-amber-300" },
  CNOT: { type: "CNOT", label: "CNOT", symbol: "⊕", category: "multi", slots: 2, description: "Flips the target when the control is |1⟩.", matrix: "control ⊗ X", color: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" },
  CZ: { type: "CZ", label: "CZ", symbol: "Z", category: "multi", slots: 2, description: "Applies a phase flip when both qubits are |1⟩.", matrix: "control ⊗ Z", color: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" },
  SWAP: { type: "SWAP", label: "SWAP", symbol: "×", category: "multi", slots: 2, description: "Exchanges the states of two qubits.", matrix: "swap basis", color: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" },
  CP: { type: "CP", label: "Controlled Phase", symbol: "P", category: "multi", slots: 2, hasAngle: true, description: "Applies phase e^(iθ) when both qubits are |1⟩.", matrix: "control ⊗ diag(1, e^(iθ))", color: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300" },
  CCX: { type: "CCX", label: "Toffoli", symbol: "⊕", category: "multi", slots: 3, description: "Flips the target when both controls are |1⟩.", matrix: "control ⊗ control ⊗ X", color: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300" },
  MEASURE: { type: "MEASURE", label: "Measure", symbol: "M", category: "measurement", slots: 1, description: "Collapses the qubit and records the classical outcome.", color: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
  BARRIER: { type: "BARRIER", label: "Barrier", symbol: "❙", category: "barrier", slots: 1, description: "A visual/optimization boundary; does not change the state.", color: "border-white/30 bg-white/5 text-white/60" },
}

export const GATE_GROUPS: { label: string; category: GateCategory; gates: StudioGateType[] }[] = [
  { label: "Single-qubit", category: "single", gates: ["I", "H", "X", "Y", "Z", "S", "SDG", "T", "TDG", "RX", "RY", "RZ"] },
  { label: "Multi-qubit", category: "multi", gates: ["CNOT", "CZ", "SWAP", "CP", "CCX"] },
  { label: "Measurement", category: "measurement", gates: ["MEASURE"] },
  { label: "Barrier", category: "barrier", gates: ["BARRIER"] },
]

export const ANGLE_PRESETS: { label: string; value: number }[] = [
  { label: "π/4", value: Math.PI / 4 },
  { label: "π/2", value: Math.PI / 2 },
  { label: "π", value: Math.PI },
]
