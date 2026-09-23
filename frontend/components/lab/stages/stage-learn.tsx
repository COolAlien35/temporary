"use client"

import dynamic from "next/dynamic"
import { Lightbulb } from "lucide-react"
import { useLab } from "@/lib/lab-context"
import { deutschJozsaAnimation } from "@/lib/algo-animations/deutsch-jozsa"
import { groverAnimation } from "@/lib/algo-animations/grover"
import { qftAnimation } from "@/lib/algo-animations/qft"
import { shorAnimation } from "@/lib/algo-animations/shor"
import { qecAnimation } from "@/lib/algo-animations/qec"

const AlgoAnimationPlayer = dynamic(() => import("@/components/lab/anim/AlgoAnimationPlayer").then((mod) => mod.AlgoAnimationPlayer), { ssr: false })
const ANIMATIONS = { "deutsch-jozsa": deutschJozsaAnimation, grover: groverAnimation, qft: qftAnimation, shor: shorAnimation, qec: qecAnimation }
import { StageHeader } from "@/components/lab/stage-header"

export function StageLearn() {
  const { algorithm, advanceStage } = useLab()
  const animation = ANIMATIONS[algorithm.slug as keyof typeof ANIMATIONS]

  const handleContinue = () => {
    advanceStage(1, 2)
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
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-primary"
          >
            Formulate Hypothesis →
          </button>
        }
      />

      {animation ? <div className="mb-5"><AlgoAnimationPlayer config={animation} onContinue={handleContinue} /></div> : <div className="mb-5 rounded-xl border border-border bg-card p-6 text-center"><h2 className="text-lg font-semibold">Animation coming soon</h2><p className="mt-2 text-sm text-muted-foreground">This walkthrough is being prepared for {algorithm.name}.</p></div>}

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{algorithm.learn.calloutTitle}</h3>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg bg-background/70 px-4 py-3 font-mono text-sm text-primary">
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
