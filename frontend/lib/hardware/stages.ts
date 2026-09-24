import type { Stage } from "./types"

export const BASE_STAGE_ORDER = ["300K", "50K", "4K", "Still", "CP", "MXC"] as const

export const STAGES: Record<string, Stage> = {
  "300K": {
    id: "300K",
    label: "300K Stage",
    temperatureK: 300,
    temperatureLabel: "300 K",
    color: "#3B82F6",
    plateDiameterMm: 620,
    plateThicknessMm: 16,
    material: "Stainless steel / aluminum flange",
    description: "Room-temperature vacuum-can flange. Hosts feedthroughs and the vacuum seal.",
  },
  "50K": {
    id: "50K",
    label: "50K Stage",
    temperatureK: 50,
    temperatureLabel: "50 K",
    color: "#22C55E",
    plateDiameterMm: 520,
    plateThicknessMm: 14,
    coolingPowerW: 40,
    material: "Gold-plated OFHC copper",
    description: "First pulse-tube stage. Heavy heat lifting: thermal shielding and heat-sinking of looms.",
  },
  "4K": {
    id: "4K",
    label: "4K Stage",
    temperatureK: 4,
    temperatureLabel: "4 K",
    color: "#38BDF8",
    plateDiameterMm: 420,
    plateThicknessMm: 12,
    coolingPowerW: 1.5,
    material: "Gold-plated OFHC copper",
    description: "Second pulse-tube stage. Home of HEMT amplifiers and bulk attenuation.",
  },
  Still: {
    id: "Still",
    label: "Still Plate",
    temperatureK: 0.8,
    temperatureLabel: "800 mK",
    color: "#A3E635",
    plateDiameterMm: 340,
    plateThicknessMm: 10,
    coolingPowerW: 0.03,
    material: "Gold-plated OFHC copper",
    description: "Dilution unit still. Pumps off 3He vapor; modest continuous cooling power.",
  },
  CP: {
    id: "CP",
    label: "Cold Plate",
    temperatureK: 0.1,
    temperatureLabel: "100 mK",
    color: "#FACC15",
    plateDiameterMm: 260,
    plateThicknessMm: 8,
    coolingPowerW: 0.0002,
    material: "Gold-plated OFHC copper",
    description: "Intermediate cold plate between still and mixing chamber. Tight thermal budget.",
  },
  MXC: {
    id: "MXC",
    label: "Mixing Chamber",
    temperatureK: 0.02,
    temperatureLabel: "20 mK",
    color: "#F97316",
    plateDiameterMm: 200,
    plateThicknessMm: 6,
    coolingPowerW: 0.00002,
    material: "Gold-plated OFHC copper",
    description: "Coldest stage. Houses the qubit sample. Cooling power is vanishingly small — every microwatt counts.",
  },
}

export const STAGE_LIST: Stage[] = BASE_STAGE_ORDER.map((id) => STAGES[id])

export const MAX_STAGES = 7
export const COOLING_POWER_NOTE = "Educational estimates, not vendor specifications."

export function stageIndex(stages: Stage[], stageId: string): number {
  return stages.findIndex((s) => s.id === stageId)
}

export function nextAllowedStages(current: Stage[]): Stage[] {
  if (current.length >= MAX_STAGES) return []
  const usedIds = new Set(current.map((s) => s.id))
  const lastBaseIndex = current.reduce((max, s) => {
    const idx = BASE_STAGE_ORDER.indexOf(s.id as (typeof BASE_STAGE_ORDER)[number])
    return idx > max ? idx : max
  }, -1)
  const remaining = BASE_STAGE_ORDER.filter((id) => !usedIds.has(id) && BASE_STAGE_ORDER.indexOf(id) > lastBaseIndex || (!usedIds.has(id) && lastBaseIndex === -1))
  return remaining.map((id) => STAGES[id])
}

export function createCustomStage(params: { id: string; name: string; temperatureK: number; color: string }): Stage {
  return {
    id: params.id,
    label: params.name,
    temperatureK: params.temperatureK,
    temperatureLabel: params.temperatureK >= 1 ? `${params.temperatureK} K` : `${Math.round(params.temperatureK * 1000)} mK`,
    color: params.color,
    plateDiameterMm: 300,
    plateThicknessMm: 10,
    coolingPowerW: 0.001,
    material: "Gold-plated OFHC copper",
    description: "Custom stage added in the builder.",
    custom: true,
  }
}
