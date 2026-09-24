"use client"

import { useState } from "react"
import { AlertCircle, AlertTriangle, Info, Send, Thermometer } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { answerHardwareQuestion } from "@/lib/ai/hardware-tutor"
import type { TutorMessage } from "@/lib/ai/hardware-tutor"
import { useHardware } from "@/store/use-hardware"

const SEVERITY_ICON = { error: AlertCircle, warning: AlertTriangle, info: Info } as const
const SEVERITY_COLOR = { error: "text-red-400", warning: "text-amber-400", info: "text-sky-400" } as const
const STATUS_COLOR = { ok: "bg-emerald-500", warning: "bg-amber-500", critical: "bg-red-500", unlimited: "bg-white/20" } as const

export function DiagnosticsPanel() {
  const design = useHardware((s) => s.design)
  const issues = useHardware((s) => s.issues)
  const thermal = useHardware((s) => s.thermal)
  const runValidation = useHardware((s) => s.runValidation)
  const runThermal = useHardware((s) => s.runThermal)

  const [messages, setMessages] = useState<TutorMessage[]>([
    { id: "welcome", role: "assistant", text: "Ask me about any component, line type, or stage — or ask \"what's wrong\" for a design summary." },
  ])
  const [question, setQuestion] = useState("")

  function ask() {
    const q = question.trim()
    if (!q) return
    const userMsg: TutorMessage = { id: `${Date.now()}-u`, role: "user", text: q }
    const answer = answerHardwareQuestion(q, design, issues)
    const botMsg: TutorMessage = { id: `${Date.now()}-a`, role: "assistant", text: answer }
    setMessages((m) => [...m, userMsg, botMsg])
    setQuestion("")
  }

  return (
    <Tabs defaultValue="issues" className="flex h-full flex-col">
      <TabsList className="grid w-full grid-cols-3 bg-white/[0.04]">
        <TabsTrigger value="issues">Checks</TabsTrigger>
        <TabsTrigger value="thermal">Thermal</TabsTrigger>
        <TabsTrigger value="tutor">Tutor</TabsTrigger>
      </TabsList>

      <TabsContent value="issues" className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        <button
          onClick={runValidation}
          className="w-full rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/10 py-1.5 text-xs font-medium text-[#00D4FF] hover:bg-[#00D4FF]/15"
        >
          Run checks
        </button>
        {issues.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/40">No checks run yet, or no issues found.</p>
        ) : (
          issues.map((issue, i) => {
            const Icon = SEVERITY_ICON[issue.severity]
            return (
              <div key={`${issue.ruleId}-${i}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                <div className="flex items-start gap-2">
                  <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", SEVERITY_COLOR[issue.severity])} />
                  <div>
                    <p className="text-xs font-medium text-white">{issue.title}</p>
                    <p className="mt-0.5 text-[11px] text-white/50">{issue.message}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </TabsContent>

      <TabsContent value="thermal" className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        <button
          onClick={runThermal}
          className="w-full rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/10 py-1.5 text-xs font-medium text-[#00D4FF] hover:bg-[#00D4FF]/15"
        >
          Compute thermal budget
        </button>
        {!thermal ? (
          <p className="py-6 text-center text-xs text-white/40">Run the thermal analysis to see per-stage heat loads.</p>
        ) : (
          <div className="space-y-3">
            {thermal.stageLoads.map((load) => (
              <div key={load.stageId}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-white">{load.stageId}</span>
                  <span className="text-white/50">
                    {load.totalW.toFixed(4)}W{load.coolingPowerW !== undefined ? ` / ${load.coolingPowerW}W` : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-all", STATUS_COLOR[load.status])}
                    style={{ width: `${Math.min(100, load.utilization * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2">
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                <Thermometer className="h-3 w-3" /> Top contributors
              </p>
              {thermal.topContributors.map((c) => (
                <div key={c.label} className="flex justify-between text-xs">
                  <span className="text-white/60">{c.label}</span>
                  <span className="text-white/80">{(c.watts * 1000).toFixed(3)} mW</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="tutor" className="mt-3 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[92%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
                m.role === "assistant" ? "bg-white/[0.06] text-white/80" : "ml-auto bg-[#00D4FF]/15 text-white",
              )}
            >
              {m.text}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) ask()
            }}
            placeholder="Ask about a component, line, or stage..."
            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-[#00D4FF]/40 focus:outline-none"
          />
          <button
            onClick={ask}
            aria-label="Ask tutor"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00D4FF]/15 text-[#00D4FF] hover:bg-[#00D4FF]/25"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </TabsContent>
    </Tabs>
  )
}
