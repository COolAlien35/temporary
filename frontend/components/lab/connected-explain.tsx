"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useLab } from "@/lib/lab-context"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { ConnectedRunUnavailableError, RECENT_COMPARISON_EMPTY_MESSAGE, connectedCircuitIsStale, connectedSuperpositionForRun, latestConnectedSuperposition, type ConnectedLabResult } from "@/lib/services/connected-lab-run"
import { useSession } from "@/store/use-session"
import { ConnectedLabPartnerChat } from "./connected-lab-partner-chat"
import { StageHeader } from "./stage-header"

export function ConnectedExplain() {
  const { connectedResult, gates, rememberConnectedResult, goToStage } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const runId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("run")
  const [recovered, setRecovered] = useState<ConnectedLabResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [runUnavailable, setRunUnavailable] = useState<ConnectedRunUnavailableError | null>(null)
  const [empty, setEmpty] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!learnerId || (connectedResult && (!runId || connectedResult.run.id.toLowerCase() === runId.toLowerCase()))) return
    let active = true
    setLoading(true)
    setError("")
    setRunUnavailable(null)
    setEmpty(false)
    void (runId ? connectedSuperpositionForRun(connectedLearningLoopApi(), runId) : latestConnectedSuperposition(connectedLearningLoopApi()))
      .then((saved) => { if (active) { setRecovered(saved); setEmpty(!saved); if (saved) rememberConnectedResult(saved) } })
      .catch((cause) => {
        if (!active) return
        if (cause instanceof ConnectedRunUnavailableError) setRunUnavailable(cause)
        else setError(cause instanceof Error ? cause.message : "Could not load the saved run.")
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [connectedResult, learnerId, reload, rememberConnectedResult, runId])

  const matchesRun = (result: ConnectedLabResult | null) => result && (!runId || result.run.id.toLowerCase() === runId.toLowerCase()) ? result : null
  const result = matchesRun(connectedResult) ?? matchesRun(recovered)
  const pair = result?.pair
  const run = result?.run

  if (!learnerId) return <div className="mx-auto max-w-3xl"><StageHeader eyebrow="Stage 6 of 9 · Saved Run Discussion" title="Discuss Your Aer Result" /><p role="status" className="mt-4 text-sm text-muted-foreground">Sign in to load your saved run and tutor messages.</p><Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">Go to login →</Link></div>

  return <div>
    <StageHeader eyebrow="Stage 6 of 9 · Saved Run Discussion" title="Discuss Your Aer Result" action={pair && <button type="button" onClick={() => goToStage(5)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Review comparison</button>} />
    <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{loading ? "Loading the saved Aer result…" : pair ? `Server-derived prediction agreement ${(pair.prediction_match * 100).toFixed(1)} percent.` : empty ? RECENT_COMPARISON_EMPTY_MESSAGE : runUnavailable?.message || error || "Open a completed Aer run to discuss its comparison."}</p>
    {(error || runUnavailable) && <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold">{runUnavailable?.kind === "pending" ? "Check again" : "Retry"}</button>}
    {((runUnavailable && runUnavailable.kind !== "pending") || empty) && <button type="button" onClick={() => goToStage(4)} className="mt-4 ml-3 rounded-full border border-border px-4 py-2 text-sm font-semibold">Find another saved run</button>}
    {pair && <p className="mt-3 text-xs text-muted-foreground">Connected Debug and Challenge grading are coming later. This saved discussion does not award a score or XP.</p>}
    {pair && run && result && <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Saved run summary</h3>
        <p className="mt-2 text-xs text-muted-foreground">{pair.backend} · {pair.shots ?? run.shots} shots · {pair.comparison_basis.replaceAll("_", " ")} · circuit revision {pair.circuit_revision} · agreement {(pair.prediction_match * 100).toFixed(1)}% ({pair.metric_version})</p>
        {connectedCircuitIsStale(gates, run) && <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">The current editor differs from this saved circuit. This discussion uses the saved revision.</p>}
        {(pair.shots ?? run.shots) < 512 && pair.comparison_basis === "sampled_frequency" && <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">This run used few shots; sampled frequencies may vary on another run.</p>}
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card/60 p-4"><table className="w-full text-left text-xs"><caption className="mb-2 text-left text-muted-foreground">Saved prediction versus sampled actual outcome; difference in percentage points.</caption><thead><tr className="border-b border-border"><th scope="col" className="py-2">Outcome</th><th scope="col">Predicted</th><th scope="col">Actual</th><th scope="col">Difference</th></tr></thead><tbody>{pair.basis_labels.map((label, index) => {
          const predicted = pair.prediction_vector[index] * 100
          const actual = pair.simulated_vector[index] * 100
          const difference = actual - predicted
          return <tr key={label} className="border-b border-border/50"><th scope="row" className="py-2 font-mono">|{label}⟩</th><td>{predicted.toFixed(1)}%</td><td>{actual.toFixed(1)}%</td><td>{difference > 0 ? "+" : ""}{difference.toFixed(1)} pts</td></tr>
        })}</tbody></table></div>
        <p className="mt-3 break-all text-xs text-muted-foreground">Saved run: <span className="font-mono">{run.id}</span></p>
      </div>
      <ConnectedLabPartnerChat key={`${learnerId}:${result.learningSessionId}:${run.id}`} result={result} />
    </div>}
  </div>
}
