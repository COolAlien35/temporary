"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { PanelLeftClose, PanelLeftOpen, PanelBottom, PanelRight } from "lucide-react"
import { toast } from "sonner"
import { AppShell } from "@/components/shared/AppShell"
import { StudioToolbar } from "@/components/studio/StudioToolbar"
import { GatePalette } from "@/components/studio/GatePalette"
import { TemplatesPanel } from "@/components/studio/TemplatesPanel"
import { MyCircuits } from "@/components/studio/MyCircuits"
import { CircuitCanvas } from "@/components/studio/CircuitCanvas"
import { StudioCodeEditor } from "@/components/studio/StudioCodeEditor"
import { GateInspector } from "@/components/studio/GateInspector"
import { StepScrubber } from "@/components/studio/StepScrubber"
import { ResultsPanel } from "@/components/studio/ResultsPanel"
import { TutorDrawer } from "@/components/studio/TutorDrawer"
import { StatusBar } from "@/components/studio/StatusBar"
import { GATE_DEFS } from "@/lib/studio/gates"
import type { StudioGateType } from "@/lib/studio/types"
import { getTemplate, instantiateTemplate } from "@/lib/studio/templates"
import { decodeCircuit } from "@/lib/studio/url-codec"
import { useStudio } from "@/store/use-studio"
import { cn } from "@/lib/utils"

const ALGO_TEMPLATE_MAP: Record<string, string> = {
  grovers: "grover-2q",
  bell: "bell",
  ghz: "ghz",
  qft: "qft-3q",
  teleportation: "teleportation",
}

