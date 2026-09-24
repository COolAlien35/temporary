import { STAGE_LIST } from "./stages"
import type { CableFamilyId, Design, LineTypeId, PlacedComponent, Route, Stage } from "./types"
import { LINES } from "./lines"

let counter = 0
function id(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

function polar(stage: Stage, angleDeg: number, radiusFraction: number): { x: number; y: number } {
  const r = (stage.plateDiameterMm / 2) * radiusFraction
  const rad = (angleDeg * Math.PI) / 180
  return { x: Math.round(Math.cos(rad) * r), y: Math.round(Math.sin(rad) * r) }
}

interface ChainStep {
  stageId: string
  componentId: string
  port?: { in: string; out: string }
  angleDeg: number
  radiusFraction: number
}

function place(componentId: string, stageId: string, angleDeg: number, radiusFraction: number): PlacedComponent {
  const stage = STAGE_LIST.find((s) => s.id === stageId)!
  const pos = polar(stage, angleDeg, radiusFraction)
  return { id: id("pc"), componentId, stageId, position: pos, rotationDeg: 0 }
}

function makeRoute(lineType: LineTypeId, from: { placed: PlacedComponent; port: string }, to: { placed: PlacedComponent; port: string }, attenuationDb: number): Route {
  const line = LINES[lineType]
  return {
    id: id("route"),
    lineType,
    fromPlacedId: from.placed.id,
    fromPort: from.port,
    toPlacedId: to.placed.id,
    toPort: to.port,
    waypoints: [],
    cableFamilyId: line.cableFamilyId as CableFamilyId,
    attenuationDb,
  }
}

/**
 * Builds a deterministic, physically-reasonable wiring diagram for `qubits` qubits (1-4).
 * Each qubit gets its own XY / Flux / Readout-In attenuator chain and its own
 * JPA -> Circulator -> Isolator -> HEMT readout-out chain, angularly distributed
 * around each stage plate so multiple qubits don't overlap.
 */
export function generateDesign(qubits: number, name = "Untitled design"): Design {
  const n = Math.max(1, Math.min(4, qubits))
  const stages: Stage[] = STAGE_LIST.map((s) => ({ ...s }))
  const placed: PlacedComponent[] = []
  const routes: Route[] = []

  const panel = place("feedthrough-panel", "300K", 0, 0)
  placed.push(panel)

  for (let i = 0; i < n; i++) {
    const baseAngle = (360 / n) * i

    // --- XY drive chain: panel -> atten(4K) -> atten(Still) -> atten(MXC) -> sample.xy
    const xyAtten4K = place("attenuator", "4K", baseAngle, 0.55)
    const xyAttenStill = place("attenuator", "Still", baseAngle, 0.55)
    const xyAttenMxc = place("attenuator", "MXC", baseAngle - 15, 0.6)
    const sample = place("sample-holder", "MXC", baseAngle, 0.3)
    placed.push(xyAtten4K, xyAttenStill, xyAttenMxc, sample)
    routes.push(
      makeRoute("xy", { placed: panel, port: "grid" }, { placed: xyAtten4K, port: "in" }, 0),
      makeRoute("xy", { placed: xyAtten4K, port: "out" }, { placed: xyAttenStill, port: "in" }, 20),
      makeRoute("xy", { placed: xyAttenStill, port: "out" }, { placed: xyAttenMxc, port: "in" }, 10),
      makeRoute("xy", { placed: xyAttenMxc, port: "out" }, { placed: sample, port: "xy" }, 30),
    )

    // --- Flux chain: panel -> atten(4K) -> lpf(MXC) -> sample.flux
    const fluxAtten4K = place("attenuator", "4K", baseAngle + 40, 0.55)
    const fluxLpf = place("lowpass-filter", "MXC", baseAngle + 40, 0.6)
    placed.push(fluxAtten4K, fluxLpf)
    routes.push(
      makeRoute("flux", { placed: panel, port: "grid" }, { placed: fluxAtten4K, port: "in" }, 0),
      makeRoute("flux", { placed: fluxAtten4K, port: "out" }, { placed: fluxLpf, port: "in" }, 10),
      makeRoute("flux", { placed: fluxLpf, port: "out" }, { placed: sample, port: "flux" }, 10),
    )

    // --- Readout In chain: panel -> atten(4K) -> atten(Still) -> atten(MXC) -> sample.roin
    const roInAtten4K = place("attenuator", "4K", baseAngle - 40, 0.55)
    const roInAttenStill = place("attenuator", "Still", baseAngle - 40, 0.55)
    const roInAttenMxc = place("attenuator", "MXC", baseAngle + 15, 0.6)
    placed.push(roInAtten4K, roInAttenStill, roInAttenMxc)
    routes.push(
      makeRoute("readout-in", { placed: panel, port: "grid" }, { placed: roInAtten4K, port: "in" }, 0),
      makeRoute("readout-in", { placed: roInAtten4K, port: "out" }, { placed: roInAttenStill, port: "in" }, 10),
      makeRoute("readout-in", { placed: roInAttenStill, port: "out" }, { placed: roInAttenMxc, port: "in" }, 10),
      makeRoute("readout-in", { placed: roInAttenMxc, port: "out" }, { placed: sample, port: "roin" }, 20),
    )

    // --- Readout Out chain: sample -> JPA(MXC) -> Circulator(MXC) -> Isolator(CP) -> HEMT(4K) -> panel
    const jpa = place("parametric-amp", "MXC", baseAngle + 70, 0.75)
    const circ = place("circulator", "MXC", baseAngle + 90, 0.8)
    const iso = place("isolator", "CP", baseAngle, 0.6)
    const hemt = place("hemt", "4K", baseAngle, 0.75)
    placed.push(jpa, circ, iso, hemt)
    routes.push(
      makeRoute("readout-out", { placed: sample, port: "roout" }, { placed: jpa, port: "sigin" }, 0),
      makeRoute("readout-out", { placed: jpa, port: "sigout" }, { placed: circ, port: "p1" }, -20),
      makeRoute("readout-out", { placed: circ, port: "p2" }, { placed: iso, port: "in" }, 0),
      makeRoute("readout-out", { placed: iso, port: "out" }, { placed: hemt, port: "rfin" }, 0),
      makeRoute("readout-out", { placed: hemt, port: "rfout" }, { placed: panel, port: "grid" }, -38),
    )
  }

  // Shared thermometry: one thermometer per stage below 300K, wired to DC bias.
  for (const stage of stages) {
    if (stage.id === "300K") continue
    const therm = place("thermometer", stage.id, 180, 0.85)
    placed.push(therm)
    routes.push(makeRoute("dc-bias", { placed: panel, port: "dcgrid" }, { placed: therm, port: "sp" }, 0))
  }

  const now = Date.now()
  return {
    meta: { name, qubits: n, createdAt: now, updatedAt: now },
    stages,
    placed,
    routes,
  }
}

export function emptyDesign(name = "Untitled design"): Design {
  const now = Date.now()
  return {
    meta: { name, qubits: 1, createdAt: now, updatedAt: now },
    stages: STAGE_LIST.map((s) => ({ ...s })),
    placed: [],
    routes: [],
  }
}
