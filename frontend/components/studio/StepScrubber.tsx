"use client"

import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { circuitSignature } from "@/lib/studio/inspection"
import { useStudio } from "@/store/use-studio"

export function StepScrubber() {
  const result = useStudio((s) => s.result)
  const lastRunCircuit = useStudio((s) => s.lastRunCircuit)
  const circuit = useStudio((s) => s.circuit)
  const stepIndex = useStudio((s) => s.stepIndex)
  const setStepIndex = useStudio((s) => s.setStepIndex)

  const steps = Array.from(new Set(circuit.gates.map((g) => g.step))).sort((a, b) => a - b)
  if (steps.length === 0) return null

  const available = Boolean(result && lastRunCircuit && circuitSignature(circuit) === circuitSignature(lastRunCircuit) && result.stepStates.length === steps.length)
  const active = Math.min(stepIndex ?? steps.length - 1, steps.length - 1)
  const isStepping = stepIndex !== null

  return (
    <div className="flex items-center gap-2 border-t border-white/10 bg-[#0A0E17]/80 px-3 py-2">
      <span className="text-[11px] font-medium text-white/50">Step through</span>
      <button type="button" onClick={() => setStepIndex(Math.max(0, active - 1))} disabled={!available || active === 0} aria-label="Previous step" className="rounded-md p-1 text-white/60 hover:bg-white/5 hover:text-white">
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <input
        type="range"
        aria-label="Inspect circuit step"
        aria-valuetext={`Step ${active + 1} of ${steps.length}, time step ${steps[active]}`}
        disabled={!available}
        min={0}
        max={steps.length - 1}
        value={active}
        onChange={(e) => setStepIndex(Number(e.target.value))}
        className="h-1.5 flex-1 accent-[#00D4FF]"
      />
      <button type="button" onClick={() => setStepIndex(Math.min(steps.length - 1, active + 1))} disabled={!available || active === steps.length - 1} aria-label="Next step" className="rounded-md p-1 text-white/60 hover:bg-white/5 hover:text-white">
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      {!available && <span className="text-[10px] text-white/40">Run the current circuit to inspect states</span>}
      <span className="w-14 text-center font-mono text-[11px] text-white/60">
        t{steps[active]}
      </span>
      {isStepping && (
        <button type="button" onClick={() => setStepIndex(null)} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5">
          <X className="h-3 w-3" />
          Exit
        </button>
      )}
    </div>
  )
}
