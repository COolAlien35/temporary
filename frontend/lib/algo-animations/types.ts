import type { ReactNode } from "react"

export type VisualKind = "start" | "hadamard" | "oracle" | "phase" | "interference" | "measure" | "result" | "coming-soon"
export type CircuitHighlight = number | "oracle" | "none"

export interface AnimationStep {
  title: string
  narration: string
  why: string
  circuitHighlight: CircuitHighlight
  stateBefore: string[]
  stateAfter: string[]
  visualKind: VisualKind
  duration: number
}

export interface AlgoAnimationConfig {
  id: string
  title: string
  qubits: number
  steps: AnimationStep[]
  glossary: Record<string, string>
  scene?: (props: { step: AnimationStep; progress: number; algorithm: AlgoAnimationConfig }) => ReactNode
}
