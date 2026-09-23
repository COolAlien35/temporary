"use client"

import { motion } from "motion/react"
import { useStudio } from "@/store/use-studio"

export function WhatChangedCard() {
  const result = useStudio((s) => s.result)
  const previousResult = useStudio((s) => s.previousResult)

  if (!result || !previousResult) return null

  const deltas = Object.keys(result.probabilities)
    .map((key) => ({ key, delta: (result.probabilities[key] ?? 0) - (previousResult.probabilities[key] ?? 0) }))
    .filter((d) => Math.abs(d.delta) > 0.005)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5)

  if (deltas.length === 0) return null

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">What changed since last run</p>
      <div className="mt-2 flex flex-col gap-1.5">
        {deltas.map((d) => (
          <div key={d.key} className="flex items-center gap-2 text-xs">
            <span className="w-14 font-mono text-white/60">|{d.key}⟩</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={d.delta > 0 ? "absolute inset-y-0 left-1/2 bg-[#4ADE80]" : "absolute inset-y-0 right-1/2 bg-rose-400"}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(50, Math.abs(d.delta) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
            </div>
            <span className={d.delta > 0 ? "w-14 text-right font-mono text-[#4ADE80]" : "w-14 text-right font-mono text-rose-400"}>
              {d.delta > 0 ? "+" : ""}
              {(d.delta * 100).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
