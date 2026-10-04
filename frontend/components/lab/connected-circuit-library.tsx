"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLab } from "@/lib/lab-context"
import type { GatePlacement, GateType } from "@/lib/lab-data"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import type { CircuitRecord, CircuitSummary } from "@/lib/services/learning-loop-api"
import { useSession } from "@/store/use-session"

export function ConnectedCircuitLibrary({ allowedGates, steps }: { allowedGates: GateType[]; steps: number }) {
  const { gates, replaceGates, rememberSavedCircuit } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const [name, setName] = useState("Superposition circuit")
  const [selected, setSelected] = useState<CircuitRecord | null>(null)
  const [items, setItems] = useState<CircuitSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")
  const [reload, setReload] = useState(0)
  const sameOwner = () => useSession.getState().mode === "connected" && useSession.getState().user?.id === learnerId

  useEffect(() => {
    if (!learnerId) return
    let active = true
    setLoading(true)
    setError("")
    void connectedLearningLoopApi().listCircuits({ limit: 20 })
      .then((page) => { if (active) { setItems(page.items); setCursor(page.next_cursor) } })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load saved circuits.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [learnerId, reload])

  async function loadMore() {
    if (!cursor || busy || !learnerId) return
    setBusy(true)
    setError("")
    try {
      const page = await connectedLearningLoopApi().listCircuits({ limit: 20, cursor })
      if (!sameOwner()) return
      setItems((previous) => [...previous, ...page.items.filter((item) => !previous.some((saved) => saved.id === item.id))])
      setCursor(page.next_cursor)
    } catch (cause) {
      if (sameOwner()) setError(cause instanceof Error ? cause.message : "Could not load more circuits.")
    } finally {
      if (sameOwner()) setBusy(false)
    }
  }

  async function openCircuit(id: string) {
    if (busy || !learnerId) return
    setBusy(true)
    setError("")
    setStatus("")
    try {
      const circuit = await connectedLearningLoopApi().getCircuit(id)
      if (!sameOwner()) return
      const snapshot = circuit.snapshot
      if (snapshot.qubits !== 2 || snapshot.gates.some((gate) =>
        !allowedGates.includes(gate.type as GateType) || gate.step < 0 || gate.step >= steps ||
        gate.qubit < 0 || gate.qubit >= 2 || gate.control2 !== undefined || gate.theta !== undefined ||
        (gate.target !== undefined && (gate.target < 0 || gate.target >= 2))
      )) {
        throw new Error("This circuit uses gates or steps outside the Superposition builder. Open a compatible two-qubit circuit.")
      }
      const loaded: GatePlacement[] = snapshot.gates.map((gate) => ({
        id: gate.id, step: gate.step, qubit: gate.qubit, gate: gate.type as GateType,
        ...(gate.target === undefined ? {} : { target: gate.target }),
      }))
      replaceGates(loaded)
      rememberSavedCircuit(circuit)
      setSelected(circuit)
      setName(snapshot.name)
      setStatus(`Opened ${snapshot.name}, revision ${circuit.revision}. The editor now uses this saved circuit.`)
    } catch (cause) {
      if (sameOwner()) setError(cause instanceof Error ? cause.message : "Could not open the saved circuit.")
    } finally {
      if (sameOwner()) setBusy(false)
    }
  }

  async function saveCircuit(asNew: boolean) {
    if (busy || !learnerId) return
    const cleanName = name.trim()
    if (!cleanName) { setError("Give the circuit a name before saving."); return }
    setBusy(true)
    setError("")
    setStatus("")
    try {
      const body = {
        name: cleanName,
        qubits: 2,
        gates: gates.map(({ id, gate, step, qubit, target }) => ({
          id, type: gate, step, qubit, ...(target === undefined ? {} : { target }),
        })),
      }
      const api = connectedLearningLoopApi()
      const saved = !asNew && selected
        ? await api.updateCircuit(selected.id, body, selected.revision)
        : await api.createCircuit(body, crypto.randomUUID())
      if (!sameOwner()) return
      setSelected(saved)
      rememberSavedCircuit(saved)
      setName(saved.snapshot.name)
      setStatus(`Saved ${saved.snapshot.name}, revision ${saved.revision}. This circuit is available from your account.`)
      setReload((value) => value + 1)
    } catch (cause) {
      if (sameOwner()) setError(cause instanceof Error ? cause.message : "Could not save the circuit.")
    } finally {
      if (sameOwner()) setBusy(false)
    }
  }

  if (!learnerId) return <p className="mt-5 text-xs text-muted-foreground">Sign in to save and reopen circuits across devices. <Link href="/login" className="font-semibold text-primary underline">Go to login</Link></p>

  return <section aria-label="Saved circuit library" className="mt-6 rounded-xl border border-border bg-card/60 p-5">
    <h3 className="text-sm font-semibold">Your saved circuits</h3>
    <p className="mt-1 text-xs text-muted-foreground">Save this two-qubit draft or open a circuit from your account. Opening replaces the gates in this editor.</p>
    <label htmlFor="connected-circuit-name" className="mt-4 block text-xs font-medium">Circuit name</label>
    <input id="connected-circuit-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={() => void saveCircuit(false)} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black disabled:opacity-50">{selected ? `Save revision ${selected.revision + 1}` : "Save circuit"}</button>
      {selected && <button type="button" disabled={busy} onClick={() => void saveCircuit(true)} className="rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">Save as new</button>}
    </div>
    {status && <p role="status" aria-live="polite" className="mt-3 text-xs text-primary">{status}</p>}
    {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
    {loading && <p role="status" className="mt-4 text-xs text-muted-foreground">Loading saved circuits…</p>}
    {!loading && items.length === 0 && <p className="mt-4 text-xs text-muted-foreground">No saved circuits yet.</p>}
    {items.length > 0 && <ul className="mt-4 space-y-2">{items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
      <span><span className="font-semibold">{item.name}</span><span className="ml-2 text-muted-foreground">revision {item.revision} · {item.gate_count} gates</span></span>
      <button type="button" disabled={busy} onClick={() => void openCircuit(item.id)} className="font-semibold text-primary underline disabled:opacity-50">Open</button>
    </li>)}</ul>}
    {cursor && <button type="button" disabled={busy} onClick={() => void loadMore()} className="mt-3 text-xs font-semibold text-primary underline disabled:opacity-50">Load more circuits</button>}
  </section>
}
