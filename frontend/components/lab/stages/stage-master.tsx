"use client"

import { Award, RotateCcw } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"

export function StageMaster() {
  const { algorithm, xp, attempts, debugAttempts, hints, challengeScore, runAccuracy, resetLab } = useLab()

  const rows = [
    { label: "Prediction accuracy", value: `${runAccuracy}%` },
    { label: "Simulation attempts", value: attempts },
    { label: "Debug attempts", value: debugAttempts },
    { label: "Hints requested", value: hints },
    { label: "Challenge efficiency", value: challengeScore != null ? `${challengeScore}%` : "\u2014" },
    { label: "XP earned this session", value: xp },
  ]

  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15">
        <Award className="size-7 text-primary" />
      </div>
      <StageHeader eyebrow="Stage 9 of 9 · Synthesis Complete" title={`${algorithm.name} \u2014 Mastered`} />

      <div className="overflow-hidden rounded-xl border border-border bg-card/60 text-left">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={
              i === rows.length - 1
                ? "flex items-center justify-between px-4 py-2.5"
                : "flex items-center justify-between border-b border-border px-4 py-2.5"
            }
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span className="font-mono text-sm font-medium text-foreground">{row.value}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={resetLab}
        className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <RotateCcw className="size-3.5" />
        Restart Lab Session
      </button>
    </div>
  )
}
