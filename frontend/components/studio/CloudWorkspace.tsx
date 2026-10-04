"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "@/store/use-session"
import { useStudio } from "@/store/use-studio"
import { useCloudStudio, draftKey, studioUrl } from "@/store/use-cloud-studio"

export function CloudWorkspace() {
  const mode = useSession((state) => state.mode)
  const owner = useSession((state) => state.user?.id)
  const party = useStudio((state) => state.partyActive)
  const circuit = useStudio((state) => state.circuit)
  const cloud = useCloudStudio()
  const demoDraft = useRef(useStudio.getState().circuit)
  const [revision, setRevision] = useState(1)
  useEffect(() => {
    if (mode !== "connected" || !owner) return
    useCloudStudio.getState().scope(owner)
    useStudio.setState({ privateOwner: owner, privateDraft: demoDraft.current, circuit: { name: "Untitled circuit", qubits: 2, gates: [] }, past: [], future: [], clipboard: [], selectedGateIds: [], result: undefined, previousResult: undefined, lastRunCircuit: undefined, stepIndex: null })
    const url = new URL(window.location.href)
    const id = url.searchParams.get("circuit")
    const run = url.searchParams.get("run")
    const tutor = url.searchParams.get("tutor")
    if (!url.searchParams.has("party") && !url.hash.startsWith("#invite=")) {
      void useCloudStudio.getState().list()
      if (id) void useCloudStudio.getState().open(id).then(async () => {
        if (useCloudStudio.getState().owner !== owner || useCloudStudio.getState().record?.id !== id) return
        studioUrl(id, run ?? undefined, tutor ?? undefined)
        if (run) await useCloudStudio.getState().recoverRun(run, id)
        if (tutor) await useCloudStudio.getState().recoverTutor(tutor)
      })
    }
    return () => {
      useCloudStudio.getState().scope(null)
      useStudio.setState({ privateOwner: null, privateDraft: null, circuit: demoDraft.current, past: [], future: [], clipboard: [], selectedGateIds: [], result: undefined, previousResult: undefined, lastRunCircuit: undefined, stepIndex: null })
    }
  }, [mode, owner])
  if (mode !== "connected" || !owner || party) return null
  const dirty = !cloud.record || draftKey(circuit) !== draftKey(cloud.record.snapshot)
  const probabilities = cloud.run?.result?.probabilities as Record<string, number> | undefined
  const counts = cloud.run?.result?.counts as Record<string, number> | undefined
  return <section aria-label="Private circuit workspace" className="mb-3 space-y-2 rounded-xl border border-cyan-400/25 bg-[#101722] p-3 text-white">
    <p role="status" aria-live="polite" className="text-xs text-cyan-200">{cloud.busy ? "Saving or opening circuit…" : cloud.record ? `${cloud.record.archived ? "Archived" : "Saved"} circuit · revision ${cloud.record.revision}${dirty ? " · unsaved edits" : " · up to date"}` : "New private draft · save to your account to reopen on another device"}</p>
    {cloud.error && <p role="alert" className="text-xs text-rose-300">{cloud.error}</p>}
    <div className="flex flex-wrap gap-3 text-xs">
      <button disabled={cloud.busy} onClick={() => void cloud.save(true)} className="text-cyan-200 underline">Save as new circuit</button>
      {cloud.record && <button disabled={cloud.busy} onClick={() => void cloud.open(cloud.record!.id)} className="underline">Reload cloud version (discard edits)</button>}
      <button disabled={cloud.busy || cloud.running} onClick={() => cloud.newDraft()} className="underline">New private circuit</button>
      {cloud.record && <label>Historical revision <input aria-label="Historical circuit revision" type="number" min={1} max={cloud.record.revision} value={revision} onChange={(event) => setRevision(Number(event.target.value))} className="ml-1 w-12 bg-black/30 p-1" /><button disabled={cloud.busy || revision < 1 || revision > cloud.record.revision} onClick={() => void cloud.open(cloud.record!.id, revision)} className="ml-2 underline">Load revision as new draft</button></label>}
    </div>
    {cloud.conflict && <p className="text-xs text-amber-200">Your edits are preserved. Reload the cloud version or save them as a new circuit.</p>}
    <p className="text-xs text-white/45">Cloud saves are private. Aer uses the exact saved revision and ideal circuits; browser noise controls apply to local preview. Unsaved edits are held in this tab.</p>
    {cloud.run && <details open><summary className="cursor-pointer text-xs">Saved Aer run · {cloud.run.status} · circuit revision {cloud.run.circuit_revision}</summary>
      <p className="mt-2 text-xs">Run ID: {cloud.run.id} · {cloud.run.shots} shots · {cloud.run.backend}{cloud.run.error_code && ` · ${cloud.run.error_code}`}</p>
      {cloud.run.circuit_revision !== cloud.record?.revision || dirty ? <p className="text-xs text-amber-200">This saved run describes an earlier circuit revision or draft.</p> : null}
      {cloud.run.status === "succeeded" && counts && <table aria-label="Saved Aer outcome comparison" className="mt-2 w-full text-left text-xs"><thead><tr><th>Outcome</th><th>Ideal probability</th><th>Sampled count</th></tr></thead><tbody>{Object.keys(probabilities ?? counts).map((label) => <tr key={label}><th>|{label}⟩</th><td>{probabilities?.[label] === undefined ? "Unavailable" : `${(probabilities[label] * 100).toFixed(2)}%`}</td><td>{counts[label] ?? 0}</td></tr>)}</tbody></table>}
      <button disabled={cloud.running} onClick={() => void cloud.recoverRun(cloud.run!.id, cloud.run!.circuit_id)} className="mt-2 text-xs underline">Recheck saved run</button>
    </details>}
    {cloud.record && <button disabled={cloud.asking} onClick={() => void cloud.explain()} className="text-xs text-cyan-200 underline">{cloud.asking ? "Asking saved-circuit tutor…" : "Explain saved circuit"}</button>}
    <ol aria-label="Saved circuit tutor messages" className="space-y-1 text-xs">{cloud.messages.map((message) => <li key={message.id}>{message.response_text ?? `Tutor request ${message.status}${message.error_code ? ` · ${message.error_code}` : ""}`} · {message.role.replaceAll("_", " ")} · saved message {message.id}</li>)}</ol>
  </section>
}
