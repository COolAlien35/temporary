"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useLab } from "@/lib/lab-context"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { latestConnectedSuperposition, newConnectedLabKeys, runConnectedSuperposition, type ConnectedLabInput, type ConnectedLabKeys } from "@/lib/services/connected-lab-run"
import { StageHeader } from "./stage-header"
import { useSession } from "@/store/use-session"

const SHOTS = [128, 512, 1024, 4096]

export function ConnectedAerRun() {
  const { gates, hypothesis, confidence, shots, setShots, predictionLocked, connectedResult, showConnectedResult } = useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const api = useMemo(() => connectedLearningLoopApi(), [])
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const operation = useRef<{ signature: string; input: ConnectedLabInput; keys: ConnectedLabKeys } | null>(null)
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const currentSignature = JSON.stringify({ gates, hypothesis, confidence, shots })

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
  }, [learnerId])

  async function submit() {
    if (pending || !learnerId || !predictionLocked) return
    const ownerId = learnerId
    const sameOwner = () => useSession.getState().mode === "connected" && useSession.getState().user?.id === ownerId
    setPending(true)
    setError("")
    try {
      if (!operation.current || operation.current.signature !== currentSignature) {
        operation.current = {
          signature: currentSignature,
          input: { gates: gates.map((gate) => ({ ...gate })), hypothesis: { ...hypothesis }, confidence, shots },
          keys: newConnectedLabKeys(),
        }
      }
      const { input, keys } = operation.current
      controller.current = new AbortController()
      const completed = await runConnectedSuperposition(api, input, keys, (message) => {
        if (mounted.current && sameOwner()) setStatus(message)
      }, controller.current.signal)
      if (!mounted.current || !sameOwner()) return
      showConnectedResult(completed)
    } catch (cause) {
      if (mounted.current && sameOwner()) setError(cause instanceof Error ? cause.message : "The connected run failed. Please retry.")
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
    setStatus("Looking up recent saved comparisons…")
    try {
      const saved = await latestConnectedSuperposition(api)
      if (!mounted.current || !sameOwner()) return
      if (saved) {
        showConnectedResult(saved)
      } else {
        setStatus("No completed superposition comparison was found in your ten most recent sessions.")
      }
    } catch (cause) {
      if (mounted.current && sameOwner()) setError(cause instanceof Error ? cause.message : "Could not load saved comparisons.")
    } finally {
      if (mounted.current && sameOwner()) setPending(false)
    }
  }

  if (!learnerId) return <div className="mx-auto max-w-2xl"><StageHeader eyebrow="Stage 4 of 9 · Connected Execution" title="Run on Qiskit Aer" /><p role="status" className="mt-4 text-sm text-muted-foreground">Sign in to save your prediction and run this circuit on Aer.</p><Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary">Go to login →</Link></div>

  return <div className="mx-auto max-w-2xl">
    <StageHeader eyebrow="Stage 4 of 9 · Connected Execution" title="Run on Qiskit Aer" />
    <p className="mb-5 text-sm text-muted-foreground">Your locked prediction, circuit snapshot, and Aer result will be saved to your account. This path currently supports the Superposition lab.</p>
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <h3 className="text-sm font-semibold">Measurement shots</h3>
      <div className="mt-3 flex flex-wrap gap-2">{SHOTS.map((count) => <button key={count} type="button" disabled={pending} onClick={() => setShots(count)} aria-pressed={shots === count} className={`rounded-md border px-3.5 py-1.5 text-sm ${shots === count ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{count.toLocaleString()}</button>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Ideal Aer circuit with sampled measurements. The browser noise preview is unavailable for connected runs.</p>
    </div>
    {!predictionLocked && <p role="status" className="mt-4 text-xs text-muted-foreground">Lock a prediction in Predict before starting a new Aer run. You can still load a recent saved comparison.</p>}
    <button type="button" disabled={pending || !predictionLocked} onClick={() => void submit()} className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{pending ? "Running on Aer…" : "Save prediction and run on Aer"}</button>
    <button type="button" disabled={pending} onClick={() => void loadRecent()} className="mt-3 w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50">Load recent saved comparison</button>
    {connectedResult && <button type="button" disabled={pending} onClick={() => showConnectedResult(connectedResult)} className="mt-3 w-full rounded-full border border-primary/50 px-4 py-2.5 text-sm font-semibold text-primary disabled:opacity-50">View saved comparison</button>}
    {status && <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">{status}</p>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error} <button type="button" disabled={pending} onClick={() => void submit()} className="underline">Retry the same run</button></p>}
  </div>
}
