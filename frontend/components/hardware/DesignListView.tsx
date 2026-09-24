"use client"

import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getComponent } from "@/lib/hardware/components"
import { LINES } from "@/lib/hardware/lines"
import { useHardware } from "@/store/use-hardware"

export function DesignListView() {
  const design = useHardware((s) => s.design)
  const selectedPlacedId = useHardware((s) => s.selectedPlacedId)
  const selectedRouteId = useHardware((s) => s.selectedRouteId)
  const select = useHardware((s) => s.select)
  const selectRoute = useHardware((s) => s.selectRoute)
  const removeComponent = useHardware((s) => s.removeComponent)
  const removeRoute = useHardware((s) => s.removeRoute)

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Stages ({design.stages.length})</h3>
        <div className="space-y-1">
          {design.stages.map((stage) => (
            <div key={stage.id} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5">
              <span className="flex items-center gap-2 text-xs text-white">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.label}
              </span>
              <span className="text-[11px] text-white/40">{stage.temperatureLabel}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Placed components ({design.placed.length})</h3>
        {design.placed.length === 0 && <p className="text-xs text-white/40">No components placed yet.</p>}
        <div className="space-y-1">
          {design.placed.map((p) => {
            const def = getComponent(p.componentId)
            const stage = design.stages.find((s) => s.id === p.stageId)
            return (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left",
                  selectedPlacedId === p.id ? "border-orange-400/40 bg-orange-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                )}
              >
                <span className="text-xs text-white">{def?.name ?? p.componentId}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] text-white/40">{stage?.label ?? p.stageId}</span>
                  <Trash2
                    className="h-3 w-3 text-white/30 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeComponent(p.id)
                    }}
                  />
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">Routes ({design.routes.length})</h3>
        {design.routes.length === 0 && <p className="text-xs text-white/40">No routes drawn yet.</p>}
        <div className="space-y-1">
          {design.routes.map((r) => {
            const line = LINES[r.lineType]
            const fromDef = getComponent(design.placed.find((p) => p.id === r.fromPlacedId)?.componentId ?? "")
            const toDef = getComponent(design.placed.find((p) => p.id === r.toPlacedId)?.componentId ?? "")
            return (
              <button
                key={r.id}
                onClick={() => selectRoute(r.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left",
                  selectedRouteId === r.id ? "border-orange-400/40 bg-orange-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                )}
              >
                <span className="flex items-center gap-2 text-xs text-white">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line?.color }} />
                  {fromDef?.name ?? "?"} → {toDef?.name ?? "?"}
                </span>
                <Trash2
                  className="h-3 w-3 text-white/30 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeRoute(r.id)
                  }}
                />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
