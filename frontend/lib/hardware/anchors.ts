import type { Anchor } from "./types"

export const ANCHORS: Record<string, Anchor> = {
  clamp: {
    id: "clamp",
    label: "Cable Clamp / Thermal Anchor",
    stages: ["50K", "4K", "Still", "CP", "MXC"],
    description: "A copper clamp that grips a cable jacket and bolts to the plate, forcing the cable's shield into thermal equilibrium with that stage.",
    why: "Without an anchor, heat travels along the cable shield straight past the stage that's supposed to intercept it, overloading the next colder stage.",
  },
  bulkhead: {
    id: "bulkhead",
    label: "Bulkhead Thermalization",
    stages: ["300K", "50K", "4K"],
    description: "A feedthrough bulkhead connector that is itself bolted to the plate, thermalizing the connector body and the cable braid at the panel.",
    why: "Bulkhead connectors sit at every plate boundary and act as the first thermal intercept point for incoming looms.",
  },
  "cold-finger": {
    id: "cold-finger",
    label: "Cold Finger",
    stages: ["Still", "CP", "MXC"],
    description: "A short copper braid or rod linking a component (e.g. an amplifier or filter can) directly to the coldest nearby plate.",
    why: "Components with their own heat dissipation need a dedicated low-impedance thermal path so they don't self-heat above the stage temperature.",
  },
}

export const ANCHOR_LIST: Anchor[] = Object.values(ANCHORS)
