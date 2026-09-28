"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { PageHeader } from "@/components/shared/ui/PageHeader"
import { GlassCard } from "@/components/shared/ui/GlassCard"
import { WiringCanvas } from "@/components/hardware/WiringCanvas"
import { CatalogPalette } from "@/components/hardware/CatalogPalette"
import { InspectorPanel } from "@/components/hardware/InspectorPanel"
import { DiagnosticsPanel } from "@/components/hardware/DiagnosticsPanel"
import { StudioToolbar } from "@/components/hardware/StudioToolbar"
import { DesignListView } from "@/components/hardware/DesignListView"
import type { LineTypeId } from "@/lib/hardware/types"
import { LINE_LIST } from "@/lib/hardware/lines"
import { getPreset } from "@/lib/hardware/presets"
import { useHardware } from "@/store/use-hardware"

const CryostatScene = dynamic(() => import("@/components/hardware/three/CryostatScene").then((module) => module.CryostatScene), { ssr: false })

export default function HardwareStudioPage() {
  const [armedComponentId, setArmedComponentId] = useState<string | null>(null)
  const [activeLineType, setActiveLineType] = useState<LineTypeId>("xy")
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const view = useHardware((s) => s.view)
  const design = useHardware((s) => s.design)
  const hiddenLines = useHardware((s) => s.hiddenLines)
  const selectedPlacedId = useHardware((s) => s.selectedPlacedId)
  const loadDesign = useHardware((s) => s.loadDesign)

  useEffect(() => {
    const url = new URL(window.location.href)
    const lessonPath = url.searchParams.get("returnTo")
    if (lessonPath?.startsWith("/curriculum/") && !lessonPath.startsWith("//")) setReturnTo(lessonPath)
    const preset = getPreset(url.searchParams.get("preset") ?? "")
    if (!preset) return
    void Promise.resolve(useHardware.persist.rehydrate()).then(() => {
      loadDesign(preset.design)
      url.searchParams.delete("preset")
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`)
    })
  }, [loadDesign])

  return (
    <AppShell variant="hardware">
      <PageHeader
        eyebrow="Hardware Studio"
        title="Builder Studio"
        description="Assemble a dilution refrigerator wiring diagram, stage by stage. Pick a component, click a stage band to place it, then click two ports to route a line."
      />

      {returnTo && <Link href={returnTo} className="mb-4 inline-flex rounded-lg border border-white/15 px-3 py-2 text-sm text-[#00D4FF] hover:border-[#00D4FF]/40">← Back to lesson</Link>}

      <div className="mb-4">
        <StudioToolbar />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
        <GlassCard interactive={false} className="min-w-0 lg:h-[640px]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Component catalog</p>
          <div className="h-[260px] lg:h-full lg:max-h-[560px]">
            <CatalogPalette armedComponentId={armedComponentId} onArm={setArmedComponentId} />
          </div>
        </GlassCard>

        <GlassCard interactive={false} className="min-w-0 lg:h-[640px]">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label htmlFor="hardware-line-type" className="text-xs font-medium text-white/60">New route signal</label>
            <select id="hardware-line-type" value={activeLineType} onChange={(event) => setActiveLineType(event.target.value as LineTypeId)} className="rounded-md border border-white/15 bg-[#10141F] px-2 py-1.5 text-xs text-white">
              {LINE_LIST.map((line) => <option key={line.id} value={line.id}>{line.label}</option>)}
            </select>
          </div>
          {view === "diagram" && (
            <div className="h-[380px] lg:h-[550px]">
              <WiringCanvas armedComponentId={armedComponentId} onPlaced={() => setArmedComponentId(null)} activeLineType={activeLineType} />
            </div>
          )}
          {view === "3d" && (
            <div className="relative h-[380px] overflow-hidden rounded-xl border border-white/10 lg:h-[550px]">
              <CryostatScene design={design} hiddenLines={hiddenLines} selectedPlacedId={selectedPlacedId} className="h-full w-full" />
              {design.placed.length === 0 && <p className="pointer-events-none absolute left-3 top-3 max-w-[240px] rounded-md border border-white/15 bg-[#10141F]/90 p-3 text-xs text-white/70">No components placed yet. Use the catalog or list view to add one.</p>}
              <button type="button" onClick={() => useHardware.getState().setView("diagram")} className="absolute bottom-3 left-3 rounded-md border border-white/20 bg-[#10141F]/90 px-3 py-2 text-xs text-white">Open diagram view</button>
            </div>
          )}
          {view === "list" && (
            <div className="h-[380px] overflow-y-auto lg:h-[550px]">
              <DesignListView />
            </div>
          )}
        </GlassCard>

        <div className="flex min-w-0 flex-col gap-4 lg:h-[640px]">
          <GlassCard interactive={false} className="min-h-[200px] lg:h-[280px]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Inspector</p>
            <div className="max-h-[220px] overflow-y-auto">
              <InspectorPanel />
            </div>
          </GlassCard>
          <GlassCard interactive={false} className="min-h-[300px] flex-1">
            <div className="h-[300px] lg:h-full lg:max-h-[320px]">
              <DiagnosticsPanel />
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  )
}
