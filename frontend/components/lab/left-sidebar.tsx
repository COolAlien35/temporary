"use client"

import { Check, Lock } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { STAGES } from "@/lib/lab-data"
import { cn } from "@/lib/utils"

function statusMessage(stage: number, predictionLocked: boolean, hasRun: boolean, debugSolved: boolean): string {
  if (stage === 1) return "Fundamental grounding in progress"
  if (stage === 2) return predictionLocked ? "Hypothesis committed \u00b7 Run unlocked" : "Predict-before-Run gate armed"
  if (stage === 3) return "Circuit assembly \u00b7 gate budget open"
  if (stage === 4) return hasRun ? "Simulation completed" : "Awaiting run"
  if (stage === 5) return "Comparing ghost vs. simulated outcome"
  if (stage === 6) return "Socratic debrief with lab partner"
  if (stage === 7) return debugSolved ? "Fault isolated \u00b7 distribution restored" : "Fault isolation in progress"
  if (stage === 8) return "Optimization challenge \u00b7 scoring pending"
  return "Synthesis complete"
}

export function LeftSidebar() {
  const { stage, completedStages, isStageUnlocked, goToStage, predictionLocked, hasRun, debugSolved } = useLab()

  return (
    <aside className="flex w-full shrink-0 flex-col border-border bg-card/40 md:w-[220px] md:border-r">
      <div className="border-b border-border px-5 py-5">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-primary">Empirical Loop</span>
        <h2 className="mt-1 text-base font-semibold text-foreground">9-Stage Notebook</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Stage {stage}/{STAGES.length}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Lab stages">
        <ul className="flex flex-col gap-1">
          {STAGES.map((s) => {
            const isCompleted = completedStages.has(s.id)
            const isCurrent = s.id === stage
            const unlocked = isStageUnlocked(s.id)
            const showLockedPill = s.key === "predict" && predictionLocked

            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => goToStage(s.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                    isCurrent ? "bg-secondary" : unlocked ? "hover:bg-secondary/60" : "cursor-not-allowed opacity-45",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                      isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                        : isCurrent
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground",
                    )}
                  >
                    {isCompleted ? <Check className="size-3.5" /> : unlocked ? s.id : <Lock className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("text-sm", isCurrent ? "font-semibold text-foreground" : "text-foreground/90")}>
                        {s.label}
                      </span>
                      {showLockedPill && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">
                          Locked
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{s.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary" />
          {statusMessage(stage, predictionLocked, hasRun, debugSolved)}
        </p>
      </div>
    </aside>
  )
}
