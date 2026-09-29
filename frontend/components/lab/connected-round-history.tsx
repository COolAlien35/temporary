"use client"

import { useEffect, useState } from "react"
import { useLab } from "@/lib/lab-context"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { connectedSuperpositionForRun, type ConnectedLabResult } from "@/lib/services/connected-lab-run"
import type { AgreementHistory } from "@/lib/services/learning-loop-api"
import { useSession } from "@/store/use-session"

export function ConnectedRoundHistory({ result }: { result: ConnectedLabResult }) {
  const { showConnectedResult } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const [history, setHistory] = useState<AgreementHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    void connectedLearningLoopApi().getAgreementHistory(result.learningSessionId)
      .then((saved) => { if (active) setHistory(saved) })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load recent runs.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [result.learningSessionId, reload])

  async function openRun(runId: string) {
    if (opening || runId === result.run.id) return
    setOpening(runId)
    setError("")
    try {
      const saved = await connectedSuperpositionForRun(connectedLearningLoopApi(), runId)
      if (useSession.getState().user?.id === learnerId && useSession.getState().mode === "connected") showConnectedResult(saved)
    } catch (cause) {
      if (useSession.getState().user?.id === learnerId) setError(cause instanceof Error ? cause.message : "Could not open that saved run.")
    } finally {
      if (useSession.getState().user?.id === learnerId) setOpening(null)
    }
  }

  return <section aria-label="Recent saved Superposition rounds" className="mt-6 rounded-xl border border-border bg-card/60 p-5">
    <h3 className="text-sm font-semibold">Recent saved rounds</h3>
    <p className="mt-1 text-xs text-muted-foreground">Up to five recent verified comparisons for this lesson version. Open a round to review its exact saved run.</p>
    {loading && <p role="status" className="mt-3 text-xs text-muted-foreground">Loading recent rounds…</p>}
    {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error} <button type="button" onClick={() => setReload((n) => n + 1)} className="underline">Retry</button></p>}
    {!loading && history?.items.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No verified comparisons are available in the recent history window.</p>}
    {history && <ol className="mt-3 space-y-2">{history.items.map((item) => <li key={item.run_id}>
      <button type="button" disabled={Boolean(opening) || item.run_id === result.run.id} onClick={() => void openRun(item.run_id)} aria-current={item.run_id === result.run.id ? "true" : undefined} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs hover:border-primary/50 disabled:opacity-70">
        <span><span className="font-semibold text-foreground">{new Date(item.locked_at).toLocaleString()}</span><span className="ml-2 text-muted-foreground">{item.backend} · {item.shots?.toLocaleString() ?? "—"} shots · revision {item.circuit_revision}</span></span>
        <span className="font-medium text-primary">{opening === item.run_id ? "Opening…" : item.run_id === result.run.id ? "Current run" : `${(item.prediction_match * 100).toFixed(1)}% agreement · Open`}</span>
      </button>
    </li>)}</ol>}
    {history && history.items.length > 0 && <div className="mt-5 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="mb-2 text-left text-muted-foreground">Prediction agreement history. Agreement is a comparison with the saved run; confidence is the learner&apos;s self-rating when predicting.</caption>
        <thead><tr className="border-b border-border"><th scope="col" className="py-2">Round</th><th scope="col">Agreement</th><th scope="col">Self-rated confidence</th><th scope="col">Result basis</th><th scope="col">Shots</th></tr></thead>
        <tbody>{history.items.map((item) => <tr key={item.run_id} className="border-b border-border/50">
          <th scope="row" className="py-2">{new Date(item.locked_at).toLocaleDateString()}</th>
          <td className="font-mono">{(item.prediction_match * 100).toFixed(1)}%</td>
          <td className="font-mono">{item.confidence == null ? "Not recorded" : `${(item.confidence * 100).toFixed(0)}%`}</td>
          <td>{item.comparison_basis.replaceAll("_", " ")}</td>
          <td className="font-mono">{item.shots?.toLocaleString() ?? "Not applicable"}</td>
        </tr>)}</tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">These saved rounds do not establish confidence calibration or learning gains. Shot counts and result bases may differ.</p>
    </div>}
    {history?.older_records_not_scanned && <p className="mt-3 text-xs text-muted-foreground">Older records were outside this bounded history window.</p>}
  </section>
}
