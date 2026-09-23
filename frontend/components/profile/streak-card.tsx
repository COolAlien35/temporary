"use client"

import { motion, useReducedMotion } from "motion/react"
import { LEARNER, WEEK_NODES } from "@/lib/quantum-passport-data"
import { StreakEmbers } from "@/components/me/accents/StreakEmbers"
import { WeekCircuit } from "@/components/me/accents/WeekCircuit"
import { handleGlowPointerMove } from "@/lib/home-glow"

export function StreakCard() {
  const reduceMotion = useReducedMotion()
  const currentDayIndex = WEEK_NODES.reduce((acc, n, i) => (n.completed ? i : acc), 0)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div onPointerMove={handleGlowPointerMove} className="home-glow-card relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">Current streak</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-14 w-14 shrink-0">
            <StreakEmbers reduced={!!reduceMotion} />
          <svg viewBox="0 0 48 48" className="h-14 w-14 shrink-0" role="img" aria-labelledby="flame-title">
            <title id="flame-title">A gently flickering flame representing an active streak</title>
            <motion.path
              d="M24 6c4 6 10 10 10 19a10 10 0 0 1-20 0c0-4 2-6 4-9-1 4 1 6 3 6 3 0 3-3 2-6 2-3 1-6 1-10Z"
              fill="#FFB800"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.06, 0.97, 1.03, 1],
                      opacity: [0.9, 1, 0.85, 1, 0.9],
                    }
              }
              transition={{ duration: 2.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 0 8px rgba(255,184,0,0.6))" }}
            />
          </svg>
          </div>
          <div>
            <p className="text-3xl font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
              {LEARNER.streak} <span className="text-base font-normal text-white/50">days</span>
            </p>
            <p className="mt-0.5 text-xs text-white/45">Personal best: {LEARNER.bestStreak} days</p>
          </div>
        </div>
      </div>

      <div onPointerMove={handleGlowPointerMove} className="home-glow-card relative rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">This week</p>
        <svg viewBox="0 0 280 60" className="mt-3 h-14 w-full" role="img" aria-label="Weekly momentum: Monday through Friday completed, Saturday and Sunday pending">
          {WEEK_NODES.map((node, i) =>
            i < WEEK_NODES.length - 1 ? (
              <motion.line
                key={`line-${node.day}`}
                x1={20 + i * 40}
                y1={24}
                x2={20 + (i + 1) * 40}
                y2={24}
                stroke={node.completed ? "#FFB800" : "rgba(255,255,255,0.12)"}
                strokeWidth="2"
                initial={{ pathLength: reduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.15 * i, ease: "easeOut" }}
              />
            ) : null
          )}
          {WEEK_NODES.map((node, i) => (
            <g key={node.day}>
              <motion.circle
                cx={20 + i * 40}
                cy={24}
                r={6}
                fill={node.completed ? "#FFB800" : "#0f1420"}
                stroke={node.completed ? "#FFB800" : "rgba(255,255,255,0.25)"}
                strokeWidth="1.5"
                initial={{ scale: reduceMotion ? 1 : 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: reduceMotion ? 0 : 0.15 * i, ease: "easeOut" }}
                style={node.completed ? { filter: "drop-shadow(0 0 5px rgba(255,184,0,0.7))" } : undefined}
              />
              {i === currentDayIndex && <WeekCircuit cx={20 + i * 40} cy={24} reduced={!!reduceMotion} />}
              <text x={20 + i * 40} y={46} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">
                {node.day}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
