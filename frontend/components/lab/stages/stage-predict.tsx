"use client"

import { Check, Lock } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export function StagePredict() {
  const { algorithm, hypothesis, setHypothesis, confidence, setConfidence, predictionLocked, lockPrediction } =
    useLab()

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
                value={[hypothesis[state] ?? 0]}
                onValueChange={([v]) => setHypothesis(state, v)}
                max={100}
                step={1}
                disabled={predictionLocked}
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
            value={[confidence]}
            onValueChange={([v]) => setConfidence(v)}
            max={100}
            step={1}
            disabled={predictionLocked}
            className="flex-1"
          />
          <span className="w-12 shrink-0 text-right font-mono text-sm text-muted-foreground">{confidence}%</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || predictionLocked}
        onClick={lockPrediction}
        className={cn(
          "mt-6 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-colors",
          predictionLocked
            ? "cursor-not-allowed bg-secondary text-muted-foreground"
            : isValid
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "cursor-not-allowed bg-secondary text-muted-foreground",
        )}
      >
        <Lock className="size-3.5" />
        {predictionLocked ? "Prediction Locked" : "Lock Prediction & Arm Simulation Gate"}
      </button>
    </div>
  )
}
