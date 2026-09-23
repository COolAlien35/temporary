"use client"

import { useEffect, useMemo, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { AnimatePresence, motion } from "motion/react"
import { ZoomIn, ZoomOut } from "lucide-react"
import { GATE_DEFS } from "@/lib/studio/gates"
import type { StudioGate } from "@/lib/studio/types"
import { useStudio } from "@/store/use-studio"
import { cn } from "@/lib/utils"
import { CELL_W, CELL_H } from "./blocks"

const LEFT_PAD = 64
const MIN_COLS = 10
const MAX_COLS = 28

function Slot({ step, qubit }: { step: number; qubit: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${step}-${qubit}`, data: { step, qubit } })
  return (
    <div
      ref={setNodeRef}
      className={cn("absolute rounded-lg transition-colors", isOver && "bg-[#00D4FF]/15 ring-1 ring-[#00D4FF]/50")}
      style={{ left: step * CELL_W, top: qubit * CELL_H, width: CELL_W, height: CELL_H }}
    />
  )
}

function PlacedGate({ gate, lit }: { gate: StudioGate; lit: boolean }) {
  const def = GATE_DEFS[gate.type]
  const selected = useStudio((s) => s.selectedGateIds.includes(gate.id))
  const toggleSelect = useStudio((s) => s.toggleSelect)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: gate.id, data: { source: "placed", gateId: gate.id } })

  const isCCX = gate.type === "CCX"
  const isSwap = gate.type === "SWAP"
  const controlRows = isCCX ? [gate.qubit, gate.target ?? 1] : def.slots >= 2 && !isSwap ? [gate.qubit] : []
  const boxRows = isCCX ? [gate.control2 ?? 2] : isSwap ? [gate.qubit, gate.target ?? 1] : def.slots >= 2 ? [gate.target ?? 1] : [gate.qubit]
  const allRows = [...controlRows, ...boxRows]
  const top = Math.min(...allRows)
  const bottom = Math.max(...allRows)

  const style: React.CSSProperties = {
    left: gate.step * CELL_W,
    top: top * CELL_H,
    width: CELL_W,
    height: (bottom - top + 1) * CELL_H,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        toggleSelect(gate.id, e.shiftKey)
      }}
      className={cn("absolute z-10 cursor-grab touch-none select-none", isDragging && "z-30 opacity-60")}
      style={style}
    >
      {allRows.length > 1 && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-[#00D4FF]/70"
          style={{ top: CELL_H / 2, height: (bottom - top) * CELL_H }}
          animate={lit ? { opacity: [0.5, 1, 0.5] } : {}}
          transition={{ duration: 1, repeat: lit ? Number.POSITIVE_INFINITY : 0 }}
        />
      )}
      {controlRows.map((row) => (
        <div
          key={row}
          className={cn("absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00D4FF]", selected && "ring-2 ring-white")}
          style={{ left: "50%", top: (row - top) * CELL_H + CELL_H / 2 }}
        />
      ))}
      {boxRows.map((row) => (
        <div key={row} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: (row - top) * CELL_H + CELL_H / 2 }}>
          {gate.type === "MEASURE" ? (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", def.color, selected && "ring-2 ring-white", lit && "animate-pulse")}>
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path d="M5 17 A7 7 0 0 1 19 17 M12 17 L16 8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </div>
          ) : gate.type === "BARRIER" ? (
            <div className="h-10 border-l-2 border-dashed border-white/50" />
          ) : (
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold", def.color, selected && "ring-2 ring-white")}>{isSwap ? "\u00d7" : def.symbol}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function EmptyCanvasState() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
      <svg viewBox="0 0 120 80" className="h-16 w-24 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="10" y1="20" x2="110" y2="20" />
        <line x1="10" y1="40" x2="110" y2="40" />
        <line x1="10" y1="60" x2="110" y2="60" />
        <rect x="40" y="10" width="20" height="20" rx="4" strokeDasharray="3 3" />
        <rect x="70" y="30" width="20" height="20" rx="4" strokeDasharray="3 3" />
      </svg>
      <p className="text-sm font-medium text-white/50">Drag a gate or pick a template to begin</p>
    </div>
  )
}

export function CircuitCanvas() {
  const circuit = useStudio((s) => s.circuit)
  const stepIndex = useStudio((s) => s.stepIndex)
  const select = useStudio((s) => s.select)
  const lastRunAt = useStudio((s) => s.lastRunAt)
  const [zoom, setZoom] = useState(1)
  const [sweeping, setSweeping] = useState(false)

  useEffect(() => {
    if (!lastRunAt) return
    setSweeping(true)
    const t = setTimeout(() => setSweeping(false), 650)
    return () => clearTimeout(t)
  }, [lastRunAt])

  const maxStep = Math.max(0, ...circuit.gates.map((g) => g.step))
  const cols = Math.min(MAX_COLS, Math.max(MIN_COLS, maxStep + 4))
  const width = cols * CELL_W
  const height = circuit.qubits * CELL_H

  const occupied = useMemo(() => {
    const set = new Set<string>()
    for (const g of circuit.gates) {
      set.add(`${g.step}-${g.qubit}`)
      if (g.target !== undefined) set.add(`${g.step}-${g.target}`)
      if (g.control2 !== undefined) set.add(`${g.step}-${g.control2}`)
    }
    return set
  }, [circuit.gates])

  const steps = useMemo(() => Array.from(new Set(circuit.gates.map((g) => g.step))).sort((a, b) => a - b), [circuit.gates])
  const highlightStep = stepIndex !== null ? steps[stepIndex] : null

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-end gap-1 border-b border-white/10 bg-[#0A0E17]/60 px-2 py-1">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))} className="rounded p-1 text-white/50 hover:text-white">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="w-10 text-center font-mono text-[11px] text-white/50">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="rounded p-1 text-white/50 hover:text-white">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-auto" onClick={() => select([])}>
        <div className="relative m-6" style={{ width: width + LEFT_PAD, height: height + 20, transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <div className="relative ml-16" style={{ width, height }}>
            {Array.from({ length: circuit.qubits }).map((_, q) => (
              <div key={q} className="absolute left-0 right-0" style={{ top: q * CELL_H + CELL_H / 2 }}>
                <div className="h-px bg-white/15" />
                <span className="absolute -left-16 top-1/2 -translate-y-1/2 font-mono text-[11px] text-white/50">q[{q}]</span>
              </div>
            ))}

            {Array.from({ length: cols }).flatMap((_, step) => Array.from({ length: circuit.qubits }).map((_, q) => (!occupied.has(`${step}-${q}`) ? <Slot key={`${step}-${q}`} step={step} qubit={q} /> : null)))}

            {circuit.gates.map((gate) => (
              <PlacedGate key={gate.id} gate={gate} lit={highlightStep === gate.step} />
            ))}

            {highlightStep !== null && (
              <div className="pointer-events-none absolute top-0 rounded-md bg-[#00D4FF]/10 ring-1 ring-[#00D4FF]/40" style={{ left: highlightStep * CELL_W, width: CELL_W, height }} />
            )}

            <AnimatePresence>
              {sweeping && (
                <motion.div
                  className="pointer-events-none absolute top-0 h-full w-1 bg-gradient-to-b from-transparent via-[#00D4FF] to-transparent"
                  initial={{ left: 0, opacity: 0 }}
                  animate={{ left: width, opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              )}
            </AnimatePresence>

            {circuit.gates.length === 0 && <EmptyCanvasState />}
          </div>
        </div>
      </div>
    </div>
  )
}
