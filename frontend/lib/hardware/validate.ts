import { COMPONENT_MAP } from "./components"
import { LINES } from "./lines"
import { RULE_MAP } from "./rules"
import type { Design, Issue } from "./types"

const BASE_ORDER = ["300K", "50K", "4K", "Still", "CP", "MXC"]

function stageTemp(design: Design, stageId: string): number {
  return design.stages.find((s) => s.id === stageId)?.temperatureK ?? 300
}

export function validateDesign(design: Design): Issue[] {
  const issues: Issue[] = []
  const placedMap = Object.fromEntries(design.placed.map((p) => [p.id, p]))

  // 1. Stage order
  for (let i = 1; i < design.stages.length; i++) {
    if (design.stages[i].temperatureK >= design.stages[i - 1].temperatureK) {
      issues.push({
        ruleId: "stage-order",
        severity: "error",
        title: RULE_MAP["stage-order"].title,
        message: `"${design.stages[i].label}" is not colder than "${design.stages[i - 1].label}".`,
        targetType: "stage",
        targetId: design.stages[i].id,
      })
    }
  }

  // 2. Stage compatibility
  for (const p of design.placed) {
    const def = COMPONENT_MAP[p.componentId]
    if (!def) continue
    const compat = def.compatibleStages.find((c) => c.stageId === p.stageId)
    if (!compat) {
      issues.push({
        ruleId: "stage-compat",
        severity: "error",
        title: RULE_MAP["stage-compat"].title,
        message: `${def.name} is placed on ${p.stageId}, which isn't in its compatible stage list.`,
        targetType: "component",
        targetId: p.id,
      })
    }
  }

  // 3 & 4. Port direction + line compatibility, per route
  for (const r of design.routes) {
    const from = placedMap[r.fromPlacedId]
    const to = placedMap[r.toPlacedId]
    if (!from || !to) continue
    const fromDef = COMPONENT_MAP[from.componentId]
    const toDef = COMPONENT_MAP[to.componentId]
    if (!fromDef || !toDef) continue
    const fromPort = fromDef.ports.find((p) => p.id === r.fromPort)
    const toPort = toDef.ports.find((p) => p.id === r.toPort)
    if (fromPort && toPort) {
      const validDirection = fromPort.direction !== "in" && toPort.direction !== "out"
      if (!validDirection) {
        issues.push({
          ruleId: "port-direction",
          severity: "error",
          title: RULE_MAP["port-direction"].title,
          message: `Route from ${fromDef.name}.${fromPort.name} to ${toDef.name}.${toPort.name} does not respect signal direction.`,
          targetType: "route",
          targetId: r.id,
        })
      }
    }
    if (!fromDef.compatibleLines.includes(r.lineType) || !toDef.compatibleLines.includes(r.lineType)) {
      issues.push({
        ruleId: "line-compat",
        severity: "error",
        title: RULE_MAP["line-compat"].title,
        message: `${LINES[r.lineType].label} route between ${fromDef.name} and ${toDef.name} isn't supported by both endpoints.`,
        targetType: "route",
        targetId: r.id,
      })
    }
  }

  // 5. HEMT required for readout-out
  const readoutOutRoutes = design.routes.filter((r) => r.lineType === "readout-out")
  if (readoutOutRoutes.length > 0) {
    const hasHemtAt4K = design.placed.some((p) => p.componentId === "hemt" && p.stageId === "4K")
    if (!hasHemtAt4K) {
      issues.push({
        ruleId: "hemt-required",
        severity: "error",
        title: RULE_MAP["hemt-required"].title,
        message: "No HEMT amplifier found on the 4K stage for the readout-out chain.",
        targetType: "design",
      })
    }
  }

  // 6. Attenuation budget for xy / flux / readout-in
  for (const lineType of ["xy", "flux", "readout-in"] as const) {
    const routesOfType = design.routes.filter((r) => r.lineType === lineType)
    if (routesOfType.length === 0) continue
    const total = routesOfType.reduce((sum, r) => sum + r.attenuationDb, 0)
    const budget = LINES[lineType].totalAttenuationDb
    if (total < budget * 0.6) {
      issues.push({
        ruleId: "atten-budget",
        severity: "warning",
        title: RULE_MAP["atten-budget"].title,
        message: `${LINES[lineType].label} totals ${total.toFixed(0)} dB, well under the ${budget} dB reference budget.`,
        targetType: "design",
      })
    }
  }

  // 8. DC filtering
  const dcRoutes = design.routes.filter((r) => r.lineType === "dc-bias")
  if (dcRoutes.length > 0) {
    const hasFilter = design.placed.some((p) => p.componentId === "dc-filter")
    if (!hasFilter) {
      issues.push({
        ruleId: "dc-filtering",
        severity: "warning",
        title: RULE_MAP["dc-filtering"].title,
        message: "No Cryo Low-Noise DC Filter found on any DC Bias route.",
        targetType: "design",
      })
    }
  }

  // 10. Orphan components
  const connectedIds = new Set<string>()
  for (const r of design.routes) {
    connectedIds.add(r.fromPlacedId)
    connectedIds.add(r.toPlacedId)
  }
  for (const p of design.placed) {
    if (!connectedIds.has(p.id)) {
      const def = COMPONENT_MAP[p.componentId]
      issues.push({
        ruleId: "no-orphans",
        severity: "info",
        title: RULE_MAP["no-orphans"].title,
        message: `${def?.name ?? p.componentId} has no routes connected.`,
        targetType: "component",
        targetId: p.id,
      })
    }
  }

  return issues
}

export function orderStageIds(): string[] {
  return BASE_ORDER
}
