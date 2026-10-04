"use client"

import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useStudio } from "@/store/use-studio"
import { useSession } from "@/store/use-session"
import { useCloudStudio } from "@/store/use-cloud-studio"

function PrivateCircuits() {
  const cloud = useCloudStudio()
  const party = useStudio((state) => state.partyActive)
  const drafts = useStudio((state) => state.savedCircuits)
  return <section aria-label="Private circuit library" className="space-y-3 text-xs text-white">
    <p className="text-white/50">Saved to your account. Open a circuit here on any device.</p>
    <div className="flex flex-wrap gap-2"><button disabled={cloud.loading} className="underline" onClick={() => void cloud.list(false)}>Active circuits</button><button disabled={cloud.loading} className="underline" onClick={() => void cloud.list(true)}>Archived circuits</button><button disabled={cloud.loading} className="underline" onClick={() => void cloud.list()}>Refresh library</button></div>
    {party && <p>Leave the party to open or save private circuits.</p>}
    {cloud.loading && <p role="status">Loading private circuits…</p>}
    {!cloud.loading && !cloud.items.length && <p>No {cloud.archived ? "archived" : "saved"} circuits in this account.</p>}
    {cloud.items.map((item) => <div key={item.id} className="space-y-2 rounded-lg border border-white/10 p-2"><button disabled={cloud.busy || party} onClick={() => void cloud.open(item.id)} className="w-full text-left"><strong>{item.name}</strong><p className="text-white/50">revision {item.revision} · {item.qubits} qubits · {item.gate_count} gates</p></button><button disabled={cloud.busy || party} onClick={() => void cloud.archive(item, !item.archived)} className="underline">{item.archived ? "Restore" : "Archive"} {item.name}</button></div>)}
    {cloud.cursor && <button disabled={cloud.loading} className="underline" onClick={() => void cloud.list(cloud.archived, true)}>Load more circuits</button>}
    {drafts.length > 0 && <details><summary className="cursor-pointer">Import a browser draft</summary><p className="mt-2 text-white/50">Select a local circuit to validate and save a private cloud copy.</p>{drafts.map((draft) => <button key={draft.id} disabled={cloud.busy || party} onClick={() => { cloud.newDraft(draft); void cloud.save(true) }} className="mt-2 block text-left underline">Import {draft.name}</button>)}</details>}
  </section>
}

export function MyCircuits() {
  const mode = useSession((state) => state.mode)
  const savedCircuits = useStudio((s) => s.savedCircuits)
  const loadSaved = useStudio((s) => s.loadSaved)
  const deleteSaved = useStudio((s) => s.deleteSaved)

  if (mode === "connected") return <PrivateCircuits />

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
