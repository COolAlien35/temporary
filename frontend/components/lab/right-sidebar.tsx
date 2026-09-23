"use client"

import { Lock } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { STAGES } from "@/lib/lab-data"
import { cn } from "@/lib/utils"

export function RightSidebar() {
  const { algorithm, stage, gates, predictionLocked, hypothesis } = useLab()
  const currentStageLabel = STAGES.find((s) => s.id === stage)?.label ?? ""

  const leadingBasisState = algorithm.basisStates.reduce((best, s) =>
    (hypothesis[s] ?? 0) > (hypothesis[best] ?? 0) ? s : best,
  algorithm.basisStates[0])
  const secondLeading = algorithm.basisStates.filter((s) => s !== leadingBasisState)[0]

  return (
    <aside className="flex w-full shrink-0 flex-col border-border bg-card/40 md:w-[300px] md:border-l">
      <div className="flex items-center justify-between border-b border-border px-5 py-5">
        <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Session Context
        </span>
        <span className="text-xs font-medium text-foreground">{currentStageLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Quantum register</h3>

        <div className="mt-3 rounded-lg border border-border bg-background/60 p-3">
          <div className="flex flex-col gap-2">
            {Array.from({ length: algorithm.qubits }).map((_, i) => {
              const wireGates = gates.filter((g) => g.qubit === i).sort((a, b) => a.step - b.step)
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-9 shrink-0 font-mono text-[11px] text-muted-foreground">q[{i}]</span>
                  <div className="relative flex h-6 flex-1 items-center">
                    <div className="absolute inset-x-0 h-px bg-border" />
                    {wireGates.length === 0 ? null : (
                      <div className="relative z-10 flex gap-1.5">
                        {wireGates.map((g) => (
                          <span
                            key={g.id}
                            className="flex size-5 items-center justify-center rounded border border-primary/40 bg-primary/10 text-[9px] font-semibold text-primary"
                          >
                            {g.gate}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {gates.length === 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">No gates placed</p>
          )}
        </div>

        <div
          className={cn(
            "mt-4 rounded-lg border-l-2 bg-background/60 p-3",
            predictionLocked ? "border-l-primary" : "border-l-muted-foreground/30",
          )}
        >
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Locked Prediction</p>
          {predictionLocked ? (
            <>
              <p className="mt-1 font-mono text-sm text-foreground">
                {"|"}
                {leadingBasisState}
                {"\u27e9"} {hypothesis[leadingBasisState]}% {"\u00b7"} {"|"}
                {secondLeading}
                {"\u27e9"} {hypothesis[secondLeading] ?? 0}%
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Circuit ID: qc-{algorithm.slug}-01</p>
            </>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3" /> Commit a hypothesis in Predict
            </p>
          )}
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Session Log</p>
          <ul className="mt-2 flex flex-col gap-2">
            <SessionLog />
          </ul>
        </div>
      </div>
    </aside>
  )
}

function SessionLog() {
  const { sessionLog } = useLab()
  return (
    <>
      {sessionLog.map((entry) => (
        <li key={entry.id} className="flex items-start gap-2 text-xs text-foreground/90">
          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
          {entry.text}
        </li>
      ))}
    </>
  )
}
