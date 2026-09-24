import type { Rule } from "./types"

export const RULES: Rule[] = [
  {
    id: "stage-order",
    title: "Stages must be ordered warm to cold",
    severity: "error",
    explanation: "The temperature stages of a dilution refrigerator must run from 300K at the top down to the mixing chamber at the bottom, in strictly decreasing temperature order.",
    howToFix: "Reorder or remove stages so each stage is colder than the one above it. The builder enforces this automatically when adding stages.",
  },
  {
    id: "stage-compat",
    title: "Component must be placed on a compatible stage",
    severity: "error",
    explanation: "Every component has a list of stages it is physically and electrically suited for (see the Matrix tab in the catalog). Placing it elsewhere is not physically valid.",
    howToFix: "Move the component to one of its compatible stages, ideally a preferred (starred) one.",
  },
  {
    id: "port-direction",
    title: "Routes must connect an output to an input",
    severity: "error",
    explanation: "Signal can only flow from an 'out' port into an 'in' port (or between two bidirectional ports). Circulators additionally only pass 1→2→3→1.",
    howToFix: "Re-route so the source port is an output (or bidirectional) and the destination port is an input (or bidirectional), respecting circulator orientation.",
  },
  {
    id: "line-compat",
    title: "Route line type must match both components",
    severity: "error",
    explanation: "A route's signal line (XY, Flux, Readout In/Out, DC Bias) must be one that both connected components support.",
    howToFix: "Choose a line type that both endpoints list in their compatible lines, or swap in a component that supports the line you need.",
  },
  {
    id: "hemt-required",
    title: "Readout Out chains need a HEMT at 4K",
    severity: "error",
    explanation: "Without a low-noise HEMT amplifier at 4K, the readout signal is buried in noise by the time it reaches room temperature.",
    howToFix: "Add a HEMT Amplifier on the 4K stage and route the Readout Out chain through it.",
  },
  {
    id: "atten-budget",
    title: "Attenuated drive lines must reach their attenuation budget",
    severity: "warning",
    explanation: "XY, Flux and Readout In lines are only well thermalized when the total attenuation across all stages meets the typical budget for that line type.",
    howToFix: "Add attenuators on the remaining stages until the route's total attenuation matches the reference budget in the Lines tab.",
  },
  {
    id: "thermal-anchor",
    title: "Cold stages need thermal anchors on entering cables",
    severity: "warning",
    explanation: "Every cable entering a stage below 50K should be clamped to a thermal anchor at that stage, or heat bypasses the intercept and loads the next colder stage.",
    howToFix: "Add a cable clamp / thermal anchor at the stage where the cable enters.",
  },
  {
    id: "dc-filtering",
    title: "DC lines require filtering before the MXC",
    severity: "warning",
    explanation: "Unfiltered DC bias and flux lines can carry high-frequency noise straight into the qubit, degrading coherence.",
    howToFix: "Insert a Cryo Low-Noise DC Filter on the DC Bias line before it reaches the mixing chamber.",
  },
  {
    id: "thermal-budget",
    title: "Total heat load per stage must not exceed cooling power",
    severity: "error",
    explanation: "Each stage has a finite cooling power. If cable heat leak plus component dissipation exceeds it, that stage (and everything colder) won't reach base temperature.",
    howToFix: "Remove components/cables from the overloaded stage, or move some load to a warmer stage that has more cooling power headroom.",
  },
  {
    id: "no-orphans",
    title: "No orphan components",
    severity: "info",
    explanation: "A placed component with no routes connected to any of its ports isn't doing anything in the design yet.",
    howToFix: "Connect at least one route to the component, or remove it if it isn't needed.",
  },
]

export const RULE_MAP: Record<string, Rule> = Object.fromEntries(RULES.map((r) => [r.id, r]))
