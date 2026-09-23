"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Download, Link2, Minus, Play, Plus, Redo2, Save, Trash2, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { useStudio, MAX_QUBITS, MIN_QUBITS } from "@/store/use-studio"
import { exportQiskit } from "@/lib/studio/export-qiskit"
import { exportQasm } from "@/lib/studio/export-qasm"
import { encodeCircuit } from "@/lib/studio/url-codec"
import { circuitToSvgString } from "@/lib/studio/circuit-svg"
import { cn } from "@/lib/utils"

const SHOT_OPTIONS = [256, 1024, 4096, 8192]

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function svgStringToPngDownload(svgSource: string, filename: string) {
  const svgBlob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = img.width * 2
    canvas.height = img.height * 2
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "#0A0E17"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return
        const pngUrl = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = pngUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(pngUrl)
      })
    }
    URL.revokeObjectURL(url)
  }
  img.src = url
}

export function StudioToolbar({ onToggleTutor }: { onToggleTutor: () => void }) {
  const circuit = useStudio((s) => s.circuit)
  const setName = useStudio((s) => s.setName)
  const setQubits = useStudio((s) => s.setQubits)
  const undo = useStudio((s) => s.undo)
  const redo = useStudio((s) => s.redo)
  const past = useStudio((s) => s.past)
  const future = useStudio((s) => s.future)
  const clear = useStudio((s) => s.clear)
  const saveCurrentAs = useStudio((s) => s.saveCurrentAs)
  const run = useStudio((s) => s.run)
  const shots = useStudio((s) => s.shots)
  const setShots = useStudio((s) => s.setShots)

  const [editingName, setEditingName] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function handleExport(kind: "qiskit" | "qasm" | "png" | "json") {
    setExportOpen(false)
    if (kind === "qiskit") downloadText(`${circuit.name.replace(/\s+/g, "-").toLowerCase()}.py`, exportQiskit(circuit))
    if (kind === "qasm") downloadText(`${circuit.name.replace(/\s+/g, "-").toLowerCase()}.qasm`, exportQasm(circuit))
    if (kind === "json") downloadText(`${circuit.name.replace(/\s+/g, "-").toLowerCase()}.json`, JSON.stringify(circuit, null, 2))
    if (kind === "png") {
      svgStringToPngDownload(circuitToSvgString(circuit), `${circuit.name.replace(/\s+/g, "-").toLowerCase()}.png`)
    }
    toast.success(`Exported ${kind.toUpperCase()}`)
  }

  function handleShare() {
    const hash = encodeCircuit(circuit)
    const url = `${window.location.origin}${window.location.pathname}#c=${hash}`
    navigator.clipboard?.writeText(url)
    toast.success("Share link copied to clipboard")
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0A0E17]/80 px-3 py-2">
      {editingName ? (
        <input
          autoFocus
          value={circuit.name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setEditingName(false)}
          onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
          className="w-40 rounded-md border border-[#00D4FF]/40 bg-white/5 px-2 py-1 text-sm font-semibold text-white focus:outline-none"
        />
      ) : (
        <button type="button" onClick={() => setEditingName(true)} className="rounded-md px-2 py-1 text-sm font-semibold text-white hover:bg-white/5" title="Rename circuit">
          {circuit.name}
        </button>
      )}

      <div className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-1">
        <button type="button" aria-label="Fewer qubits" onClick={() => setQubits(circuit.qubits - 1)} disabled={circuit.qubits <= MIN_QUBITS} className="rounded p-0.5 text-white/60 hover:text-white disabled:opacity-30">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-16 text-center text-xs font-mono text-white/80">{circuit.qubits} qubit{circuit.qubits > 1 ? "s" : ""}</span>
        <button type="button" aria-label="More qubits" onClick={() => setQubits(circuit.qubits + 1)} disabled={circuit.qubits >= MAX_QUBITS} className="rounded p-0.5 text-white/60 hover:text-white disabled:opacity-30">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <button type="button" onClick={undo} disabled={past.length === 0} aria-label="Undo" className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30">
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" onClick={redo} disabled={future.length === 0} aria-label="Redo" className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white disabled:opacity-30">
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          clear()
          toast("Circuit cleared")
        }}
        aria-label="Clear circuit"
        className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-rose-300"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          saveCurrentAs(circuit.name)
          toast.success("Saved to My circuits")
        }}
        aria-label="Save circuit"
        className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
      >
        <Save className="h-4 w-4" />
      </button>
      <button type="button" onClick={handleShare} aria-label="Share circuit" className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white">
        <Link2 className="h-4 w-4" />
      </button>

      <div ref={exportRef} className="relative">
        <button type="button" onClick={() => setExportOpen((v) => !v)} className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5">
          <Download className="h-3.5 w-3.5" />
          Export
          <ChevronDown className="h-3 w-3" />
        </button>
        {exportOpen && (
          <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-white/10 bg-[#0D1220] p-1 shadow-xl">
            {(["qiskit", "qasm", "png", "json"] as const).map((kind) => (
              <button key={kind} type="button" onClick={() => handleExport(kind)} className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10">
                {kind === "qiskit" ? "Qiskit (.py)" : kind === "qasm" ? "OpenQASM 2.0" : kind === "png" ? "PNG (circuit)" : "JSON"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <select value={shots} onChange={(e) => setShots(Number(e.target.value))} className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none">
          {SHOT_OPTIONS.map((s) => (
            <option key={s} value={s} className="bg-[#0D1220]">
              {s} shots
            </option>
          ))}
        </select>
        <button type="button" onClick={onToggleTutor} className="rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/70 hover:bg-white/5">
          AI Tutor
        </button>
        <button type="button" onClick={run} className={cn("flex items-center gap-1.5 rounded-md bg-[#00D4FF] px-3 py-1.5 text-xs font-semibold text-[#0A0E17] transition-transform hover:scale-[1.03]")}>
          <Play className="h-3.5 w-3.5" />
          Run
        </button>
      </div>
    </div>
  )
}
