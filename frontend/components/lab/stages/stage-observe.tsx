"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ChevronRight, Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader, AccuracyBadge } from "@/components/lab/stage-header"
import { cn } from "@/lib/utils"

type SubTab = "dual" | "histogram" | "statevector"

export function StageObserve() {
  const { algorithm, hypothesis, runAccuracy, gates, goToStage } = useLab()
  const [subTab, setSubTab] = useState<SubTab>("dual")
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)

  const orderedGates = useMemo(() => [...gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit), [gates])
  const maxStep = Math.max(orderedGates.length - 1, 0)

  const actual = algorithm.correctDistribution

  const statevectorRows = useMemo(() => {
    return algorithm.basisStates.map((state) => {
      const probability = actual[state] ?? 0
      const amplitude = Math.sqrt(probability / 100)
      return {
        state,
        amplitude: amplitude.toFixed(3),
        magnitude: amplitude.toFixed(3),
        probability,
        phase: probability > 50 ? "+" : probability > 0 ? "\u00b1" : "0",
      }
    })
  }, [algorithm.basisStates, actual])

  return (
    <div className="mx-auto max-w-3xl">
      <StageHeader
        eyebrow="Stage 5 of 9 · Empirical Observation"
        title="Prediction Ghost vs Simulated Outcome"
        accuracyBadge={<AccuracyBadge accuracy={runAccuracy} />}
      />

      <div className="mb-4 flex gap-1 rounded-full border border-border bg-secondary/30 p-1 w-fit">
        {[
          { key: "dual" as const, label: "Dual View" },
          { key: "histogram" as const, label: "Histogram Only" },
          { key: "statevector" as const, label: "Statevector Evolution" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubTab(tab.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              subTab === tab.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab !== "statevector" && (
        <div className="rounded-xl border border-border bg-card/60 p-5">
          <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
            {algorithm.basisStates.map((state) => {
              const actualPct = actual[state] ?? 0
              const ghostPct = hypothesis[state] ?? 0
              const mismatch = Math.abs(actualPct - ghostPct) > 15
              return (
                <div key={state} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-full w-full items-end justify-center gap-1.5">
                    <div
                      className="w-5 rounded-t bg-primary"
                      style={{ height: `${Math.max(actualPct, 2)}%` }}
                      title={`Actual: ${actualPct}%`}
                    />
                    {subTab === "dual" && (
                      <div
                        className="w-5 rounded-t border-2 border-dashed border-muted-foreground/50 bg-transparent"
                        style={{ height: `${Math.max(ghostPct, 2)}%` }}
                        title={`Predicted: ${ghostPct}%`}
                      />
                    )}
                    {mismatch && subTab === "dual" && (
                      <AlertTriangle className="absolute -top-5 size-3.5 text-primary" />
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">|{state}⟩</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded bg-primary" /> Actual Outcome
            </span>
            {subTab === "dual" && (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded border-2 border-dashed border-muted-foreground/50" /> Predicted Ghost
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Gate Evolution Scrubber</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <SkipBack className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(maxStep, s + 1))}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <SkipForward className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          {orderedGates.length === 0 && <span className="text-xs text-muted-foreground">No gates to scrub</span>}
          {orderedGates.map((g, i) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex h-8 min-w-8 items-center justify-center rounded-md border px-1.5 text-[11px] font-semibold transition-colors",
                i === step
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30",
              )}
            >
              {g.gate}
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">State</th>
                <th className="pb-2 pr-3 font-medium">Amplitude</th>
                <th className="pb-2 pr-3 font-medium">Magnitude</th>
                <th className="pb-2 pr-3 font-medium">Probability</th>
                <th className="pb-2 font-medium">Phase</th>
              </tr>
            </thead>
            <tbody>
              {statevectorRows.map((row) => (
                <tr key={row.state} className="border-t border-border">
                  <td className="py-2 pr-3 font-mono text-foreground">|{row.state}⟩</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{row.amplitude}</td>
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{row.magnitude}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary" style={{ width: `${row.probability}%` }} />
                      </div>
                      <span className="font-mono text-muted-foreground">{row.probability}%</span>
                    </div>
                  </td>
                  <td className="py-2 font-mono text-muted-foreground">{row.phase}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => goToStage(6)}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
        >
          Discuss with Lab Partner <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
