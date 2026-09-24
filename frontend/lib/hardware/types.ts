// Core domain types for the Hardware Studio (cryostat wiring design tool).
// Strict, no `any`. Everything here is deterministic — no Math.random at render.

export type StageId = "300K" | "50K" | "4K" | "Still" | "CP" | "MXC" | string

export interface Stage {
  id: StageId
  label: string
  temperatureK: number
  /** Human-readable temperature, e.g. "800 mK" or "20 mK" */
  temperatureLabel: string
  color: string
  plateDiameterMm: number
  plateThicknessMm: number
  /** Approximate cooling power budget in watts. Undefined = unlimited (300K). */
  coolingPowerW?: number
  material: string
  description: string
  custom?: boolean
}

export type LineTypeId = "xy" | "flux" | "readout-in" | "readout-out" | "dc-bias"

export interface AttenuationStep {
  stageId: StageId
  db: number
}

export interface LineType {
  id: LineTypeId
  label: string
  color: string
  description: string
  cableFamilyId: string
  /** Typical attenuation budget applied at each stage, in dB. */
  attenuationBudget: AttenuationStep[]
  totalAttenuationDb: number
}

export type CableFamilyId = "ss-coax" | "nbti-coax" | "cu-coax" | "twisted-pair"

export interface CableFamily {
  id: CableFamilyId
  label: string
  description: string
  diameterMm: number
  thermalConductivityClass: "low" | "medium" | "high"
  /** Approximate heat load in microwatts per cable, keyed by "fromStage-toStage" */
  heatLoadUwPerStage: Record<string, number>
  typicalUse: string
}

export type AnchorId = "clamp" | "bulkhead" | "cold-finger"

export interface Anchor {
  id: AnchorId
  label: string
  stages: StageId[]
  description: string
  why: string
}

export type PortDirection = "in" | "out" | "bidirectional"
export type ConnectorTypeId = "SMA" | "K" | "Nano-D" | "MMPX"

export interface ConnectorType {
  id: ConnectorTypeId
  label: string
  kind: "rf" | "dc"
  frequencyRange?: string
  description: string
}

export interface ComponentPort {
  id: string
  name: string
  direction: PortDirection
  connector: ConnectorTypeId
}

export type ComponentCategory = "Passive" | "Active" | "Interface" | "Device" | "Sensor"

export interface StageCompatibility {
  stageId: StageId
  preferred: boolean
}

export interface KeySpec {
  label: string
  value: string
}

export type ModelShape =
  | "attenuator"
  | "lowpass-filter"
  | "circulator"
  | "hemt"
  | "thermometer"
  | "connector"
  | "bias-tee"
  | "isolator"
  | "directional-coupler"
  | "ir-filter"
  | "parametric-amp"
  | "feedthrough-panel"
  | "dc-filter"
  | "sample-holder"

export interface ModelSpec {
  shape: ModelShape
  /** Dominant material finish, used to pick PBR material params */
  finish: "steel" | "gold-copper" | "black-anodized" | "blue-anodized" | "brass" | "ceramic"
}

export interface HardwareComponent {
  id: string
  name: string
  abbreviation: string
  category: ComponentCategory
  description: string
  dimensionsMm: { x: number; y: number; z: number }
  compatibleStages: StageCompatibility[]
  compatibleLines: LineTypeId[]
  ports: ComponentPort[]
  keySpecs: KeySpec[]
  powerDissipationW: number
  massG: number
  model: ModelSpec
  referenceNote: string
}

export type RuleSeverity = "error" | "warning" | "info"

export interface Rule {
  id: string
  title: string
  severity: RuleSeverity
  explanation: string
  howToFix: string
}

export interface Issue {
  ruleId: string
  severity: RuleSeverity
  title: string
  message: string
  targetType: "stage" | "component" | "route" | "design"
  targetId?: string
}

export interface PlacedComponent {
  id: string
  componentId: string
  stageId: StageId
  /** Position in stage-local coordinates, mm, origin at plate center */
  position: { x: number; y: number }
  rotationDeg: number
}

export interface RouteWaypoint {
  x: number
  y: number
  stageId: StageId
}

export interface Route {
  id: string
  lineType: LineTypeId
  fromPlacedId: string
  fromPort: string
  toPlacedId: string
  toPort: string
  waypoints: RouteWaypoint[]
  cableFamilyId: CableFamilyId
  attenuationDb: number
}

export interface DesignMeta {
  name: string
  qubits: number
  createdAt: number
  updatedAt: number
  sourcePresetSlug?: string
}

export interface Design {
  meta: DesignMeta
  stages: Stage[]
  placed: PlacedComponent[]
  routes: Route[]
}

export interface Preset {
  slug: string
  title: string
  description: string
  qubits: number
  design: Design
}

export interface StageLoad {
  stageId: StageId
  coolingPowerW?: number
  passiveCableLoadW: number
  activeDissipationW: number
  attenuatorDissipationW: number
  totalW: number
  utilization: number
  status: "ok" | "warning" | "critical" | "unlimited"
}

export interface ThermalResult {
  stageLoads: StageLoad[]
  topContributors: { label: string; watts: number }[]
  computedAt: number
}

export interface SavedDesign {
  id: string
  design: Design
}
