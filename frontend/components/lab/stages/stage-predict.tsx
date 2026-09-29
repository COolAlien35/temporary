"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Lock } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { connectedLearningLoopApi } from "@/lib/services/connected-auth"
import { lockConnectedSuperpositionPrediction, newConnectedLabKeys, type ConnectedLabKeys } from "@/lib/services/connected-lab-run"
import { useSession } from "@/store/use-session"

export function StagePredict() {
  const { algorithm, hypothesis, setHypothesis, confidence, setConfidence, predictionLocked, connectedRunMode, connectedPrediction, rememberConnectedPrediction, lockPrediction } =
    useLab()
  const learnerId = useSession((state) => state.user?.id ?? null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const keys = useRef<{ signature: string; value: ConnectedLabKeys } | null>(null)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const lockedHere = predictionLocked && (!connectedRunMode || Boolean(connectedPrediction))

  async function handleLock() {
    if (!connectedRunMode) { lockPrediction(); return }
    if (!learnerId || pending) return
    const ownerId = learnerId
    const signature = JSON.stringify({ hypothesis, confidence })
    if (!keys.current || keys.current.signature !== signature) keys.current = { signature, value: newConnectedLabKeys() }
    setPending(true)
    setError("")
    try {
      const saved = await lockConnectedSuperpositionPrediction(connectedLearningLoopApi(), hypothesis, confidence, keys.current.value)
      if (!mounted.current || useSession.getState().user?.id !== ownerId || useSession.getState().mode !== "connected") return
      rememberConnectedPrediction(saved)
      lockPrediction()
    } catch (cause) {
      if (mounted.current && useSession.getState().user?.id === ownerId) setError(cause instanceof Error ? cause.message : "Could not save the prediction.")
    } finally {
      if (mounted.current && useSession.getState().user?.id === ownerId) setPending(false)
    }
  }

  const sum = algorithm.basisStates.reduce((acc, s) => acc + (hypothesis[s] ?? 0), 0)
  const isValid = sum === 100

  return (
    <div className="mx-auto max-w-2xl">
      <StageHeader eyebrow="Stage 2 of 9 · Empirical Commitment" title="Formulate Outcome Hypothesis" />

      <div className="rounded-xl border border-border bg-card/60 p-5">
        <h3 className="text-sm font-semibold text-foreground">Hypothesized Probability Distribution</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Assign a probability to each measurable basis state for the {algorithm.qubits}-qubit register.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          {algorithm.basisStates.map((state) => (
            <div key={state} className="flex items-center gap-4">
              <span className="w-14 shrink-0 font-mono text-sm text-foreground">
                |{state}⟩
              </span>
              <Slider
                thumbLabel={`Predicted probability for |${state}⟩`}
                thumbValueText={(value) => `${value} percent`}
                value={[hypothesis[state] ?? 0]}
                onValueChange={(value) => setHypothesis(state, Array.isArray(value) ? (value[0] ?? 0) : value)}
                max={100}
                step={1}
                disabled={lockedHere || pending}
                className="flex-1"
              />
              <span className="w-12 shrink-0 text-right font-mono text-sm text-muted-foreground">
                {hypothesis[state] ?? 0}%
              </span>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-5 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium",
            isValid ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400",
          )}
        >
          <span>Σ = {(sum / 100).toFixed(2)}</span>
          {isValid && <Check className="size-3.5" />}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-card/60 p-5">
        <h3 className="text-sm font-semibold text-foreground">Confidence Calibration</h3>
        <div className="mt-4 flex items-center gap-4">
          <Slider
            thumbLabel="Prediction confidence"
            thumbValueText={(value) => `${value} percent`}
            value={[confidence]}
            onValueChange={(value) => setConfidence(Array.isArray(value) ? (value[0] ?? 0) : value)}
            max={100}
            step={1}
            disabled={lockedHere || pending}
            className="flex-1"
          />
          <span className="w-12 shrink-0 text-right font-mono text-sm text-muted-foreground">{confidence}%</span>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-rose-200">{error}</p>}
      <button
        type="button"
        disabled={!isValid || lockedHere || pending}
        onClick={() => void handleLock()}
        className={cn(
          "mt-6 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-colors",
          lockedHere || pending
            ? "cursor-not-allowed bg-secondary text-muted-foreground"
            : isValid
              ? "bg-primary text-black hover:bg-primary"
              : "cursor-not-allowed bg-secondary text-muted-foreground",
        )}
      >
        <Lock className="size-3.5" />
        {pending ? "Saving prediction…" : lockedHere ? connectedRunMode ? "Prediction Saved and Locked" : "Prediction Locked" : connectedRunMode ? "Save and Lock Prediction" : "Lock Prediction & Arm Simulation Gate"}
      </button>
    </div>
  )
}
