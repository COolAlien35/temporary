import { CABLES } from "./cables"
import { COMPONENT_MAP } from "./components"
import type { Design, StageLoad, ThermalResult } from "./types"

const BASE_ORDER = ["300K", "50K", "4K", "Still", "CP", "MXC"]

function stagePairKey(stages: string[], fromIdx: number): string {
  return `${stages[fromIdx]}-${stages[fromIdx + 1]}`
}

export function computeThermal(design: Design): ThermalResult {
  const stageIds = design.stages.map((s) => s.id)
  const loadByStage: Record<string, { passive: number; active: number; attenuator: number }> = {}
  for (const s of stageIds) loadByStage[s] = { passive: 0, active: 0, attenuator: 0 }

  const placedByStage = new Map(design.placed.map((p) => [p.id, p.stageId]))

  // Cable heat leak: attribute to the colder endpoint stage of each route span.
  for (const r of design.routes) {
    const fromStage = placedByStage.get(r.fromPlacedId)
    const toStage = placedByStage.get(r.toPlacedId)
    if (!fromStage || !toStage) continue
    const fromIdx = stageIds.indexOf(fromStage)
    const toIdx = stageIds.indexOf(toStage)
    if (fromIdx === -1 || toIdx === -1) continue
    const colderIdx = Math.max(fromIdx, toIdx)
    const warmerIdx = Math.min(fromIdx, toIdx)
    const cable = CABLES[r.cableFamilyId]
    if (!cable) continue
    // Distribute the run's heat leak across each stage boundary it crosses (in microwatts), landing on the colder side.
    for (let i = warmerIdx; i < colderIdx; i++) {
      const key = stagePairKey(stageIds, i)
      const uw = cable.heatLoadUwPerStage[key] ?? cable.heatLoadUwPerStage[`${stageIds[i]}-${stageIds[i + 1]}`] ?? 0
      const target = stageIds[i + 1]
      loadByStage[target].passive += uw / 1_000_000
    }
  }

  // Component dissipation: attributed directly to the stage it's placed on.
  for (const p of design.placed) {
    const def = COMPONENT_MAP[p.componentId]
    if (!def) continue
    const bucket = loadByStage[p.stageId]
    if (!bucket) continue
    if (def.id === "attenuator") bucket.attenuator += def.powerDissipationW
    else bucket.active += def.powerDissipationW
  }

  const stageLoads: StageLoad[] = design.stages.map((s) => {
    const l = loadByStage[s.id] ?? { passive: 0, active: 0, attenuator: 0 }
    const total = l.passive + l.active + l.attenuator
    const utilization = s.coolingPowerW ? total / s.coolingPowerW : 0
    const status: StageLoad["status"] = !s.coolingPowerW ? "unlimited" : utilization > 1 ? "critical" : utilization > 0.7 ? "warning" : "ok"
    return {
      stageId: s.id,
      coolingPowerW: s.coolingPowerW,
      passiveCableLoadW: l.passive,
      activeDissipationW: l.active,
      attenuatorDissipationW: l.attenuator,
      totalW: total,
      utilization,
      status,
    }
  })

  const contributors: { label: string; watts: number }[] = []
  for (const p of design.placed) {
    const def = COMPONENT_MAP[p.componentId]
    if (!def || def.powerDissipationW <= 0) continue
    contributors.push({ label: `${def.name} @ ${p.stageId}`, watts: def.powerDissipationW })
  }
  contributors.sort((a, b) => b.watts - a.watts)

  return { stageLoads, topContributors: contributors.slice(0, 5), computedAt: Date.now() }
}

export { BASE_ORDER as THERMAL_STAGE_ORDER }
