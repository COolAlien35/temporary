"use client"

import { motion, useReducedMotion } from "motion/react"
import { LEARNER } from "@/lib/quantum-passport-data"

const STARS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  size: 1 + (i % 3),
  opacity: 0.2 + ((i * 13) % 40) / 100,
  duration: 2.5 + (i % 5),
}))

const GAUGE_RADIUS = 54
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS

export function ProfileHero() {
  const reduceMotion = useReducedMotion()
  const pct = Math.min(LEARNER.xp / LEARNER.xpToNextLevel, 1)
  const dashOffset = GAUGE_CIRCUMFERENCE * (1 - pct)
  const xpRemaining = LEARNER.xpToNextLevel - LEARNER.xp

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {STARS.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animation: reduceMotion ? undefined : `passport-twinkle ${s.duration}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes passport-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.75; }
        }
      `}</style>

      <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
            <svg
              viewBox="0 0 160 160"
              className="h-full w-full"
              role="img"
              aria-labelledby="passport-avatar-title"
            >
              <title id="passport-avatar-title">
                {`${LEARNER.name} avatar with ${LEARNER.level} orbiting rings representing Level ${LEARNER.level}`}
              </title>
              <defs>
                <radialGradient id="avatar-grad" cx="35%" cy="28%" r="75%">
                  <stop offset="0%" stopColor="#4FD1E8" />
                  <stop offset="100%" stopColor="#00D4FF" />
                </radialGradient>
              </defs>

              {Array.from({ length: LEARNER.level }).map((_, i) => {
                const ry = 24 + i * 6
                const tilt = (i * 180) / LEARNER.level
                const duration = 9 + i * 3
                const path = `M 8 80 A 72 ${ry} 0 1 1 152 80 A 72 ${ry} 0 1 1 8 80`
                return (
                  <g key={i} transform={`rotate(${tilt} 80 80)`}>
                    <ellipse cx="80" cy="80" rx="72" ry={ry} fill="none" stroke="#00D4FF" strokeOpacity="0.22" strokeWidth="1.1" />
                    <circle r="3" fill="#FFB800" style={{ filter: "drop-shadow(0 0 3px #FFB800)" }}>
                      {!reduceMotion && (
                        <animateMotion dur={`${duration}s`} repeatCount="indefinite" path={path} />
                      )}
                      {reduceMotion && <animate attributeName="cx" values="80" dur="1s" begin="0s" />}
                    </circle>
                  </g>
                )
              })}

              <circle cx="80" cy="80" r="40" fill="url(#avatar-grad)" />
              <text
                x="80"
                y="90"
                textAnchor="middle"
                fontSize="28"
                fontWeight="700"
                fill="#0A0E17"
                style={{ fontFamily: "var(--font-space-grotesk)" }}
              >
                {LEARNER.initials}
              </text>
            </svg>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10 px-2.5 py-1 text-[11px] font-medium text-[#FFB800]">
              Level {LEARNER.level} Scholar &middot; {LEARNER.rank}
            </span>
            <h1
              className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {LEARNER.name}
            </h1>
            <dl className="mt-2 flex flex-col gap-1 font-mono text-xs text-white/50 sm:flex-row sm:gap-4">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <dt className="sr-only">Email</dt>
                <dd>{LEARNER.email}</dd>
              </div>
              <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                <dt className="sr-only">Cohort</dt>
                <dd>
                  {LEARNER.cohort} &middot; {LEARNER.batch}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-2">
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={GAUGE_RADIUS} fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="10" />
              <motion.circle
                cx="70"
                cy="70"
                r={GAUGE_RADIUS}
                fill="none"
                stroke="#00D4FF"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={GAUGE_CIRCUMFERENCE}
                initial={{ strokeDashoffset: GAUGE_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: reduceMotion ? 0 : 1.3, ease: "easeOut", delay: 0.2 }}
                style={{ filter: "drop-shadow(0 0 6px rgba(0,212,255,0.6))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
                {LEARNER.xp}
                <span className="text-sm font-normal text-white/40">/{LEARNER.xpToNextLevel}</span>
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/40">XP</span>
            </div>
          </div>
          <p className="text-center text-xs text-white/55">
            <span className="font-semibold text-[#00D4FF]">{xpRemaining} XP</span> to Level {LEARNER.level + 1}:{" "}
            {LEARNER.nextLevelLabel}
          </p>
        </div>
      </div>
    </div>
  )
}
