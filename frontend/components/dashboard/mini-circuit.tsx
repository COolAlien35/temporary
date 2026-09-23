"use client"

import { motion } from "motion/react"

const START_X = 10
const END_X = 230
const DURATION = 2.4
const REPEAT_DELAY = 1.4

const WIRES = [
  { y: 34, label: "q[0]" },
  { y: 78, label: "q[1]" },
]

function frac(x: number) {
  return (x - START_X) / (END_X - START_X)
}

function glowTiming(x: number) {
  const f = frac(x)
  return {
    times: [0, Math.max(f - 0.06, 0), f, Math.min(f + 0.06, 1), 1],
    filter: ["brightness(1)", "brightness(1)", "brightness(1.9)", "brightness(1)", "brightness(1)"],
  }
}

const singleGates = [
  { x: 42, wire: 0, label: "H", color: "#00D4FF" },
  { x: 42, wire: 1, label: "X", color: "#4FD1E8" },
]

const measureX = 196

export function MiniCircuit() {
  return (
    <svg
      viewBox="0 0 240 112"
      className="h-full w-full"
      role="img"
      aria-label="Active circuit slice: Hadamard and X gates feeding an oracle and measurement"
    >
      {WIRES.map((wire) => (
        <g key={wire.label}>
          <line x1={START_X} y1={wire.y} x2={END_X} y2={wire.y} stroke="white" strokeOpacity="0.15" strokeWidth="1" />
          <text x="0" y={wire.y + 3} fontSize="8" fill="white" fillOpacity="0.4">
            {wire.label}
          </text>
        </g>
      ))}

      {WIRES.map((wire, i) => (
        <motion.circle
          key={`pulse-${i}`}
          cy={wire.y}
          r={3}
          fill="#00D4FF"
          initial={{ cx: START_X }}
          animate={{ cx: END_X, opacity: [0, 1, 1, 0] }}
          transition={{
            duration: DURATION,
            times: [0, 0.08, 0.92, 1],
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: REPEAT_DELAY,
            ease: "linear",
          }}
          style={{ filter: "drop-shadow(0 0 3px #00D4FF)" }}
        />
      ))}

      {singleGates.map((g) => {
        const glow = glowTiming(g.x)
        return (
          <motion.g
            key={`${g.wire}-${g.x}`}
            animate={{ filter: glow.filter }}
            transition={{
              duration: DURATION,
              times: glow.times,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: REPEAT_DELAY,
              ease: "linear",
            }}
          >
            <rect
              x={g.x - 11}
              y={WIRES[g.wire].y - 11}
              width={22}
              height={22}
              rx={5}
              fill="#0d1420"
              stroke={g.color}
              strokeWidth="1.2"
            />
            <text x={g.x} y={WIRES[g.wire].y + 3} fontSize="10" fontWeight="600" textAnchor="middle" fill={g.color}>
              {g.label}
            </text>
          </motion.g>
        )
      })}

      {(() => {
        const glow = glowTiming(113)
        return (
          <motion.g
            animate={{ filter: glow.filter }}
            transition={{
              duration: DURATION,
              times: glow.times,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: REPEAT_DELAY,
              ease: "linear",
            }}
          >
            <line x1={88} y1={WIRES[0].y} x2={88} y2={WIRES[1].y} stroke="#FFB800" strokeOpacity="0.3" strokeWidth="1" />
            <line x1={138} y1={WIRES[0].y} x2={138} y2={WIRES[1].y} stroke="#FFB800" strokeOpacity="0.3" strokeWidth="1" />
            <rect
              x={88}
              y={WIRES[0].y - 14}
              width={50}
              height={WIRES[1].y - WIRES[0].y + 28}
              rx={6}
              fill="#0d1420"
              stroke="#FFB800"
              strokeWidth="1.2"
            />
            <text x={113} y={(WIRES[0].y + WIRES[1].y) / 2 + 3} fontSize="10" fontWeight="600" textAnchor="middle" fill="#FFB800">
              U_f
            </text>
          </motion.g>
        )
      })()}

      {WIRES.map((wire, i) => {
        const glow = glowTiming(measureX)
        return (
          <motion.g
            key={`meter-${i}`}
            animate={{ filter: glow.filter }}
            transition={{
              duration: DURATION,
              times: glow.times,
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: REPEAT_DELAY,
              ease: "linear",
            }}
          >
            <rect x={measureX - 11} y={wire.y - 11} width={22} height={22} rx={5} fill="#0d1420" stroke="#4ADE80" strokeWidth="1.2" />
            <path
              d={`M ${measureX - 6} ${wire.y + 4} A 6 6 0 0 1 ${measureX + 6} ${wire.y + 4}`}
              fill="none"
              stroke="#4ADE80"
              strokeWidth="1.3"
            />
            <line x1={measureX} y1={wire.y + 4} x2={measureX + 4} y2={wire.y - 3} stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
          </motion.g>
        )
      })}
    </svg>
  )
}
