import type { GatePlacement } from "@/lib/lab-data"

export function CircuitMiniSVG({ gates, qubits = 2 }: { gates: GatePlacement[]; qubits?: number }) {
  return <svg aria-label="Read-only circuit preview" role="img" viewBox={`0 0 440 ${qubits * 52 + 20}`} className="h-full w-full">
    {Array.from({ length: qubits }).map((_, q) => <g key={q}><line x1="30" y1={30 + q * 52} x2="420" y2={30 + q * 52} stroke="currentColor" strokeOpacity=".3" /><text x="2" y={34 + q * 52} fill="currentColor" fontSize="11">q[{q}]</text></g>)}
    {gates.map((g) => { const x = 55 + g.step * 88; const y = 18 + g.qubit * 52; return <g key={g.id}><rect x={x} y={y} width="34" height="25" rx="5" fill="#00D4FF22" stroke="#00D4FF" /><text x={x + 17} y={y + 17} textAnchor="middle" fill="#00D4FF" fontSize="11">{g.gate === "CNOT" ? "⊕" : g.gate}</text>{g.gate === "CNOT" && <line x1={x + 17} y1={y + 25} x2={x + 17} y2={18 + (g.target ?? 1) * 52} stroke="#00D4FF" />}</g> })}
  </svg>
}
