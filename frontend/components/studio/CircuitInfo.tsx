"use client"

import { useMemo } from "react"
import { GATE_DEFS } from "@/lib/studio/gates"
import { computeCircuitInfo } from "@/lib/studio/circuit-info"
import { useStudio } from "@/store/use-studio"

export function CircuitInfo() {
  const circuit = useStudio((s) => s.circuit)
  const result = useStudio((s) => s.result)
  const info = useMemo(() => computeCircuitInfo(circuit.qubits, circuit.gates), [circuit.qubits, circuit.gates])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Qubits", value: info.qubits },
          { label: "Depth", value: info.depth },
          { label: "Gate count", value: info.gateCount },
          { label: "T-count", value: info.tCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[11px] text-white/45">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">Gates by type</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(info.gateCountByType).map(([type, count]) => (
            <span key={type} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
              {GATE_DEFS[type as keyof typeof GATE_DEFS]?.label ?? type} ×{count}
            </span>
          ))}
          {info.gateCount === 0 && <span className="text-xs text-white/40">No gates placed yet.</span>}
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs">
          <p className="text-white/50">Estimated fidelity under current noise settings</p>
          <p className="mt-1 font-mono text-base font-semibold text-[#4ADE80]">{(result.fidelity * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  )
}
