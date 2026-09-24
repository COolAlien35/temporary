import type { ConnectorType } from "./types"

export const CONNECTORS: Record<string, ConnectorType> = {
  SMA: {
    id: "SMA",
    label: "SMA",
    kind: "rf",
    frequencyRange: "DC – 18 GHz",
    description: "The workhorse RF connector throughout the fridge. Threaded coupling nut, 50 ohm, screws down by hand or with a torque wrench.",
  },
  K: {
    id: "K",
    label: "K-connector",
    kind: "rf",
    frequencyRange: "DC – 40 GHz",
    description: "SMA-compatible but rated to higher frequency with a tighter mechanical tolerance. Used where bandwidth beyond 18 GHz matters.",
  },
  "Nano-D": {
    id: "Nano-D",
    label: "Nano-D",
    kind: "dc",
    description: "High density micro-D style connector for DC and low-frequency bias lines, common on HEMT and JPA bias breakouts.",
  },
  MMPX: {
    id: "MMPX",
    label: "MMPX",
    kind: "rf",
    frequencyRange: "DC – 65 GHz",
    description: "Snap-on micro-miniature push-on connector used for very dense, high-frequency wiring where SMA nuts don't fit.",
  },
}

export const CONNECTOR_LIST: ConnectorType[] = Object.values(CONNECTORS)

export const PORT_DIRECTION_ARROW: Record<string, string> = {
  in: "\u2192",
  out: "\u2190",
  bidirectional: "\u2194",
}
