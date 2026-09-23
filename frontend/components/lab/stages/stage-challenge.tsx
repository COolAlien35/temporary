"use client"

import { useState } from "react"
import { ChevronRight, Target } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"
import { GATE_COLORS, GATE_PALETTE, type GateType } from "@/lib/lab-data"
import { cn } from "@/lib/utils"

const STEPS = 4

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "bg-emerald-500/15 text-emerald-400",
  MEDIUM: "bg-primary/15 text-primary",
  HARD: "bg-rose-500/15 text-rose-400",
}

export function StageChallenge() {
  const { algorithm, gates, addGate, removeGate, submitChallenge, challengeSubmitted, challengeScore, goToStage } =
    useLab()
  const [selectedGate, setSelectedGate] = useState<GateType>("H")

  const gateAt = (step: number, qubit: number) => gates.find((g) => g.step === step && g.qubit === qubit)
  const { challenge } = algorithm

  return (
    <div>
      <StageHeader
        eyebrow="Stage 8 of 9 · Constrained Optimization"
        title="Open-Ended Circuit Challenge"
        accuracyBadge={
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", DIFFICULTY_COLORS[challenge.difficulty])}>
            {challenge.difficulty}
          </span>
        }
        action={
          challengeSubmitted && (
            <button
              type="button"
              onClick={() => goToStage(9)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
            >
              Proceed to Mastery <ChevronRight className="size-4" />
            </button>
          )
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs text-primary">
        <Target className="mt-0.5 size-3.5 shrink-0" />
        <span>{challenge.goal}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {GATE_PALETTE.map((item) => (
          <button
            key={item.gate}
            type="button"
            onClick={() => setSelectedGate(item.gate)}
            title={item.label}
            className={cn(
              "flex size-9 items-center justify-center rounded-md border text-xs font-semibold transition-all",
              GATE_COLORS[item.gate],
              selectedGate === item.gate ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
            )}
          >
            {item.gate}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/60 p-5">
        <div className="grid gap-3" style={{ gridTemplateColumns: `48px repeat(${STEPS}, 1fr)` }}>
          <div />
          {Array.from({ length: STEPS }).map((_, step) => (
            <div key={step} className="text-center font-mono text-[11px] text-muted-foreground">
              t{step}
            </div>
          ))}
          {Array.from({ length: algorithm.qubits }).map((_, qubit) => (
            <div key={qubit} className="contents">
              <div className="flex items-center font-mono text-xs text-muted-foreground">q[{qubit}]</div>
              {Array.from({ length: STEPS }).map((_, step) => {
                const placed = gateAt(step, qubit)
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => (placed ? removeGate(placed.id) : addGate({ step, qubit, gate: selectedGate }))}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                      placed
                        ? GATE_COLORS[placed.gate]
                        : "border-dashed border-border text-muted-foreground/50 hover:border-foreground/30",
                    )}
                  >
                    {placed ? placed.gate : "+"}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
        <span>
          Gates used: {gates.length} / {challenge.gateBudget}
        </span>
        <span>Iteration cap: {challenge.iterationCap}</span>
        <span>Tolerance: ±{challenge.tolerance}%</span>
      </div>

      {!challengeSubmitted ? (
        <button
          type="button"
          onClick={submitChallenge}
          className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-primary"
        >
          Submit for Scoring
        </button>
      ) : (
        <div
          className={cn(
            "mt-4 rounded-xl border p-4 text-center",
            (challengeScore ?? 0) >= 70
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-primary/30 bg-primary/5",
          )}
        >
          <p className="text-2xl font-semibold text-foreground">{challengeScore}%</p>
          <p className="mt-1 text-xs text-muted-foreground">Optimization Efficiency Score</p>
        </div>
      )}
    </div>
  )
}
