"use client"

import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useStudio } from "@/store/use-studio"

export function MyCircuits() {
  const savedCircuits = useStudio((s) => s.savedCircuits)
  const loadSaved = useStudio((s) => s.loadSaved)
  const deleteSaved = useStudio((s) => s.deleteSaved)

  if (savedCircuits.length === 0) {
    return <p className="text-xs text-white/40">Nothing saved yet. Use &ldquo;Save&rdquo; in the toolbar to keep a circuit here.</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {savedCircuits.map((c) => (
        <div key={c.id} className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <button
            type="button"
            onClick={() => {
              loadSaved(c.id)
              toast.success(`Loaded "${c.name}"`)
            }}
            className="flex-1 text-left"
          >
            <p className="truncate text-xs font-semibold text-white">{c.name}</p>
            <p className="mt-0.5 text-[11px] text-white/45">
              {c.qubits} qubit{c.qubits > 1 ? "s" : ""} · {c.gates.length} gates
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              deleteSaved(c.id)
              toast("Circuit deleted")
            }}
            aria-label={`Delete ${c.name}`}
            className="rounded-md p-1 text-white/30 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
