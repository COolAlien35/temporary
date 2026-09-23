"use client"

import { useState } from "react"
import { Bug, Check, ChevronRight, X } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"
import { GATE_COLORS } from "@/lib/lab-data"
import { LabPartnerChat } from "@/components/lab/lab-partner-chat"
import { cn } from "@/lib/utils"

export function StageDebug() {
  const { algorithm, debugDisabledGates, toggleDebugGate, verifyDebugFix, debugSolved, debugAttempts, goToStage } =
    useLab()
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null)

  const handleVerify = () => {
    const solved = verifyDebugFix()
    setFeedback(solved ? "correct" : "incorrect")
  }

  const steps = Math.max(...algorithm.correctGates.map((g) => g.step)) + 1

  return (
    <div>
      <StageHeader
        eyebrow="Stage 7 of 9 · Fault Isolation"
        title="Debug the Seeded Circuit Anomaly"
        action={
          debugSolved && (
            <button
              type="button"
              onClick={() => goToStage(8)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
            >
              Proceed to Challenge <ChevronRight className="size-4" />
            </button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-300">
        <Bug className="size-3.5" />
        This circuit does not reproduce the expected balanced-oracle signature. Isolate the faulty gate.
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="overflow-x-auto rounded-xl border border-border bg-card/60 p-5">
            <div className="grid gap-3" style={{ gridTemplateColumns: `48px repeat(${steps}, 1fr)` }}>
              <div />
              {Array.from({ length: steps }).map((_, step) => (
                <div key={step} className="text-center font-mono text-[11px] text-muted-foreground">
                  t{step}
                </div>
              ))}
              {Array.from({ length: algorithm.qubits }).map((_, qubit) => (
                <div key={qubit} className="contents">
                  <div className="flex items-center font-mono text-xs text-muted-foreground">q[{qubit}]</div>
                  {Array.from({ length: steps }).map((_, step) => {
                    const placed = algorithm.correctGates.find((g) => g.step === step && g.qubit === qubit)
                    if (!placed) return <div key={step} className="h-11" />
                    const disabled = debugDisabledGates.has(placed.id)
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => toggleDebugGate(placed.id)}
                        className={cn(
                          "group relative flex h-11 items-center justify-center rounded-md border text-xs font-semibold transition-all",
                          disabled ? "border-dashed border-border text-muted-foreground/40 line-through" : GATE_COLORS[placed.gate],
                        )}
                      >
                        {placed.gate}
                        <span
                          className={cn(
                            "absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full text-[9px]",
                            disabled ? "bg-secondary text-muted-foreground" : "bg-rose-500 text-white opacity-0 group-hover:opacity-100",
                          )}
                        >
                          {disabled ? <Check className="size-2.5" /> : <X className="size-2.5" />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Click a gate to disable it, then verify. Attempts: {debugAttempts}
          </p>

          <button
            type="button"
            onClick={handleVerify}
            disabled={debugSolved}
            className={cn(
              "mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold transition-colors",
              debugSolved
                ? "cursor-not-allowed bg-emerald-500/15 text-emerald-400"
                : "bg-primary text-black hover:bg-primary",
            )}
          >
            {debugSolved ? "Fault Isolated \u2713" : "Verify Fix"}
          </button>

          {feedback && !debugSolved && (
            <p className="mt-2 text-center text-xs text-rose-400">
              Distribution still deviates from the expected signature. Re-examine the flagged gate.
            </p>
          )}
        </div>

        <div className="min-h-[420px]">
          <LabPartnerChat
            introMessage="This circuit is producing the wrong distribution. Which gate looks out of place given what a balanced oracle should do here?"
            hints={[
              "Compare the gate count on q[0] to what the algorithm structure calls for.",
              "One gate between the oracle and the final Hadamard layer doesn't belong.",
              "The extraneous gate biases amplitude before interference has a chance to cancel it.",
            ]}
          />
        </div>
      </div>
    </div>
  )
}
