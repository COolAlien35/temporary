"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLab } from "@/lib/lab-context"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { ConnectedRunUnavailableError, connectedCircuitIsStale, connectedSuperpositionForRun, latestConnectedSuperposition } from "@/lib/services/connected-lab-run"
import { useSession } from "@/store/use-session"
import { StageHeader } from "./stage-header"
import { ConnectedRoundHistory } from "./connected-round-history"

export function ConnectedObserve() {
  const { connectedResult, showConnectedResult, gates, goToStage, advanceStage } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [runUnavailable, setRunUnavailable] = useState<ConnectedRunUnavailableError | null>(null)
  const [empty, setEmpty] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!learnerId || (connectedResult && reload === 0)) return
    let active = true
    const runId = new URLSearchParams(window.location.search).get("run")
    setLoading(true)
    setError("")
    setRunUnavailable(null)
    setEmpty(false)
    const api = connectedLearningLoopApi()
    void (runId ? connectedSuperpositionForRun(api, runId) : latestConnectedSuperposition(api))
      .then((saved) => {
        if (!active) return
        if (saved) showConnectedResult(saved)
        else setEmpty(true)
      })
      .catch((cause) => {
        if (!active) return
        if (cause instanceof ConnectedRunUnavailableError) setRunUnavailable(cause)
        else setError(cause instanceof Error ? cause.message : "Could not load the saved comparison.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [connectedResult, learnerId, reload, showConnectedResult])

  const pair = connectedResult?.pair
  const run = connectedResult?.run
  const stale = run ? connectedCircuitIsStale(gates, run) : false

  if (!learnerId) return <div className="mx-auto max-w-3xl"><StageHeader eyebrow="Stage 5 of 9 · Verified Observation" title="Prediction vs. Actual" /><p role="status" className="mt-4 text-sm text-muted-foreground">Sign in to load a saved Aer comparison.</p><Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">Go to login →</Link></div>

  return <div className="mx-auto max-w-3xl">
    <StageHeader eyebrow="Stage 5 of 9 · Verified Observation" title="Prediction vs. Actual" />
    <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">
      {loading ? "Loading your saved Aer comparison…" : pair ? `Saved Aer comparison ready. Prediction agreement ${(pair.prediction_match * 100).toFixed(1)} percent.` : empty ? "No completed Superposition comparison was found in your ten most recent sessions." : runUnavailable?.message || error || "Run the circuit on Aer to compare your prediction."}
    </p>
    {(error || runUnavailable) && <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold">{runUnavailable?.kind === "pending" ? "Check again" : "Retry"}</button>}
    {empty && <button type="button" onClick={() => goToStage(4)} className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">Go to Run</button>}
    {pair && run && <section aria-label="Saved prediction versus actual comparison" className="mt-5 rounded-xl border border-border bg-card/60 p-5">
      <h3 className="text-lg font-semibold">Saved Aer result</h3>
      <p className="mt-2 text-xs text-muted-foreground">{pair.backend} · {pair.shots?.toLocaleString() ?? run.shots.toLocaleString()} shots · {pair.comparison_basis.replaceAll("_", " ")} · revision {pair.circuit_revision} · agreement {(pair.prediction_match * 100).toFixed(1)}% ({pair.metric_version})</p>
      {pair.comparison_basis === "sampled_frequency" && (pair.shots ?? run.shots) < 512 && <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">This run used few shots. Sampled frequencies may vary noticeably on another run.</p>}
      {stale && <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">The current editor differs from this saved circuit snapshot. These results still describe revision {pair.circuit_revision}.</p>}
      <div className="mt-5 flex h-40 items-end justify-around gap-4" aria-hidden="true">{pair.basis_labels.map((label, index) => <div key={label} className="flex h-full flex-1 items-end justify-center gap-2"><div className="w-5 rounded-t border-2 border-dashed border-muted-foreground/60" style={{ height: `${Math.max(pair.prediction_vector[index] * 100, 2)}%` }} /><div className="w-5 rounded-t bg-primary" style={{ height: `${Math.max(pair.simulated_vector[index] * 100, 2)}%` }} /></div>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">Dashed: prediction · Solid: sampled actual</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left text-muted-foreground">Server-derived outcome comparison. Difference is actual minus predicted, in percentage points.</caption><thead><tr className="border-b border-border"><th scope="col" className="py-2">Outcome</th><th scope="col">Predicted</th><th scope="col">Actual</th><th scope="col">Difference</th></tr></thead><tbody>{pair.basis_labels.map((label, index) => {
        const predicted = pair.prediction_vector[index] * 100
        const actual = pair.simulated_vector[index] * 100
        const delta = actual - predicted
        return <tr key={label} className="border-b border-border/50"><th scope="row" className="py-2 font-mono">|{label}⟩</th><td className="font-mono">{predicted.toFixed(1)}%</td><td className="font-mono">{actual.toFixed(1)}%</td><td className="font-mono">{delta > 0 ? "+" : ""}{delta.toFixed(1)} pts</td></tr>
      })}</tbody></table></div>
      <p className="mt-4 break-all text-xs text-muted-foreground">Run ID: <span className="font-mono">{run.id}</span></p>
      <button type="button" onClick={() => advanceStage(5, 6)} className="mt-5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black">Discuss this run with Lab Partner →</button>
      <button type="button" onClick={() => goToStage(4)} className="mt-5 rounded-full border border-border px-4 py-2 text-sm font-semibold">Return to Run</button>
    </section>}
    {connectedResult && <ConnectedRoundHistory key={`${learnerId}:${connectedResult.learningSessionId}`} result={connectedResult} />}
  </div>
}
