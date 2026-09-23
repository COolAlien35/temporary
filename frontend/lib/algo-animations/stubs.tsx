import type { AlgoAnimationConfig } from "./types"
import { ComingSoonScene } from "@/components/lab/anim/blocks"
export const makeStub = (id: string, title: string): AlgoAnimationConfig => ({ id, title, qubits: 2, scene: () => <ComingSoonScene />, glossary: {}, steps: [1, 2, 3].map((n) => ({ title: `Coming soon · Step ${n}`, narration: "This walkthrough is being prepared.", why: "The reusable animation player is ready for this algorithm.", circuitHighlight: "none", stateBefore: ["pending"], stateAfter: ["pending"], visualKind: "coming-soon", duration: 1500 })) })
