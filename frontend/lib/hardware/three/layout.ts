// Maps a 2D Design (stages + placed components + routes) onto 3D world-space
// transforms for the CryostatScene. All units are millimeters.
import { getComponent } from "@/lib/hardware/components"
import { getPortAnchor } from "./registry"
import type { Design, PlacedComponent, Stage } from "@/lib/hardware/types"

export const STAGE_SPACING_MM = 130

export interface PlateLayout {
  stageId: string
  y: number
  radius: number
  thickness: number
}

/** Stacks stages top-to-bottom in array order (index 0 = warmest/top). */
export function getPlateLayouts(stages: Stage[]): PlateLayout[] {
  const topY = ((stages.length - 1) * STAGE_SPACING_MM) / 2
  return stages.map((s, i) => ({
    stageId: s.id,
    y: topY - i * STAGE_SPACING_MM,
    radius: s.plateDiameterMm / 2,
    thickness: s.plateThicknessMm,
  }))
}

export interface PlacedTransform {
  position: [number, number, number]
  rotationY: number
}

/** Deterministically spreads placed components around their stage's plate. */
export function getPlacedTransform(placed: PlacedComponent, plate: PlateLayout): PlacedTransform {
  const fracX = placed.position.x ?? 0.5
  const angle = fracX * Math.PI * 2
  const radiusJitter = (placed.position.y ?? 0) / 24
  const radius = plate.radius * (0.55 + radiusJitter * 0.15)
  const def = getComponent(placed.componentId)
  const liftY = def ? def.dimensionsMm.y / 2 : 0
  return {
    position: [Math.cos(angle) * radius, plate.y + plate.thickness / 2 + liftY, Math.sin(angle) * radius],
    rotationY: (placed.rotationDeg * Math.PI) / 180 + (-angle + Math.PI / 2),
  }
}

/** World-space position of a specific port on a placed component. */
export function getPortWorldPosition(
  placed: PlacedComponent,
  portId: string,
  transform: PlacedTransform,
): [number, number, number] | undefined {
  const def = getComponent(placed.componentId)
  if (!def) return undefined
  const anchor = getPortAnchor(def.model.shape, portId)
  if (!anchor) return undefined
  const [lx, ly, lz] = anchor.position
  const cos = Math.cos(transform.rotationY)
  const sin = Math.sin(transform.rotationY)
  const wx = lx * cos + lz * sin
  const wz = -lx * sin + lz * cos
  return [transform.position[0] + wx, transform.position[1] + ly, transform.position[2] + wz]
}

export function buildTransformMap(design: Design): Map<string, PlacedTransform> {
  const plates = new Map(getPlateLayouts(design.stages).map((p) => [p.stageId, p]))
  const map = new Map<string, PlacedTransform>()
  design.placed.forEach((p) => {
    const plate = plates.get(p.stageId)
    if (!plate) return
    map.set(p.id, getPlacedTransform(p, plate))
  })
  return map
}
