"use client"

import { ChevronRight } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader, AccuracyBadge } from "@/components/lab/stage-header"
import { LabPartnerChat } from "@/components/lab/lab-partner-chat"
import { ConnectedExplain } from "@/components/lab/connected-explain"
import { connectedAuthConfigured } from "@/lib/services/connected-auth"
import { useSession } from "@/store/use-session"

export function StageExplain() {
  const accountMode = useSession((state) => state.mode)
  const learnerId = useSession((state) => state.user?.id ?? null)
  const { algorithm } = useLab()
  if (connectedAuthConfigured && accountMode !== "demo" && algorithm.slug === "superposition") return <ConnectedExplain key={learnerId ?? "guest"} />
  return <DemoStageExplain />
}

function DemoStageExplain() {
  const { algorithm, runAccuracy, hypothesis, shots, backend, advanceStage, simulationResult } = useLab()
  const actual = simulationResult?.noisyProbabilities ?? {}

  const handleContinue = () => {
    advanceStage(6, 7)
  }

  return (
    <div>
      <StageHeader
        eyebrow="Stage 6 of 9 · Conceptual Synthesis"
        title="Socratic Debrief with Lab Partner"
        accuracyBadge={<AccuracyBadge accuracy={runAccuracy} />}
        action={
          <button
            type="button"
            onClick={handleContinue}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
          >
            Proceed to Debug Challenge <ChevronRight className="size-4" />
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Run Summary & Calibration</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card/60">
            <table className="w-full text-left text-xs">
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 text-muted-foreground">Circuit archetype</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{algorithm.name}</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="px-4 py-2.5 text-muted-foreground">Backend</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{backend}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-muted-foreground">Shots</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{shots.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mt-5 text-sm font-semibold text-foreground">Basis State Correlation</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {algorithm.basisStates.map((state) => (
              <div key={state} className="rounded-lg border border-border bg-card/60 p-2.5 text-center">
                <p className="font-mono text-xs text-foreground">|{state}⟩</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Pred {hypothesis[state] ?? 0}%</p>
                <p className="text-[11px] text-primary">Actual {((actual[state] ?? 0) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-primary">Run interpretation</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              These outcomes come from your latest local circuit run ({simulationResult?.shots.toLocaleString() ?? 0} shots). Change a gate and rerun to see how the distribution changes.
            </p>
          </div>
        </div>

        <div className="min-h-[420px]">
          <LabPartnerChat
            introMessage={`Your ${algorithm.name} circuit run landed at ${runAccuracy}% prediction agreement. Which gate or operation most changed the measured distribution?`}
            hints={[
              "Compare the largest predicted and observed outcomes.",
              "Use the statevector view to inspect amplitudes before measurement.",
              "Change one gate at a time, then rerun to test your explanation.",
            ]}
          />
        </div>
      </div>
    </div>
  )
}