function DeepLinkLoader() {
  const searchParams = useSearchParams()
  const loadCircuit = useStudio((s) => s.loadCircuit)

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.startsWith("#c=")) {
      const decoded = decodeCircuit(window.location.hash.slice(3))
      if (decoded) {
        loadCircuit(decoded)
        toast.success(`Loaded shared circuit "${decoded.name}"`)
        return
      }
    }
    const templateKey = searchParams.get("template")
    const algoKey = searchParams.get("algo")
    const key = templateKey ?? (algoKey ? ALGO_TEMPLATE_MAP[algoKey] : undefined)
    if (key) {
      const template = getTemplate(key)
      if (template) loadCircuit(instantiateTemplate(template))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

function SidebarTabs() {
  const [tab, setTab] = useState<"gates" | "templates" | "saved">("gates")
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-white/10 p-2">
        {(["gates", "templates", "saved"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium capitalize", tab === t ? "bg-[#00D4FF]/15 text-[#00D4FF]" : "text-white/50 hover:text-white/80")}
          >
            {t === "saved" ? "My circuits" : t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "gates" && <GatePalette />}
        {tab === "templates" && <TemplatesPanel />}
        {tab === "saved" && <MyCircuits />}
      </div>
    </div>
  )
}

function StudioWorkbench() {
  const circuit = useStudio((s) => s.circuit)
  const viewMode = useStudio((s) => s.viewMode)
  const setViewMode = useStudio((s) => s.setViewMode)
  const addGate = useStudio((s) => s.addGate)
  const updateGate = useStudio((s) => s.updateGate)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [dock, setDock] = useState<"right" | "bottom">("right")

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const overData = over.data.current as { step: number; qubit: number } | undefined
    if (!overData) return
    const activeData = active.data.current as { source?: string; gateType?: StudioGateType; gateId?: string } | undefined
    if (!activeData) return

    if (activeData.source === "palette" && activeData.gateType) {
      const type = activeData.gateType
      const def = GATE_DEFS[type]
      const { step, qubit } = overData
      if (def.slots === 1) {
        addGate({ type, step, qubit, theta: def.hasAngle ? Math.PI / 2 : undefined })
      } else if (def.slots === 2) {
        if (circuit.qubits < 2) {
          toast.error("Add a second qubit for multi-qubit gates")
          return
        }
        const target = qubit === circuit.qubits - 1 ? qubit - 1 : qubit + 1
        addGate({ type, step, qubit, target, theta: def.hasAngle ? Math.PI / 2 : undefined })
      } else if (def.slots === 3) {
        if (circuit.qubits < 3) {
          toast.error("Toffoli needs at least 3 qubits")
          return
        }
        const target = (qubit + 1) % circuit.qubits
        const control2 = (qubit + 2) % circuit.qubits
        addGate({ type, step, qubit, target, control2 })
      }
      return
    }

    if (activeData.source === "placed" && activeData.gateId) {
      const gate = circuit.gates.find((g) => g.id === activeData.gateId)
      if (!gate) return
      const delta = overData.qubit - gate.qubit
      const clamp = (v: number) => Math.max(0, Math.min(circuit.qubits - 1, v))
      updateGate(gate.id, {
        step: overData.step,
        qubit: overData.qubit,
        target: gate.target !== undefined ? clamp(gate.target + delta) : undefined,
        control2: gate.control2 !== undefined ? clamp(gate.control2 + delta) : undefined,
      })
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-[78vh] min-h-[600px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <StudioToolbar onToggleTutor={() => setTutorOpen((v) => !v)} />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {sidebarOpen && (
            <div className="hidden w-64 shrink-0 border-r border-white/10 lg:block">
              <SidebarTabs />
            </div>
          )}

          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5">
              <button type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle gate palette" className="hidden rounded-md p-1 text-white/50 hover:text-white lg:block">
                {sidebarOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
              </button>
              <div className="flex rounded-md bg-white/5 p-0.5">
                {(["visual", "code", "split"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setViewMode(mode)} className={cn("rounded px-2.5 py-1 text-[11px] font-medium capitalize", viewMode === mode ? "bg-[#00D4FF]/20 text-[#00D4FF]" : "text-white/50")}>
                    {mode}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setDock((d) => (d === "right" ? "bottom" : "right"))} aria-label="Toggle results dock" className="ml-auto hidden rounded-md p-1 text-white/50 hover:text-white lg:block">
                {dock === "right" ? <PanelBottom className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className={cn("flex min-h-0 min-w-0 flex-1", dock === "right" ? "flex-col lg:flex-row" : "flex-col")}>
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="relative min-h-0 min-w-0 flex-1">
                  {viewMode === "visual" && <CircuitCanvas />}
                  {viewMode === "code" && <StudioCodeEditor />}
                  {viewMode === "split" && (
                    <div className="flex h-full flex-col lg:flex-row">
                      <div className="min-h-[220px] flex-1 border-b border-white/10 lg:border-b-0 lg:border-r">
                        <StudioCodeEditor />
                      </div>
                      <div className="min-h-[220px] flex-1">
                        <CircuitCanvas />
                      </div>
                    </div>
                  )}
                  <GateInspector />
                  <TutorDrawer open={tutorOpen} onClose={() => setTutorOpen(false)} />
                </div>
                {(viewMode === "visual" || viewMode === "split") && <StepScrubber />}
              </div>

              <div className={cn("min-w-0 border-white/10 bg-[#0A0E17]/40", dock === "right" ? "w-full border-t lg:w-[360px] lg:shrink-0 lg:border-l lg:border-t-0" : "h-72 border-t")}>
                <ResultsPanel />
              </div>
            </div>
          </div>
        </div>

        <StatusBar />
      </div>

      <div className="mt-3 lg:hidden">
        <details className="rounded-xl border border-white/10 bg-white/[0.02]">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-white/70">Gate palette, templates &amp; saved circuits</summary>
          <div className="max-h-80 overflow-y-auto border-t border-white/10">
            <SidebarTabs />
          </div>
        </details>
      </div>
    </DndContext>
  )
}

export default function StudioPage() {
  // dnd-kit assigns accessibility ids from a module-level counter that server and client
  // instantiate independently, which mismatches on hydration — mount the workbench client-only.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <AppShell variant="studio">
      <Suspense fallback={null}>
        <DeepLinkLoader />
      </Suspense>
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Circuit Studio
        </h1>
        <p className="mt-1 text-sm text-white/50">A free-form workbench for building and simulating quantum circuits — no backend required.</p>
      </div>
      {mounted ? <StudioWorkbench /> : <div className="h-[78vh] min-h-[600px] animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />}
    </AppShell>
  )
}
