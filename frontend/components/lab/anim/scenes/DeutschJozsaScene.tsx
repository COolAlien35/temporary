"use client"

import { GateBox, WireLine, QubitOrb, AmplitudeBars, ComingSoonScene } from "@/components/lab/anim/blocks"
import type { AnimationStep } from "@/lib/algo-animations/types"

export function DeutschJozsaScene({ step, progress }: { step: AnimationStep; progress: number }) {
  if (step.visualKind === "result") return <g><text x="400" y="125" textAnchor="middle" fill="#F5B942" fontSize="40" fontWeight="800">Constant or Balanced?</text><AmplitudeBars values={[step.stateAfter.length === 1 ? 1 : 0, step.stateAfter.length > 1 ? 1 : 0]} labels={["constant", "balanced"]} /></g>
  if (step.visualKind === "coming-soon") return <ComingSoonScene />
  if (["hadamard", "phase", "interference"].includes(step.visualKind)) return <AmplitudeBars values={step.visualKind === "phase" ? [0.7, -0.7] : [0.7, 0.7]} labels={["|0⟩", "|1⟩"]} />
  return <g><WireLine y={160} active={step.visualKind === "oracle"} /><WireLine y={260} active={step.visualKind === "oracle"} /><text x="30" y="166" fill="#9db1c1" fontSize="14">q0</text><text x="30" y="266" fill="#9db1c1" fontSize="14">q1</text><QubitOrb x={170 + progress * 220} y={160} label="q0"/><QubitOrb x={170 + progress * 220} y={260} label="q1" phase="#F5B942" />{step.visualKind === "oracle" && <GateBox x={390} y={190} label="U_f" active />}{step.visualKind === "measure" && <text x="400" y="100" textAnchor="middle" fill="#4ADE80" fontSize="20">Measurement collapses the answer</text>}</g>
}
