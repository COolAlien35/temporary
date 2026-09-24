"use client"

import { Trash2 } from "lucide-react"
import { getComponent } from "@/lib/hardware/components"
import { LINES } from "@/lib/hardware/lines"
import { CABLES } from "@/lib/hardware/cables"
import { useHardware } from "@/store/use-hardware"
import { ComponentViewer } from "@/components/hardware/three/ComponentViewer"

export function InspectorPanel() {
  const design = useHardware((s) => s.design)
  const selectedPlacedId = useHardware((s) => s.selectedPlacedId)
  const selectedRouteId = useHardware((s) => s.selectedRouteId)
  const removeComponent = useHardware((s) => s.removeComponent)
  const removeRoute = useHardware((s) => s.removeRoute)
  const select = useHardware((s) => s.select)
  const selectRoute = useHardware((s) => s.selectRoute)

  const placed = selectedPlacedId ? design.placed.find((p) => p.id === selectedPlacedId) : undefined
  const route = selectedRouteId ? design.routes.find((r) => r.id === selectedRouteId) : undefined

  if (placed) {
    const def = getComponent(placed.componentId)
    if (!def) return null
    const stage = design.stages.find((s) => s.id === placed.stageId)
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-white">{def.name}</p>
            <p className="text-xs text-white/50">
              {def.category} · {stage?.label ?? placed.stageId}
            </p>
          </div>
          <button
            onClick={() => {
              removeComponent(placed.id)
              select(null)
            }}
            aria-label={`Remove ${def.name}`}
            className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="h-40 overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <ComponentViewer componentId={def.id} controls className="h-full w-full" />
        </div>
        <p className="text-xs leading-relaxed text-white/60">{def.description}</p>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Key specs</p>
          <div className="space-y-1">
            {def.keySpecs.map((spec) => (
              <div key={spec.label} className="flex justify-between text-xs">
                <span className="text-white/50">{spec.label}</span>
                <span className="text-white">{spec.value}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs">
              <span className="text-white/50">Power dissipation</span>
              <span className="text-white">{def.powerDissipationW * 1000} mW</span>
            </div>
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">Ports</p>
          <div className="space-y-1">
            {def.ports.map((port) => (
              <div key={port.id} className="flex justify-between text-xs">
                <span className="text-white/60">{port.name}</span>
                <span className="text-white/40">
                  {port.direction} · {port.connector}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] italic text-white/30">{def.referenceNote}</p>
      </div>
    )
  }

  if (route) {
    const line = LINES[route.lineType]
    const cable = CABLES[route.cableFamilyId]
    const fromDef = getComponent(design.placed.find((p) => p.id === route.fromPlacedId)?.componentId ?? "")
    const toDef = getComponent(design.placed.find((p) => p.id === route.toPlacedId)?.componentId ?? "")
    return (
      <div className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold" style={{ color: line?.color }}>
              {line?.label ?? route.lineType}
            </p>
            <p className="text-xs text-white/50">
              {fromDef?.name ?? "?"} → {toDef?.name ?? "?"}
            </p>
          </div>
          <button
            onClick={() => {
              removeRoute(route.id)
              selectRoute(null)
            }}
            aria-label="Remove route"
            className="shrink-0 rounded-md p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-white/60">{line?.description}</p>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Cable family</span>
            <span className="text-white">{cable?.label ?? route.cableFamilyId}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Reference attenuation budget</span>
            <span className="text-white">{line?.totalAttenuationDb} dB</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-sm text-white/50">Nothing selected</p>
      <p className="max-w-[220px] text-xs text-white/30">Click a component or a route on the canvas to inspect it here.</p>
    </div>
  )
}
