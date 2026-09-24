// Maps each component's `model.shape` to the local-space (mm) anchor for every port,
// derived from the component's own dimensionsMm so anchors always match the rendered bbox.
import { COMPONENT_MAP } from "@/lib/hardware/components"
import type { PortAnchor3D } from "./types"

function dims(id: string) {
  const d = COMPONENT_MAP[id]?.dimensionsMm ?? { x: 10, y: 10, z: 10 }
  return d
}

const N = (x: number, y: number, z: number): [number, number, number] => {
  const len = Math.hypot(x, y, z) || 1
  return [x / len, y / len, z / len]
}

export const PORT_ANCHORS: Record<string, PortAnchor3D[]> = {
  attenuator: (() => {
    const d = dims("attenuator")
    return [
      { id: "in", position: [0, -d.y / 2, 0], direction: [0, -1, 0] },
      { id: "out", position: [0, d.y / 2, 0], direction: [0, 1, 0] },
    ]
  })(),
  "lowpass-filter": (() => {
    const d = dims("lowpass-filter")
    return [
      { id: "in", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "out", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
    ]
  })(),
  circulator: (() => {
    const d = dims("circulator")
    const r = Math.min(d.x, d.z) * 0.42
    const angles = [90, 210, 330].map((deg) => (deg * Math.PI) / 180)
    const ids = ["p1", "p2", "p3"]
    return ids.map((id, i) => {
      const a = angles[i]
      const pos: [number, number, number] = [r * Math.cos(a), 0, r * Math.sin(a)]
      return { id, position: pos, direction: N(pos[0], 0, pos[2]) }
    })
  })(),
  hemt: (() => {
    const d = dims("hemt")
    return [
      { id: "rfin", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "rfout", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
      { id: "dc", position: [0, d.y / 2, 0], direction: [0, 1, 0] },
    ]
  })(),
  thermometer: (() => {
    const d = dims("thermometer")
    return [
      { id: "sp", position: [-d.x / 4, -d.y / 2, 0], direction: [0, -1, 0] },
      { id: "sn", position: [d.x / 4, -d.y / 2, 0], direction: [0, -1, 0] },
    ]
  })(),
  connector: (() => {
    const d = dims("connector")
    return [{ id: "port", position: [0, d.y / 2, 0], direction: [0, 1, 0] }]
  })(),
  "bias-tee": (() => {
    const d = dims("bias-tee")
    return [
      { id: "rf", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "out", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
      { id: "dc", position: [0, d.y / 2, 0], direction: [0, 1, 0] },
    ]
  })(),
  isolator: (() => {
    const d = dims("isolator")
    return [
      { id: "in", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "out", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
    ]
  })(),
  "directional-coupler": (() => {
    const d = dims("directional-coupler")
    return [
      { id: "in", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "out", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
      { id: "coupled", position: [0, 0, d.z / 2], direction: [0, 0, 1] },
    ]
  })(),
  "ir-filter": (() => {
    const d = dims("ir-filter")
    return [
      { id: "in", position: [0, 0, -d.z / 2], direction: [0, 0, -1] },
      { id: "out", position: [0, 0, d.z / 2], direction: [0, 0, 1] },
    ]
  })(),
  "parametric-amp": (() => {
    const d = dims("parametric-amp")
    return [
      { id: "sigin", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "sigout", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
      { id: "pump", position: [0, 0, d.z / 2], direction: [0, 0, 1] },
    ]
  })(),
  "feedthrough-panel": (() => {
    const d = dims("feedthrough-panel")
    return [
      { id: "grid", position: [-d.x / 4, d.y / 2, 0], direction: [0, 1, 0] },
      { id: "dcgrid", position: [d.x / 4, d.y / 2, 0], direction: [0, 1, 0] },
    ]
  })(),
  "dc-filter": (() => {
    const d = dims("dc-filter")
    return [
      { id: "in", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "out", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
    ]
  })(),
  "sample-holder": (() => {
    const d = dims("sample-holder")
    return [
      { id: "xy", position: [-d.x / 2, 0, 0], direction: [-1, 0, 0] },
      { id: "flux", position: [0, 0, d.z / 2], direction: [0, 0, 1] },
      { id: "roin", position: [0, 0, -d.z / 2], direction: [0, 0, -1] },
      { id: "roout", position: [d.x / 2, 0, 0], direction: [1, 0, 0] },
    ]
  })(),
}

export function getPortAnchors(shape: string): PortAnchor3D[] {
  return PORT_ANCHORS[shape] ?? []
}

export function getPortAnchor(shape: string, portId: string): PortAnchor3D | undefined {
  return getPortAnchors(shape).find((p) => p.id === portId)
}
