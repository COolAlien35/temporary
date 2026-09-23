"use client"

const WIRES = [40, 90, 140]

const GATES = [
  { x: 60, wire: 0, label: "H" },
  { x: 60, wire: 2, label: "H" },
  { x: 130, wire: 1, label: "X", pulsing: true },
  { x: 200, wire: 0, label: "Z" },
  { x: 200, wire: 2, label: "H" },
]

export function CircuitDiagram() {
  return (
    <svg viewBox="0 0 280 180" className="h-full w-full" aria-hidden="true">
      {WIRES.map((y, i) => (
        <g key={i}>
          <line x1="20" y1={y} x2="260" y2={y} stroke="white" strokeOpacity="0.15" strokeWidth="1.5" />
          <text x="4" y={y + 4} fill="white" fillOpacity="0.4" fontSize="10" fontFamily="monospace">
            q{i}
          </text>
        </g>
      ))}

      <line x1="130" y1="40" x2="130" y2="140" stroke="#00D4FF" strokeOpacity="0.4" strokeWidth="1.5" />
      <circle cx="130" cy="40" r="4" fill="#00D4FF" />
      <circle cx="130" cy="140" r="4" fill="#00D4FF" />

      {GATES.map((gate, i) => (
        <g key={i}>
          {gate.pulsing && (
            <rect
              x={gate.x - 16}
              y={WIRES[gate.wire] - 16}
              width="32"
              height="32"
              rx="8"
              fill="none"
              stroke="#FFB800"
              strokeWidth="2"
              className="animate-[gate-pulse_1.8s_ease-in-out_infinite]"
            />
          )}
          <rect
            x={gate.x - 14}
            y={WIRES[gate.wire] - 14}
            width="28"
            height="28"
            rx="6"
            fill={gate.pulsing ? "#1a1408" : "#0d1420"}
            stroke={gate.pulsing ? "#FFB800" : "#00D4FF"}
            strokeOpacity={gate.pulsing ? 1 : 0.5}
            strokeWidth="1.5"
          />
          <text
            x={gate.x}
            y={WIRES[gate.wire] + 4}
            textAnchor="middle"
            fill={gate.pulsing ? "#FFB800" : "#4FD1E8"}
            fontSize="12"
            fontWeight="600"
            fontFamily="monospace"
          >
            {gate.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
