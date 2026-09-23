"use client"

import { useStudio } from "@/store/use-studio"

export function StatusBar() {
  const circuit = useStudio((s) => s.circuit)
  const shots = useStudio((s) => s.shots)
  const result = useStudio((s) => s.result)
  const lastRunAt = useStudio((s) => s.lastRunAt)

  const sparkline = result
    ? Object.values(result.probabilities)
        .slice(0, 12)
        .map((p, i) => `${i * 6},${20 - p * 18}`)
        .join(" ")
    : ""

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 bg-[#0A0E17]/80 px-3 py-1.5 text-[11px] text-white/50">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
        </span>
        Local statevector simulator
      </span>
      <span>{circuit.qubits} qubits</span>
      <span>{shots} shots</span>
      <span>{lastRunAt ? `Last run ${new Date(lastRunAt).toLocaleTimeString()}` : "Not run yet"}</span>
      {result && (
        <svg viewBox="0 0 72 20" className="h-4 w-16" aria-hidden="true">
          <polyline points={sparkline} fill="none" stroke="#00D4FF" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  )
}
