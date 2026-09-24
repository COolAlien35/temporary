import type { LineType } from "./types"

function total(budget: { stageId: string; db: number }[]): number {
  return budget.reduce((sum, b) => sum + b.db, 0)
}

const xyBudget = [
  { stageId: "4K", db: 20 },
  { stageId: "Still", db: 10 },
  { stageId: "MXC", db: 30 },
]
const fluxBudget = [
  { stageId: "4K", db: 10 },
  { stageId: "MXC", db: 10 },
]
const readoutInBudget = [
  { stageId: "4K", db: 10 },
  { stageId: "Still", db: 10 },
  { stageId: "MXC", db: 20 },
]
const readoutOutBudget = [{ stageId: "4K", db: -38 }] // net gain from HEMT, negative "attenuation"
const dcBiasBudget = [{ stageId: "MXC", db: 0 }]

export const LINES: Record<string, LineType> = {
  xy: {
    id: "xy",
    label: "XY Drive",
    color: "#60A5FA",
    description: "Microwave drive that rotates the qubit state. Heavily attenuated to suppress amplifier and thermal noise reaching the qubit.",
    cableFamilyId: "ss-coax",
    attenuationBudget: xyBudget,
    totalAttenuationDb: total(xyBudget),
  },
  flux: {
    id: "flux",
    label: "Flux",
    color: "#A78BFA",
    description: "Tunes qubit frequency via a flux bias line. Lower bandwidth than XY, still needs filtering against high-frequency noise.",
    cableFamilyId: "nbti-coax",
    attenuationBudget: fluxBudget,
    totalAttenuationDb: total(fluxBudget),
  },
  "readout-in": {
    id: "readout-in",
    label: "Readout In",
    color: "#4ADE80",
    description: "Probe tone sent down to the readout resonator coupled to the qubit.",
    cableFamilyId: "ss-coax",
    attenuationBudget: readoutInBudget,
    totalAttenuationDb: total(readoutInBudget),
  },
  "readout-out": {
    id: "readout-out",
    label: "Readout Out",
    color: "#22C55E",
    description: "Carries the reflected/transmitted readout signal back up through low-noise amplification (HEMT at 4K, optionally a JPA at MXC).",
    cableFamilyId: "nbti-coax",
    attenuationBudget: readoutOutBudget,
    totalAttenuationDb: total(readoutOutBudget),
  },
  "dc-bias": {
    id: "dc-bias",
    label: "DC Bias",
    color: "#FB923C",
    description: "Slow DC lines for thermometry, bias tees and gate voltages. Uses twisted pair with RC/powder filtering near the MXC.",
    cableFamilyId: "twisted-pair",
    attenuationBudget: dcBiasBudget,
    totalAttenuationDb: total(dcBiasBudget),
  },
}

export const LINE_LIST: LineType[] = Object.values(LINES)
