import { GATE_DEFS } from "@/lib/studio/gates"
import type { StudioCircuit } from "@/lib/studio/types"

export function CircuitStudy({ circuit }: { circuit: StudioCircuit }) {
  const gates = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit)
  const maxStep = Math.max(0, ...gates.map((gate) => gate.step))
  const width = Math.max(360, 105 + (maxStep + 1) * 72)
  const height = 32 + circuit.qubits * 62

  return <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs uppercase tracking-[.18em] text-[#00D4FF]">Circuit to study</p><h3 className="mt-1 text-lg font-semibold text-white">{circuit.name}</h3></div>
      <p className="text-xs text-white/45">{circuit.qubits} qubits · {gates.length} gates</p>
    </div>
    <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#0A0E17] p-3">
      <svg role="img" aria-label={`${circuit.name} circuit diagram`} viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
        {Array.from({ length: circuit.qubits }, (_, qubit) => {
          const y = 38 + qubit * 62
          return <g key={qubit}><text x="4" y={y + 4} fill="#a6b7c8" fontSize="12">q[{qubit}]</text><line x1="55" x2={width - 12} y1={y} y2={y} stroke="#64748b" strokeWidth="1.5" /></g>
        })}
        {gates.map((gate) => {
          const x = 86 + gate.step * 72
          const y = 38 + gate.qubit * 62
          const targetY = gate.target === undefined ? y : 38 + gate.target * 62
          const symbol = GATE_DEFS[gate.type]?.symbol ?? gate.type
          return <g key={gate.id}>
            {gate.target !== undefined && <><line x1={x} x2={x} y1={Math.min(y, targetY)} y2={Math.max(y, targetY)} stroke="#00D4FF" strokeWidth="2" /><circle cx={x} cy={y} r="5" fill="#00D4FF" /></>}
            <rect x={x - 18} y={targetY - 18} width="36" height="36" rx="8" fill="#123746" stroke="#00D4FF" />
            <text x={x} y={targetY + 5} textAnchor="middle" fill="#d7f9ff" fontSize="13">{symbol}</text>
          </g>
        })}
      </svg>
    </div>
    <ol className="mt-4 grid gap-2 text-xs text-white/60 sm:grid-cols-2" aria-label="Circuit gate sequence">
      {gates.map((gate) => <li key={gate.id} className="rounded-lg border border-white/10 px-3 py-2">Step {gate.step + 1}: {GATE_DEFS[gate.type]?.label ?? gate.type} on q[{gate.qubit}]{gate.target === undefined ? "" : ` → q[${gate.target}]`}</li>)}
    </ol>
  </div>
}
