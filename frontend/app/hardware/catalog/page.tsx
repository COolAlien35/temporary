"use client"

import { useMemo, useState } from "react"
import { Check, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/shared/AppShell"
import { PageHeader } from "@/components/shared/ui/PageHeader"
import { GlassCard } from "@/components/shared/ui/GlassCard"
import { Reveal } from "@/components/shared/ui/Reveal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { COMPONENTS } from "@/lib/hardware/components"
import { STAGE_LIST } from "@/lib/hardware/stages"
import { LINES } from "@/lib/hardware/lines"
import { ComponentViewer } from "@/components/hardware/three/ComponentViewer"

const CATEGORY_LIST = Array.from(new Set(COMPONENTS.map((c) => c.category)))

export default function HardwareCatalogPage() {
  const [category, setCategory] = useState<string>("All")

  const filtered = useMemo(
    () => (category === "All" ? COMPONENTS : COMPONENTS.filter((c) => c.category === category)),
    [category],
  )

  return (
    <AppShell variant="hardware">
      <PageHeader
        eyebrow="Hardware Studio"
        title="Component Catalog"
        description="Every attenuator, filter, amplifier, and interface component modeled in the studio, with specs and stage compatibility."
      />

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="mb-6 bg-white/5">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="matrix">Compatibility matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <div className="mb-6 flex flex-wrap gap-2">
            {["All", ...CATEGORY_LIST].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                  category === cat ? "border-[#00D4FF]/40 bg-[#00D4FF]/10 text-[#00D4FF]" : "border-white/10 text-white/60 hover:border-white/20 hover:text-white",
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i, 6) * 0.05}>
                <GlassCard className="h-full">
                  <div className="mb-3 h-40 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    <ComponentViewer componentId={c.id} controls className="h-full w-full" />
                  </div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/50">
                      {c.category}
                    </span>
                    <span className="font-mono text-[11px] text-white/30">{c.abbreviation}</span>
                  </div>
                  <p className="mb-1.5 font-semibold text-white">{c.name}</p>
                  <p className="mb-3 text-sm leading-relaxed text-white/60">{c.description}</p>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {c.compatibleLines.map((lineId) => {
                      const line = LINES[lineId]
                      return (
                        <span
                          key={lineId}
                          className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/60"
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: line?.color }} />
                          {line?.label}
                        </span>
                      )
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 border-t border-white/10 pt-3 text-[11px]">
                    {c.keySpecs.slice(0, 4).map((spec) => (
                      <div key={spec.label}>
                        <p className="text-white/40">{spec.label}</p>
                        <p className="font-medium text-white/80">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <GlassCard interactive={false} className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-4 font-medium text-white/50">Component</th>
                  {STAGE_LIST.map((stage) => (
                    <th key={stage.id} className="px-2 py-2 text-center font-medium text-white/50">
                      <span className="flex flex-col items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.id}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPONENTS.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 pr-4 font-medium text-white">{c.name}</td>
                    {STAGE_LIST.map((stage) => {
                      const compat = c.compatibleStages.find((cs) => cs.stageId === stage.id)
                      return (
                        <td key={stage.id} className="px-2 py-2 text-center">
                          {compat ? (
                            compat.preferred ? (
                              <Star className="mx-auto h-3.5 w-3.5 text-[#00D4FF]" />
                            ) : (
                              <Check className="mx-auto h-3.5 w-3.5 text-white/40" />
                            )
                          ) : (
                            <span className="text-white/10">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 flex items-center gap-4 text-[11px] text-white/40">
              <span className="flex items-center gap-1.5">
                <Star className="h-3 w-3 text-[#00D4FF]" /> Preferred stage
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-white/40" /> Compatible
              </span>
            </p>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </AppShell>
  )
}
