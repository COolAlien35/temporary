"use client"

import { useRef, useState } from "react"
import { motion } from "motion/react"
import { GATE_DEFS } from "@/lib/studio/gates"
import type { BlochVector } from "@/lib/studio/types"
import { cn } from "@/lib/utils"

export const CELL_W = 68
export const CELL_H = 60

/** A horizontal qubit wire spanning the canvas width, used as a full-bleed background row. */
export function WireLine({ active }: { active?: boolean }) {
  return <div className={cn("absolute left-0 right-0 top-1/2 h-px -translate-y-1/2", active ? "bg-[#00D4FF]/60" : "bg-white/15")} />
}

/** A single-qubit gate tile rendered as an HTML chip, positioned by its parent. */
export function GateBox({
  label,
  colorClass,
  selected,
  dashed,
  onClick,
  ariaLabel,
}: {
  label: string
  colorClass: string
  selected?: boolean
  dashed?: boolean
  onClick?: (e: React.MouseEvent) => void
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold transition-shadow",
        colorClass,
        selected && "ring-2 ring-white",
        dashed && "border-dashed",
      )}
    >
      {label}
    </button>
  )
}

export function AmplitudeBars({ probabilities, max = 8 }: { probabilities: Record<string, number>; max?: number }) {
  const entries = Object.entries(probabilities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
  return (
    <div className="flex h-full items-end gap-2 px-1">
      {entries.map(([key, p]) => (
        <div key={key} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            className="w-full rounded-t-md bg-gradient-to-t from-[#00D4FF]/70 to-[#00D4FF]"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(2, p * 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ minHeight: 2 }}
          />
          <span className="font-mono text-[10px] text-white/50">|{key}⟩</span>
          <span className="font-mono text-[10px] text-white/70">{(p * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

export function PhasorWheel({ statevector }: { statevector: { re: number; im: number }[] }) {
  const R = 46
  const CX = 54
  const CY = 54
  return (
    <svg viewBox="0 0 108 108" className="h-full w-full" role="img" aria-label="Phasor wheel of basis-state amplitudes">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="white" strokeOpacity={0.15} />
      {statevector.map((amp, i) => {
        const mag = Math.sqrt(amp.re * amp.re + amp.im * amp.im)
        if (mag < 0.02) return null
        const angle = Math.atan2(amp.im, amp.re)
        const x = CX + R * mag * Math.cos(angle)
        const y = CY - R * mag * Math.sin(angle)
        return (
          <g key={i}>
            <line x1={CX} y1={CY} x2={x} y2={y} stroke="#F5B942" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={x} cy={y} r={3} fill="#F5B942" />
          </g>
        )
      })}
      <circle cx={CX} cy={CY} r={2} fill="white" />
    </svg>
  )
}

function project(v: BlochVector, az: number, el: number) {
  const tilt = (el * Math.PI) / 180
  const rot = (az * Math.PI) / 180
  const x1 = v.x * Math.cos(rot) - v.y * Math.sin(rot)
  const y1 = v.x * Math.sin(rot) + v.y * Math.cos(rot)
  const py = y1 * Math.cos(tilt) - v.z * Math.sin(tilt)
  return { x: x1, y: py }
}

export function BlochMini({ vector, label }: { vector: BlochVector; label: string }) {
  const [rotation, setRotation] = useState({ az: -20, el: 12 })
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const R = 42
  const CX = 50
  const CY = 50

  function onDown(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.x
    const dy = e.clientY - dragRef.current.y
    dragRef.current = { x: e.clientX, y: e.clientY }
    setRotation((r) => ({ az: r.az + dx * 0.6, el: Math.max(-80, Math.min(80, r.el - dy * 0.6)) }))
  }
  function onUp(e: React.PointerEvent<SVGSVGElement>) {
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const tip = project(vector, rotation.az, rotation.el)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" className="h-24 w-24 cursor-grab touch-none active:cursor-grabbing" role="img" aria-label={`Bloch sphere for ${label}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
        <circle cx={CX} cy={CY} r={R} fill="rgba(0,212,255,0.05)" stroke="#00D4FF" strokeOpacity={0.3} />
        <ellipse cx={CX} cy={CY} rx={R} ry={R * 0.3} fill="none" stroke="#4FD1E8" strokeOpacity={0.25} />
        <line x1={CX} y1={CY - R} x2={CX} y2={CY + R} stroke="white" strokeOpacity={0.12} />
        <line x1={CX - R} y1={CY} x2={CX + R} y2={CY} stroke="white" strokeOpacity={0.12} />
        <motion.line x1={CX} y1={CY} x2={CX + tip.x * R} y2={CY - tip.y * R} stroke={vector.mixed ? "#F5B942" : "#4ADE80"} strokeWidth={2} strokeLinecap="round" animate={{ x2: CX + tip.x * R, y2: CY - tip.y * R }} transition={{ duration: 0.5 }} />
        <circle cx={CX} cy={CY} r={2} fill="white" />
      </svg>
      <span className="font-mono text-[10px] text-white/55">{label}</span>
      {vector.mixed && <span className="text-[9px] text-amber-300">mixed · |r|={vector.length.toFixed(2)}</span>}
    </div>
  )
}

export function gateLabel(type: keyof typeof GATE_DEFS): string {
  return GATE_DEFS[type].symbol
}
