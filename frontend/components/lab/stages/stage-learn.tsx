"use client"

import { Lightbulb } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { StageHeader } from "@/components/lab/stage-header"

export function StageLearn() {
  const { algorithm, goToStage, completeStage } = useLab()

  const handleContinue = () => {
    completeStage(1)
    goToStage(2)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StageHeader
        eyebrow="Stage 1 of 9 · Fundamental Grounding"
        title={`Understanding ${algorithm.name}`}
        action={
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-amber-300"
          >
            Formulate Hypothesis →
          </button>
        }
      />

      <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">{algorithm.learn.calloutTitle}</h3>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg bg-background/70 px-4 py-3 font-mono text-sm text-amber-300">
          {algorithm.learn.equation}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {algorithm.learn.body.map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}
