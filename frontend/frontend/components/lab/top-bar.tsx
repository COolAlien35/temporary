"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ChevronRight, Lightbulb, RotateCcw, Settings, Target } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { STAGES } from "@/lib/lab-data"
import { cn } from "@/lib/utils"

function useCountUp(value: number, duration = 500) {
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    const start = display
    const delta = value - start
    if (delta === 0) return
    const startTime = performance.now()
    let frame: number
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration)
      setDisplay(Math.round(start + delta * progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return display
}

export function TopBar() {
  const { algorithm, stage, completedStages, hints, attempts, xp, runAccuracy, hasRun, mode, setMode, goToStage } =
    useLab()
  const displayXp = useCountUp(xp)
  const accuracyKnown = hasRun

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => goToStage(Math.max(1, stage - 1))}
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
          <span>Batch</span>
          <ChevronRight className="size-3.5" />
        </div>
        <span className={cn("size-2 shrink-0 rounded-full", algorithm.statusColor)} aria-hidden="true" />
        <h1 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
          {algorithm.name}
        </h1>
      </div>

      <div className="hidden items-center gap-1.5 md:flex" role="list" aria-label="Stage progress">
        {STAGES.map((s) => {
          const isCompleted = completedStages.has(s.id)
          const isCurrent = s.id === stage
          return (
            <span
              key={s.id}
              role="listitem"
              title={s.label}
              className={cn(
                "size-1.5 rounded-full transition-all",
                isCurrent
                  ? "w-4 bg-primary"
                  : isCompleted
                    ? "bg-primary/60"
                    : "border border-muted-foreground/40 bg-transparent",
              )}
            />
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-4 text-xs">
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Accuracy</span>
            <span className={cn("font-mono font-semibold", accuracyKnown && runAccuracy === 0 ? "text-rose-400" : "text-foreground")}>
              {accuracyKnown ? `${runAccuracy}%` : "\u2014"}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="size-2.5" /> Hints
            </span>
            <span className="font-mono font-semibold text-foreground">{hints}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <RotateCcw className="size-2.5" /> Attempts
            </span>
            <span className="font-mono font-semibold text-foreground">{attempts}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Target className="size-2.5" /> Session XP
            </span>
            <span className="font-mono font-semibold text-primary">{displayXp}</span>
          </div>
        </div>

        <div className="flex items-center rounded-full border border-border bg-secondary/50 p-0.5">
          <button
            type="button"
            onClick={() => setMode("guided")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              mode === "guided" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Guided
          </button>
          <button
            type="button"
            onClick={() => setMode("explore")}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              mode === "explore" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Explore
          </button>
        </div>

        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="size-4" />
        </button>
      </div>
    </header>
  )
}
