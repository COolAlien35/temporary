import type { Design } from "./types"
import { getComponent } from "./components"

const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
const text = (value: unknown, max = 120): value is string => typeof value === "string" && value.length > 0 && value.length <= max
const number = (value: unknown, min = -10000, max = 10000): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max

function validDesign(value: unknown): value is Design {
  const design = object(value)
  const meta = object(design?.meta)
  if (!design || !meta || !text(meta.name) || !number(meta.qubits, 1, 1000) || !Number.isInteger(meta.qubits) || !number(meta.createdAt, 0, 1e15) || !number(meta.updatedAt, 0, 1e15)) return false
  if (!Array.isArray(design.stages) || design.stages.length < 1 || design.stages.length > 16 || !Array.isArray(design.placed) || design.placed.length > 128 || !Array.isArray(design.routes) || design.routes.length > 256) return false
  const stages = new Set<string>()
  for (const value of design.stages) {
    const stage = object(value)
    if (!stage || !text(stage.id, 64) || stages.has(stage.id) || !text(stage.label) || !text(stage.temperatureLabel) || !number(stage.temperatureK, 0, 1000) || !text(stage.color) || !/^#[0-9a-fA-F]{6}$/.test(stage.color) || !number(stage.plateDiameterMm, 0.01) || !number(stage.plateThicknessMm, 0.01, 1000) || !text(stage.material) || typeof stage.description !== "string" || stage.description.length > 2000 || (stage.coolingPowerW !== undefined && !number(stage.coolingPowerW, 0, 100000))) return false
    stages.add(stage.id)
  }
  const placed = new Map<string, NonNullable<ReturnType<typeof getComponent>>>()
  for (const value of design.placed) {
    const item = object(value)
    const position = object(item?.position)
    const component = typeof item?.componentId === "string" ? getComponent(item.componentId) : undefined
    if (!item || !text(item.id, 64) || placed.has(item.id) || typeof item.stageId !== "string" || !stages.has(item.stageId) || !component || !position || !number(position.x) || !number(position.y) || !number(item.rotationDeg)) return false
    placed.set(item.id, component)
  }
  const routes = new Set<string>()
  const occupied = new Set<string>()
  for (const value of design.routes) {
    const route = object(value)
    if (!route || !text(route.id, 64) || routes.has(route.id) || !["xy", "flux", "readout-in", "readout-out", "dc-bias"].includes(String(route.lineType)) || !["ss-coax", "nbti-coax", "cu-coax", "twisted-pair"].includes(String(route.cableFamilyId)) || route.fromPlacedId === route.toPlacedId || !number(route.attenuationDb, 0, 1000) || !Array.isArray(route.waypoints) || route.waypoints.length > 64) return false
    for (const [id, portId] of [[route.fromPlacedId, route.fromPort], [route.toPlacedId, route.toPort]]) {
      if (typeof id !== "string" || typeof portId !== "string") return false
      const port = placed.get(id)?.ports.find((port) => port.id === portId)
      if (!port || (occupied.has(`${id}:${portId}`) && !port.allowMultipleConnections)) return false
      occupied.add(`${id}:${portId}`)
    }
    for (const value of route.waypoints) {
      const waypoint = object(value)
      if (!waypoint || !number(waypoint.x) || !number(waypoint.y) || typeof waypoint.stageId !== "string" || !stages.has(waypoint.stageId)) return false
    }
    routes.add(route.id)
  }
  return true
}

/**
 * Simple base64url JSON codec for sharing a design via URL hash.
 * Not compressed — fine for designs up to a few dozen components/routes,
 * which covers everything the builder produces.
 */
export function encodeDesign(design: Design): string {
  const json = JSON.stringify(design)
  const base64 = typeof window === "undefined" ? Buffer.from(json, "utf-8").toString("base64") : btoa(unescape(encodeURIComponent(json)))
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function decodeDesign(encoded: string): Design | null {
  try {
    if (encoded.length > 90000) return null
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const json = typeof window === "undefined" ? Buffer.from(padded, "base64").toString("utf-8") : decodeURIComponent(escape(atob(padded)))
    if (new TextEncoder().encode(json).length > 65536) return null
    const parsed: unknown = JSON.parse(json)
    return validDesign(parsed) ? parsed : null
  } catch {
    return null
  }
}
