"use client"

import { useState } from "react"
import { AppShell } from "@/components/shared/AppShell"
import { PageHeader } from "@/components/shared/ui/PageHeader"
import { GlassCard } from "@/components/shared/ui/GlassCard"
import { WiringCanvas } from "@/components/hardware/WiringCanvas"
import { CatalogPalette } from "@/components/hardware/CatalogPalette"
import { InspectorPanel } from "@/components/hardware/InspectorPanel"
import { DiagnosticsPanel } from "@/components/hardware/DiagnosticsPanel"
import { StudioToolbar } from "@/components/hardware/StudioToolbar"
import { DesignListView } from "@/components/hardware/DesignListView"
import { CryostatScene } from "@/components/hardware/three/CryostatScene"
import type { LineTypeId } from "@/lib/hardware/types"
import { useHardware } from "@/store/use-hardware"

export default function HardwareStudioPage() {
  const [armedComponentId, setArmedComponentId] = useState<string | null>(null)
  const [activeLineType] = useState<LineTypeId>("xy")
  const view = useHardware((s) => s.view)
  const design = useHardware((s) => s.design)
  const hiddenLines = useHardware((s) => s.hiddenLines)
  const selectedPlacedId = useHardware((s) => s.selectedPlacedId)

  return (
    <AppShell variant="hardware">
      <PageHeader
        eyebrow="Hardware Studio"
        title="Builder Studio"
        description="Assemble a dilution refrigerator wiring diagram, stage by stage. Pick a component, click a stage band to place it, then click two ports to route a line."
      />

      <div className="mb-4">
        <StudioToolbar />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_300px]">
        <GlassCard interactive={false} className="lg:h-[640px]">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Component catalog</p>
          <div className="h-full max-h-[560px]">
            <CatalogPalette armedComponentId={armedComponentId} onArm={setArmedComponentId} />
          </div>
        </GlassCard>

        <GlassCard interactive={false} className="lg:h-[640px]">
          {view === "diagram" && (
            <div className="h-full max-h-[600px]">
              <WiringCanvas armedComponentId={armedComponentId} onPlaced={() => setArmedComponentId(null)} activeLineType={activeLineType} />
            </div>
          )}
          {view === "3d" && (
            <div className="h-full max-h-[600px] overflow-hidden rounded-xl border border-white/10">
              <CryostatScene design={design} hiddenLines={hiddenLines} selectedPlacedId={selectedPlacedId} className="h-full w-full" />
            </div>
          )}
          {view === "list" && (
            <div className="h-full max-h-[600px] overflow-y-auto">
              <DesignListView />
            </div>
          )}
        </GlassCard>

        <div className="flex flex-col gap-4 lg:h-[640px]">
          <GlassCard interactive={false} className="lg:h-[280px]">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Inspector</p>
            <div className="max-h-[220px] overflow-y-auto">
              <InspectorPanel />
            </div>
          </GlassCard>
          <GlassCard interactive={false} className="min-h-0 flex-1">
            <div className="h-full max-h-[320px]">
              <DiagnosticsPanel />
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  )
}
