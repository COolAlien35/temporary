"use client"

import { motion, useReducedMotion } from "motion/react"
import { CALIBRATION_ROUNDS } from "@/lib/quantum-passport-data"
import { ThresholdMarchLine, LatestPointHighlight } from "@/components/me/accents/CalibrationReveal"
import { handleGlowPointerMove } from "@/lib/home-glow"

const WIDTH = 400
const HEIGHT = 180
const PAD_X = 24
const PAD_Y = 20
const THRESHOLD = 80

function scaleX(i: number) {
  return PAD_X + (i / (CALIBRATION_ROUNDS.length - 1)) * (WIDTH - PAD_X * 2)
}

function scaleY(value: number) {
  return HEIGHT - PAD_Y - (value / 100) * (HEIGHT - PAD_Y * 2)
}

export function CalibrationChart() {
  const reduceMotion = useReducedMotion()
  const points = CALIBRATION_ROUNDS.map((r, i) => ({ x: scaleX(i), y: scaleY(r.accuracy), ...r }))
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PAD_Y} L ${points[0].x} ${HEIGHT - PAD_Y} Z`
  const thresholdY = scaleY(THRESHOLD)
  const improvement = CALIBRATION_ROUNDS[CALIBRATION_ROUNDS.length - 1].accuracy - CALIBRATION_ROUNDS[0].accuracy

  const latest = points[points.length - 1]

  return (
    <div
      onPointerMove={handleGlowPointerMove}
      className="home-glow-card relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
        Prediction Calibration
      </h3>
      <p className="mt-1 text-xs font-medium text-[#4ADE80]">Well-calibrated (consistently &ge; 80%)</p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`Prediction accuracy across 7 rounds: ${CALIBRATION_ROUNDS.map((r) => `${r.round} ${r.accuracy}%`).join(", ")}`}
      >
        <defs>
          <linearGradient id="calibration-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
          </linearGradient>
        </defs>

        <ThresholdMarchLine x1={PAD_X} x2={WIDTH - PAD_X} y={thresholdY} reduced={!!reduceMotion} />
        <text x={WIDTH - PAD_X} y={thresholdY - 6} textAnchor="end" fontSize="9" fill="#FFB800" opacity="0.8">
          80% target
        </text>

        <motion.path
          d={areaPath}
          fill="url(#calibration-fill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="#00D4FF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />

        {points.map((p, i) => (
          <motion.g
            key={p.round}
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: reduceMotion ? 0 : 1.1 + i * 0.1, ease: "easeOut" }}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          >
            <circle cx={p.x} cy={p.y} r={4} fill="#0A0E17" stroke="#00D4FF" strokeWidth="2" className="cursor-pointer">
              <title>{`${p.round}: ${p.accuracy}% accuracy`}</title>
            </circle>
            <text x={p.x} y={HEIGHT - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)">
              {p.round}
            </text>
          </motion.g>
        ))}

        <LatestPointHighlight x={latest.x} y={latest.y} value={latest.accuracy} reduced={!!reduceMotion} />
      </svg>

      <div className="mt-3 flex flex-1 items-center gap-3 rounded-xl border border-[#00D4FF]/20 bg-[#00D4FF]/[0.06] px-4 py-3 text-xs text-white/70">
        <motion.svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-[#4ADE80]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          animate={reduceMotion ? undefined : { y: [0, -2, 0] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <path d="M4 17 10 11 14 15 20 7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
        <p>
          <span className="font-semibold text-[#00D4FF]">Insight:</span> Your predictions improved {improvement}{" "}
          points in {CALIBRATION_ROUNDS.length} runs.
        </p>
      </div>
    </div>
  )
}
