import type { CableFamily } from "./types"

export const CABLES: Record<string, CableFamily> = {
  "ss-coax": {
    id: "ss-coax",
    label: "Stainless-steel coax",
    description: "Low thermal conductivity coax used for the long, warm-to-cold runs where minimizing heat leak matters more than loss.",
    diameterMm: 2.19,
    thermalConductivityClass: "low",
    heatLoadUwPerStage: { "300K-50K": 850, "50K-4K": 210, "4K-Still": 38, "Still-CP": 9, "CP-MXC": 2.2 },
    typicalUse: "300K to 4K runs on XY and Readout In lines",
  },
  "nbti-coax": {
    id: "nbti-coax",
    label: "NbTi superconducting coax",
    description: "Superconducting below ~9K, carries signal with near-zero resistive loss and low heat leak on the coldest runs.",
    diameterMm: 1.19,
    thermalConductivityClass: "medium",
    heatLoadUwPerStage: { "4K-Still": 14, "Still-CP": 4.1, "CP-MXC": 0.9 },
    typicalUse: "4K to MXC runs on Flux and Readout Out lines",
  },
  "cu-coax": {
    id: "cu-coax",
    label: "Copper coax",
    description: "High thermal conductivity coax used only within a single stage where heat leak between stages is not a concern.",
    diameterMm: 2.19,
    thermalConductivityClass: "high",
    heatLoadUwPerStage: { "4K-4K": 60, "MXC-MXC": 5 },
    typicalUse: "Short jumpers within a single stage",
  },
  "twisted-pair": {
    id: "twisted-pair",
    label: "Twisted pair (phosphor-bronze / manganin)",
    description: "Resistive, low-thermal-conductivity wire pairs for DC bias and thermometry lines where bandwidth is not needed.",
    diameterMm: 0.35,
    thermalConductivityClass: "low",
    heatLoadUwPerStage: { "300K-50K": 120, "50K-4K": 45, "4K-Still": 6, "Still-CP": 1.4, "CP-MXC": 0.3 },
    typicalUse: "DC Bias lines and thermometry looms",
  },
}

export const CABLE_LIST: CableFamily[] = Object.values(CABLES)
