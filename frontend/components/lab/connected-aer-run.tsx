"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useLab } from "@/lib/lab-context"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { RECENT_COMPARISON_EMPTY_MESSAGE, latestConnectedSuperposition, latestUnpairedConnectedPrediction, newConnectedLabKeys, runConnectedSuperposition, type ConnectedLabInput, type ConnectedLabKeys } from "@/lib/services/connected-lab-run"
import { StageHeader } from "./stage-header"
import { useSession } from "@/store/use-session"

const SHOTS = [128, 512, 1024, 4096]

export function ConnectedAerRun() {
  const { gates, hypothesis, confidence, shots, setShots, predictionLocked, connectedPrediction, restoreConnectedPrediction, consumeConnectedPrediction, savedCircuit, connectedResult, showConnectedResult, openConnectedRun } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const api = useMemo(() => connectedLearningLoopApi(), [])
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [errorAction, setErrorAction] = useState<"submit" | "recover" | "prediction">("submit")
  const [pendingRunId, setPendingRunId] = useState<string | null>(null)
  const operation = useRef<{ signature: string; input: ConnectedLabInput; keys: ConnectedLabKeys } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const currentSignature = JSON.stringify({ gates, hypothesis, confidence, shots, savedCircuit: savedCircuit ? [savedCircuit.id, savedCircuit.revision] : null, predictionId: connectedPrediction?.prediction.id })

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; controller.current?.abort() }
  }, [])

  useEffect(() => {
    controller.current?.abort()
    controller.current = null
    operation.current = null
    setPending(false)
    setStatus("")
    setError("")
    setErrorAction("submit")
    setPendingRunId(null)
  }, [learnerId])

  async function submit() {
    if (pending || !learnerId || !predictionLocked || !connectedPrediction) return
    const ownerId = learnerId
    const sameOwner = () => useSession.getState().mode === "connected" && useSession.getState().user?.id === ownerId
    setPending(true)
    setError("")
    setErrorAction("submit")
    setPendingRunId(null)
    try {
      if (!operation.current || operation.current.signature !== currentSignature) {
        operation.current = {
          signature: currentSignature,
          input: { gates: gates.map((gate) => ({ ...gate })), hypothesis: { ...hypothesis }, confidence, shots, savedCircuit, lockedPrediction: connectedPrediction },
          keys: newConnectedLabKeys(),
        }
      }
      const { input, keys } = operation.current
      controller.current = new AbortController()
      const completed = await runConnectedSuperposition(api, input, keys, (message) => {
        if (mounted.current && sameOwner()) setStatus(message)
      }, controller.current.signal, (runId) => {
        if (mounted.current && sameOwner()) { setPendingRunId(runId); consumeConnectedPrediction() }
      })
      if (!mounted.current || !sameOwner()) return
      showConnectedResult(completed)
    } catch (cause) {
      if (mounted.current && sameOwner()) setError(cause instanceof Error ? cause.message : "The connected run failed. Please retry.")
    } finally {
      if (mounted.current && sameOwner()) setPending(false)
    }
  }

  async function loadPrediction() {
    if (pending || !learnerId) return
    const ownerId = learnerId
    const sameOwner = () => useSession.getState().mode === "connected" && useSession.getState().user?.id === ownerId
    setPending(true)
    setError("")
    setErrorAction("prediction")
    setStatus("Looking up an unpaired saved prediction…")
    try {
      const saved = await latestUnpairedConnectedPrediction(api)
      if (!mounted.current || !sameOwner()) return
      if (saved) {
        restoreConnectedPrediction(saved)
        setStatus("Recovered your saved locked prediction. You can now run this circuit.")
      } else {
        setStatus("No unpaired Superposition prediction was found in the latest 50 sessions. Return to Predict to save a new one.")
      }
    } catch (cause) {
      if (mounted.current && sameOwner()) { setStatus(""); setError(cause instanceof Error ? cause.message : "Could not recover a saved prediction.") }
    } finally {
      if (mounted.current && sameOwner()) setPending(false)
    }
  }

  async function loadRecent() {
    if (pending || !learnerId) return
    const ownerId = learnerId
    const sameOwner = () => useSession.getState().mode === "connected" && useSession.getState().user?.id === ownerId
    setPending(true)
    setError("")
    setErrorAction("recover")
    setPendingRunId(null)
    setStatus("Looking up recent saved runs…")
    try {
      const saved = await latestConnectedSuperposition(api, true)
      if (!mounted.current || !sameOwner()) return
      if (saved && "pendingRunId" in saved) {
        setPendingRunId(saved.pendingRunId)
        setStatus("A saved Aer run is still processing. Open its status to check again.")
      } else if (saved) {
        showConnectedResult(saved)
      } else {
        setStatus(RECENT_COMPARISON_EMPTY_MESSAGE)
      }
    } catch (cause) {
      if (mounted.current && sameOwner()) {
        setStatus("")
        setError(cause instanceof Error ? cause.message : "Could not load saved runs.")
      }
    } finally {
      if (mounted.current && sameOwner()) setPending(false)
    }
  }

  if (!learnerId) return <div className="mx-auto max-w-2xl"><StageHeader eyebrow="Stage 4 of 9 · Connected Execution" title="Run on Qiskit Aer" /><p role="status" className="mt-4 text-sm text-muted-foreground">Sign in to save your prediction and run this circuit on Aer.</p><Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">Go to login →</Link></div>

  return <div className="mx-auto max-w-2xl">
    <StageHeader eyebrow="Stage 4 of 9 · Connected Execution" title="Run on Qiskit Aer" />
    <p className="mb-5 text-sm text-muted-foreground">Your locked prediction, circuit snapshot, and Aer result will be saved to your account. This path currently supports the Superposition lab.</p>
    {savedCircuit && <p className="mb-4 text-xs text-muted-foreground">Selected library circuit: {savedCircuit.snapshot.name}, revision {savedCircuit.revision}. The run will use this revision if its gates still match the editor.</p>}
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <h3 className="text-sm font-semibold">Measurement shots</h3>
      <div className="mt-3 flex flex-wrap gap-2">{SHOTS.map((count) => <button key={count} type="button" disabled={pending} onClick={() => setShots(count)} aria-pressed={shots === count} className={`rounded-md border px-3.5 py-1.5 text-sm ${shots === count ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{count.toLocaleString()}</button>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Ideal Aer circuit with sampled measurements. The browser noise preview is unavailable for connected runs.</p>
    </div>
    {!connectedPrediction && !pendingRunId && <p role="status" className="mt-4 text-xs text-muted-foreground">Save and lock a prediction in Predict before starting a new Aer run, or recover an unpaired prediction from your account.</p>}
    <button type="button" disabled={pending || !predictionLocked || !connectedPrediction} onClick={() => void submit()} className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{pending ? "Running on Aer…" : "Run saved prediction on Aer"}</button>
    {!connectedPrediction && !pendingRunId && <button type="button" disabled={pending} onClick={() => void loadPrediction()} className="mt-3 w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Recover saved prediction</button>}
    <button type="button" disabled={pending} onClick={() => void loadRecent()} className="mt-3 w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50">Recover recent saved run</button>
    {pendingRunId && <button type="button" onClick={() => openConnectedRun(pendingRunId)} className="mt-3 block text-sm font-semibold text-primary underline">Check saved run status</button>}
    {connectedResult && <button type="button" disabled={pending} onClick={() => showConnectedResult(connectedResult)} className="mt-3 w-full rounded-full border border-primary/50 px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50">View saved comparison</button>}
    {status && <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{status}</p>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error} {!pendingRunId && <button type="button" disabled={pending} onClick={() => void (errorAction === "recover" ? loadRecent() : errorAction === "prediction" ? loadPrediction() : submit())} className="underline">{errorAction === "recover" || errorAction === "prediction" ? "Retry recovery" : "Retry the same run"}</button>}</p>}
  </div>
}
