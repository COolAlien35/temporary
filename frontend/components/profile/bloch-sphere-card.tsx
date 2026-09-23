"use client"

import { useRef, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { handleGlowPointerMove } from "@/lib/home-glow"

type Vec3 = { x: number; y: number; z: number }

const GATES: Record<string, (v: Vec3) => Vec3> = {
  H: ({ x, y, z }) => ({ x: z, y: -y, z: x }),
  X: ({ x, y, z }) => ({ x, y: -y, z: -z }),
  Z: ({ x, y, z }) => ({ x: -x, y: -y, z }),
  S: ({ x, y, z }) => ({ x: -y, y: x, z }),
}

const R = 80
const CX = 110
const CY = 110

function project(v: Vec3) {
  // Simple orthographic-ish projection with a fixed viewing tilt.
  const tilt = 0.55
  const px = v.x
  const py = v.y * Math.cos(tilt) - v.z * Math.sin(tilt)
  return { x: CX + px * R, y: CY - py * R }
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

export function BlochSphereCard() {
  const reduceMotion = useReducedMotion()
  const [state, setState] = useState<Vec3>({ x: 0, y: 0, z: 1 })
  const [rotation, setRotation] = useState({ az: -20, el: 12 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setRotation((r) => ({ az: r.az + dx * 0.5, el: Math.max(-80, Math.min(80, r.el - dy * 0.5)) }))
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function applyGate(gate: keyof typeof GATES) {
    setState((prev) => normalize(GATES[gate](prev)))
  }

  function reset() {
    setState({ x: 0, y: 0, z: 1 })
  }

  const tip = project(state)
  const p0 = ((1 + state.z) / 2) * 100
  const p1 = 100 - p0
  const alpha = Math.sqrt((1 + state.z) / 2)
  const beta = Math.sqrt(Math.max(0, (1 - state.z) / 2))

  return (
    <div onPointerMove={handleGlowPointerMove} className="home-glow-card relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        Your Quantum State Today
      </h3>
      <p className="mt-1 text-xs text-white/45">Drag the sphere to rotate. Click a gate to evolve the state.</p>

      <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr] sm:items-center">
        <svg
          viewBox="0 0 220 220"
          className="mx-auto h-56 w-56 cursor-grab touch-none active:cursor-grabbing"
          role="img"
          aria-label={`Bloch sphere showing the current qubit state vector`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ transform: `rotate(${rotation.az * 0.15}deg)` }}
        >
          <circle cx={CX} cy={CY} r={R} fill="rgba(0,212,255,0.06)" stroke="#00D4FF" strokeOpacity="0.35" strokeWidth="1.3" />
          <ellipse cx={CX} cy={CY} rx={R} ry={R * 0.32} fill="none" stroke="#4FD1E8" strokeOpacity="0.3" strokeWidth="1" />
          <ellipse
            cx={CX}
            cy={CY}
            rx={R * 0.32}
            ry={R}
            fill="none"
            stroke="#4FD1E8"
            strokeOpacity="0.2"
            strokeWidth="1"
            transform={`rotate(${rotation.az} ${CX} ${CY})`}
          />
          <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="white" strokeOpacity="0.12" strokeWidth="1" />
          <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="white" strokeOpacity="0.12" strokeWidth="1" />
          <text x={CX} y={CY - R - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">
            |0&rang;
          </text>
          <text x={CX} y={CY + R + 14} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">
            |1&rang;
          </text>

          <motion.line
            x1={CX}
            y1={CY}
            x2={tip.x}
            y2={tip.y}
            stroke="#FFB800"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{ x2: tip.x, y2: tip.y }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 5px rgba(255,184,0,0.7))" }}
          />
          <motion.circle
            r={5}
            fill="#FFB800"
            animate={{ cx: tip.x, cy: tip.y }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeOut" }}
          />
          <circle cx={CX} cy={CY} r={2.5} fill="white" />
        </svg>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {(["H", "X", "Z", "S"] as const).map((gate) => (
              <button
                key={gate}
                type="button"
                onClick={() => applyGate(gate)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-sm font-semibold text-[#00D4FF] transition-colors hover:bg-[#00D4FF]/20"
              >
                {gate}
              </button>
            ))}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 transition-colors hover:bg-white/10"
            >
              Reset
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-white/45">P(|0&rang;)</dt>
              <dd className="mt-1 text-base font-semibold text-white">{p0.toFixed(1)}%</dd>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <dt className="text-white/45">P(|1&rang;)</dt>
              <dd className="mt-1 text-base font-semibold text-[#00D4FF]">{p1.toFixed(1)}%</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:col-span-1">
              <dt className="text-white/45">Statevector</dt>
              <dd className="mt-1 font-mono text-[11px] text-white/80">
                {alpha.toFixed(2)}|0&rang; + {beta.toFixed(2)}|1&rang;
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
