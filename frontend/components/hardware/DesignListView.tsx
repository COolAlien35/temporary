"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { COMPONENTS, getComponent } from "@/lib/hardware/components"
import { LINES, LINE_LIST } from "@/lib/hardware/lines"
import type { LineTypeId } from "@/lib/hardware/types"
import { useHardware } from "@/store/use-hardware"

export function DesignListView() {
  const design = useHardware((s) => s.design)
  const selectedPlacedId = useHardware((s) => s.selectedPlacedId)
  const selectedRouteId = useHardware((s) => s.selectedRouteId)
  const select = useHardware((s) => s.select)
  const selectRoute = useHardware((s) => s.selectRoute)
  const removeComponent = useHardware((s) => s.removeComponent)
  const removeRoute = useHardware((s) => s.removeRoute)
  const placeComponent = useHardware((s) => s.placeComponent)
  const beginRoute = useHardware((s) => s.beginRoute)
  const completeRoute = useHardware((s) => s.completeRoute)
  const [componentId, setComponentId] = useState(COMPONENTS[0].id)
  const [stageId, setStageId] = useState("")
  const [fromId, setFromId] = useState("")
  const [fromPortId, setFromPortId] = useState("")
  const [toId, setToId] = useState("")
  const [toPortId, setToPortId] = useState("")
  const [lineType, setLineType] = useState<LineTypeId>("xy")
  const from = design.placed.find((p) => p.id === fromId)
  const to = design.placed.find((p) => p.id === toId)
  const fromPorts = getComponent(from?.componentId ?? "")?.ports.filter((p) => p.direction !== "in") ?? []
  const toPorts = getComponent(to?.componentId ?? "")?.ports.filter((p) => p.direction !== "out") ?? []
  const sourcePort = fromPorts.find((p) => p.id === fromPortId) ?? fromPorts[0]
  const destinationPort = toPorts.find((p) => p.id === toPortId) ?? toPorts[0]
  const portInUse = (placedId: string, portId: string) => design.routes.some((route) =>
    (route.fromPlacedId === placedId && route.fromPort === portId) ||
    (route.toPlacedId === placedId && route.toPort === portId),
  )
  const sourceAvailable = !from || !sourcePort || sourcePort.allowMultipleConnections || !portInUse(from.id, sourcePort.id)
  const destinationAvailable = !to || !destinationPort || destinationPort.allowMultipleConnections || !portInUse(to.id, destinationPort.id)
  const canConnect = from && to && from.id !== to.id && sourcePort && destinationPort && sourceAvailable && destinationAvailable

  return (
    <div className="space-y-5 text-sm">
      <section className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Place a component</h3>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Component to place" value={componentId} onChange={(e) => setComponentId(e.target.value)} className="min-w-0 flex-1 rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white">{COMPONENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select aria-label="Stage to place on" value={stageId || design.stages[0]?.id || ""} onChange={(e) => setStageId(e.target.value)} className="rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white">{design.stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select>
          <button type="button" onClick={() => {
            const chosenStage = stageId || design.stages[0].id
            const count = design.placed.filter((item) => item.stageId === chosenStage).length
            placeComponent(componentId, chosenStage, { x: 0.2 + (count % 4) * 0.2, y: Math.floor(count / 4) % 2 === 0 ? -16 : 24 })
          }} className="rounded-md border border-[#00D4FF]/40 px-3 py-2 text-xs text-[#00D4FF]">Place</button>
        </div>
      </section>
      <section className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Connect ports</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <select aria-label="From component" value={fromId} onChange={(e) => { setFromId(e.target.value); setFromPortId("") }} className="min-w-0 rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white"><option value="">From component</option>{design.placed.map((p) => <option key={p.id} value={p.id}>{getComponent(p.componentId)?.name} · {p.id}</option>)}</select>
          <select aria-label="From port" value={sourcePort?.id ?? ""} onChange={(e) => setFromPortId(e.target.value)} className="min-w-0 rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white"><option value="">From port</option>{fromPorts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select aria-label="To component" value={toId} onChange={(e) => { setToId(e.target.value); setToPortId("") }} className="min-w-0 rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white"><option value="">To component</option>{design.placed.map((p) => <option key={p.id} value={p.id}>{getComponent(p.componentId)?.name} · {p.id}</option>)}</select>
          <select aria-label="To port" value={destinationPort?.id ?? ""} onChange={(e) => setToPortId(e.target.value)} className="min-w-0 rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white"><option value="">To port</option>{toPorts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Route signal type" value={lineType} onChange={(e) => setLineType(e.target.value as LineTypeId)} className="rounded-md border border-white/15 bg-[#10141F] p-2 text-xs text-white">{LINE_LIST.map((line) => <option key={line.id} value={line.id}>{line.label}</option>)}</select>
          <button type="button" disabled={!canConnect} onClick={() => { if (from && to && sourcePort && destinationPort) { beginRoute(from.id, sourcePort.id, lineType); completeRoute(to.id, destinationPort.id) } }} className="rounded-md border border-[#00D4FF]/40 px-3 py-2 text-xs text-[#00D4FF] disabled:opacity-40">Connect</button>
        </div>
        {from && to && !canConnect && <p className="text-xs text-amber-300">Choose different components and unused output/input ports. A port with a wire cannot be reused.</p>}
      </section>
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
