"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { GATE_DEFS } from "@/lib/studio/gates"
import type { StudioGate, StudioGateType } from "@/lib/studio/types"
import { useStudio } from "@/store/use-studio"

export function GateSequence() {
  const circuit = useStudio((s) => s.circuit)
  const selected = useStudio((s) => s.selectedGateIds)
  const stepIndex = useStudio((s) => s.stepIndex)
  const [draft, setDraft] = useState<StudioGate | null>(null)
  const [message, setMessage] = useState("")
  const [type, setType] = useState<StudioGateType>("H")
  const [qubit, setQubit] = useState(0)
  const [step, setStep] = useState(0)
  const focusAfter = useRef<string | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const region = useRef<HTMLDivElement>(null)
  const gates = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit || a.id.localeCompare(b.id))
  const steps = [...new Set(gates.map((gate) => gate.step))]
  const highlight = stepIndex === null ? null : steps[stepIndex]
  useLayoutEffect(() => {
    if (!focusAfter.current) return
    const button = [...(region.current?.querySelectorAll<HTMLButtonElement>("button[data-gate-id]") ?? [])].find((element) => element.dataset.gateId === focusAfter.current)
    ;(button ?? addButton.current)?.focus()
    focusAfter.current = null
  }, [circuit])
  function shape(gate: StudioGate): StudioGate {
    const def = GATE_DEFS[gate.type]
    return { id: gate.id, type: gate.type, qubit: gate.qubit, step: gate.step, ...(def.slots >= 2 ? { target: gate.target ?? (gate.qubit + 1) % circuit.qubits } : {}), ...(def.slots === 3 ? { control2: gate.control2 ?? (gate.qubit + 2) % circuit.qubits } : {}), ...(def.hasAngle ? { theta: gate.theta ?? Math.PI / 2 } : {}) }
  }
  function valid(gate: StudioGate): boolean {
    const positions = [gate.qubit, gate.target, gate.control2].filter((q): q is number => q !== undefined)
    if (positions.some((q) => !Number.isInteger(q) || q < 0 || q >= circuit.qubits) || new Set(positions).size !== positions.length || !Number.isInteger(gate.step) || gate.step < 0 || gate.step > 511 || (gate.theta !== undefined && (!Number.isFinite(gate.theta) || Math.abs(gate.theta) > 100 * Math.PI))) { setMessage("Choose distinct qubits within this circuit and a valid step or angle."); return false }
    if (circuit.gates.some((other) => other.id !== gate.id && other.step === gate.step && [other.qubit, other.target, other.control2].some((q) => q !== undefined && positions.includes(q)))) { setMessage("Another gate occupies this qubit at that step. Choose another step."); return false }
    return true
  }
  function qubitLabel(gate: StudioGate): string {
    if (gate.type === "CCX") return `controls q${gate.qubit}, q${gate.target}; target q${gate.control2}`
    if (gate.type === "SWAP") return `swap q${gate.qubit}, q${gate.target}`
    if (gate.target !== undefined) return `control q${gate.qubit}; target q${gate.target}`
    return `qubit q${gate.qubit}`
  }
  function add() {
    const gate = shape({ id: crypto.randomUUID(), type, qubit, step })
    if (!valid(gate)) return
    const { id: _id, ...body } = gate
    useStudio.getState().addGate(body)
    setStep(step + 1)
    setMessage(`Added ${GATE_DEFS[type].label} at step ${step}.`)
  }
  return <div ref={region} className="border-t border-white/10 bg-[#0A0E17] p-3 text-xs text-white/75">
    <details open><summary className="cursor-pointer font-semibold">Readable gate sequence</summary>
      <div className="mt-2 max-h-44 overflow-auto"><table aria-label="Circuit gate sequence" className="w-full text-left"><thead><tr><th scope="col">Step</th><th scope="col">Gate</th><th scope="col">Qubits / radians</th><th scope="col">Actions</th></tr></thead><tbody>{gates.map((gate, index) => <tr key={gate.id} aria-selected={selected.includes(gate.id)} className={highlight === gate.step ? "bg-cyan-400/15" : ""}><th scope="row" className="p-1">{gate.step}</th><td>{gate.type} · {GATE_DEFS[gate.type].label}</td><td>{qubitLabel(gate)}{gate.theta !== undefined ? `, θ=${gate.theta.toFixed(3)}` : ""}</td><td className="space-x-2"><button data-gate-id={gate.id} aria-label={`Edit ${gate.type} at step ${gate.step}`} className="underline" onClick={() => { useStudio.getState().select([gate.id]); setDraft({ ...gate }) }}>Edit</button><button aria-label={`Delete ${gate.type} at step ${gate.step}`} className="underline" onClick={() => { focusAfter.current = gates[index + 1]?.id ?? gates[index - 1]?.id ?? "add"; useStudio.getState().removeGate(gate.id); setDraft(null); setMessage(`Deleted ${gate.type}. Undo restores it.`) }}>Delete</button></td></tr>)}</tbody></table>{gates.length === 0 && <p className="py-2">No gates. Select a gate, qubit, and step below.</p>}</div>
      <form onSubmit={(event) => { event.preventDefault(); add() }} className="mt-2 flex flex-wrap items-end gap-2"><label>Gate<select aria-label="Sequence gate type" value={type} onChange={(event) => setType(event.target.value as StudioGateType)} className="ml-1 rounded bg-slate-900 p-1">{Object.keys(GATE_DEFS).map((key) => <option key={key} value={key}>{key}</option>)}</select></label><label>Qubit<input aria-label="Sequence qubit" type="number" min={0} max={circuit.qubits - 1} value={qubit} onChange={(event) => setQubit(Number(event.target.value))} className="ml-1 w-12 rounded bg-slate-900 p-1" /></label><label>Step<input aria-label="Sequence step" type="number" min={0} max={511} value={step} onChange={(event) => setStep(Number(event.target.value))} className="ml-1 w-14 rounded bg-slate-900 p-1" /></label><button ref={addButton} type="submit" className="rounded border border-cyan-400/40 px-2 py-1 text-cyan-200">Add gate to sequence</button></form>
      {draft && circuit.gates.some((gate) => gate.id === draft.id) && <form aria-label="Edit sequence gate" className="mt-2 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const gate = shape(draft); if (!valid(gate)) return; focusAfter.current = gate.id; useStudio.getState().updateGate(gate.id, gate); setDraft(null); setMessage(`Saved ${gate.type} at step ${gate.step}.`) }}>
        {(["step", "qubit", ...(GATE_DEFS[draft.type].slots >= 2 ? ["target"] : []), ...(GATE_DEFS[draft.type].slots === 3 ? ["control2"] : []), ...(GATE_DEFS[draft.type].hasAngle ? ["theta"] : [])] as const).map((field) => <label key={field}>{field}<input aria-label={`Edit gate ${field}`} type="number" step={field === "theta" ? "any" : 1} value={draft[field as keyof StudioGate] ?? 0} onChange={(event) => setDraft({ ...draft, [field]: Number(event.target.value) })} className="ml-1 w-16 rounded bg-slate-900 p-1" /></label>)}<button type="submit" className="text-cyan-200 underline">Save gate changes</button><button type="button" onClick={() => setDraft(null)}>Cancel</button>
      </form>}
      <p role="status" aria-live="polite" className="mt-1 text-cyan-200">{message}</p>
    </details>
  </div>
}
