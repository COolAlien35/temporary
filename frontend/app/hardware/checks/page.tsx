"use client"

import { AlertTriangle, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/shared/AppShell"
import { PageHeader } from "@/components/shared/ui/PageHeader"
import { GlassCard } from "@/components/shared/ui/GlassCard"
import { Reveal } from "@/components/shared/ui/Reveal"
import { EmptyState } from "@/components/shared/ui/EmptyState"
import { DiagnosticsPanel } from "@/components/hardware/DiagnosticsPanel"
import { RULES } from "@/lib/hardware/rules"
import { STAGE_LIST } from "@/lib/hardware/stages"
import type { RuleSeverity } from "@/lib/hardware/types"
import { useHardware } from "@/store/use-hardware"

const SEVERITY_ICON: Record<RuleSeverity, typeof XCircle> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const SEVERITY_COLOR: Record<RuleSeverity, string> = {
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-white/40",
}

export default function HardwareChecksPage() {
  const design = useHardware((s) => s.design)

  return (
    <AppShell variant="hardware">
      <PageHeader
        eyebrow="Hardware Studio"
        title="System Checks"
        description="The rules the studio checks every design against, plus the thermal budget and diagnostics for your current design in the Builder Studio."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Validation rules ({RULES.length})</p>
          <div className="space-y-3">
            {RULES.map((rule, i) => {
              const Icon = SEVERITY_ICON[rule.severity]
              return (
                <Reveal key={rule.id} delay={Math.min(i, 6) * 0.04}>
                  <GlassCard interactive={false}>
                    <div className="flex items-start gap-3">
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", SEVERITY_COLOR[rule.severity])} />
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-semibold text-white">{rule.title}</p>
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                              rule.severity === "error" && "border-red-400/30 text-red-400",
                              rule.severity === "warning" && "border-amber-400/30 text-amber-400",
                              rule.severity === "info" && "border-white/20 text-white/40",
                            )}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        <p className="mb-1.5 text-sm text-white/60">{rule.explanation}</p>
                        <p className="text-xs text-white/40">
                          <span className="font-medium text-white/60">Fix: </span>
                          {rule.howToFix}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </Reveal>
              )
            })}
          </div>

          <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-white/40">Cooling power budgets</p>
          <GlassCard interactive={false} className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2 pr-4 font-medium">Stage</th>
                  <th className="px-2 py-2 font-medium">Temperature</th>
                  <th className="px-2 py-2 font-medium">Cooling power</th>
                  <th className="px-2 py-2 font-medium">Material</th>
                </tr>
              </thead>
              <tbody>
                {STAGE_LIST.map((stage) => (
                  <tr key={stage.id} className="border-b border-white/5">
                    <td className="flex items-center gap-2 py-2 pr-4 font-medium text-white">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.label}
                    </td>
                    <td className="px-2 py-2 text-white/70">{stage.temperatureLabel}</td>
                    <td className="px-2 py-2 text-white/70">{stage.coolingPowerW ? `${stage.coolingPowerW} W` : "Unlimited"}</td>
                    <td className="px-2 py-2 text-white/50">{stage.material}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Current design: {design.meta.name}</p>
          {design.placed.length === 0 ? (
            <EmptyState
              title="No design loaded"
              description="Open the Builder Studio and place a few components to see live diagnostics here."
            />
          ) : (
            <GlassCard interactive={false} className="h-[560px]">
              <DiagnosticsPanel />
            </GlassCard>
          )}
        </div>
      </div>
    </AppShell>
  )
}
