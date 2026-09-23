"use client"

import { Trash2, X } from "lucide-react"
import { ANGLE_PRESETS, GATE_DEFS } from "@/lib/studio/gates"
import { useStudio } from "@/store/use-studio"

export function GateInspector() {
  const circuit = useStudio((s) => s.circuit)
  const selectedGateIds = useStudio((s) => s.selectedGateIds)
  const updateGate = useStudio((s) => s.updateGate)
  const removeGate = useStudio((s) => s.removeGate)
  const select = useStudio((s) => s.select)

  if (selectedGateIds.length !== 1) return null
  const gate = circuit.gates.find((g) => g.id === selectedGateIds[0])
  if (!gate) return null
  const def = GATE_DEFS[gate.type]

  return (
    <div className="absolute right-3 top-3 z-20 w-56 rounded-xl border border-white/10 bg-[#0D1220]/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white">{def.label}</p>
        <button type="button" onClick={() => select([])} aria-label="Close inspector" className="text-white/40 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-[11px] text-white/50">{def.description}</p>

      {def.hasAngle && (
        <div className="mt-3">
          <label className="text-[11px] text-white/50" htmlFor="gate-theta">
            Angle (radians)
          </label>
          <input
            id="gate-theta"
            type="number"
            step={0.01}
            value={gate.theta ?? Math.PI / 2}
            onChange={(e) => updateGate(gate.id, { theta: Number(e.target.value) })}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:outline-none"
          />
          <div className="mt-1.5 flex gap-1.5">
            {ANGLE_PRESETS.map((preset) => (
              <button key={preset.label} type="button" onClick={() => updateGate(gate.id, { theta: preset.value })} className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/10">
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => removeGate(gate.id)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-400/20"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete gate
      </button>
    </div>
  )
}
