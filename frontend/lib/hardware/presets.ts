import { generateDesign } from "./generator"
import type { Preset } from "./types"

export const PRESETS: Preset[] = [
  {
    slug: "single-qubit",
    title: "Single Transmon",
    description: "The minimal complete wiring diagram for one superconducting qubit: XY drive, flux bias, and a full readout chain with a parametric amplifier.",
    qubits: 1,
    design: generateDesign(1, "Single Transmon"),
  },
  {
    slug: "two-qubit-pair",
    title: "Two-Qubit Pair",
    description: "Two independent qubit chains sharing one feedthrough panel and thermometry loom — a compact starting point for entangling-gate experiments.",
    qubits: 2,
    design: generateDesign(2, "Two-Qubit Pair"),
  },
  {
    slug: "small-register",
    title: "Small Register",
    description: "A four-qubit register with four parallel control and readout chains — a preview of how wiring density scales as qubit count grows.",
    qubits: 4,
    design: generateDesign(4, "Small Register"),
  },
]

export function getPreset(slug: string): Preset | undefined {
  return PRESETS.find((p) => p.slug === slug)
}
