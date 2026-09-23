export type StudioGateType =
  | "I"
  | "H"
  | "X"
  | "Y"
  | "Z"
  | "S"
  | "SDG"
  | "T"
  | "TDG"
  | "RX"
  | "RY"
  | "RZ"
  | "CNOT"
  | "CZ"
  | "SWAP"
  | "CP"
  | "CCX"
  | "MEASURE"
  | "BARRIER"

export interface StudioGate {
  id: string
  type: StudioGateType
  /** time-step column */
  step: number
  /** primary qubit — the target for single-qubit gates, the control for CNOT/CZ/CP, first control for CCX */
  qubit: number
  /** second qubit — target for CNOT/CZ/SWAP/CP, second control for CCX */
  target?: number
  /** third qubit — target for CCX */
  control2?: number
  /** rotation angle in radians, used by RX/RY/RZ/CP */
  theta?: number
}

export interface StudioCircuit {
  name: string
  qubits: number
  gates: StudioGate[]
}

export interface SavedCircuit extends StudioCircuit {
  id: string
  updatedAt: number
}

export interface Complex {
  re: number
  im: number
}

export interface BlochVector {
  x: number
  y: number
  z: number
  length: number
  mixed: boolean
}

export interface SimResult {
  statevector: Complex[]
  /** noise-free Born-rule probabilities */
  probabilities: Record<string, number>
  /** probabilities after depolarizing mix-toward-uniform */
  noisyProbabilities: Record<string, number>
  /** sampled shot outcomes, including readout error */
  counts: Record<string, number>
  blochVectors: BlochVector[]
  /** classical fidelity between ideal and noisy distributions, 0-1 */
  fidelity: number
  /** statevector snapshot after each populated time-step column, in step order */
  stepStates: Complex[][]
  qubits: number
  shots: number
}

export interface CircuitInfo {
  depth: number
  qubits: number
  gateCount: number
  gateCountByType: Record<string, number>
  tCount: number
}
