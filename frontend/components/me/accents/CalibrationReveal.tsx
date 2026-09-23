"use client"

import { motion } from "motion/react"

/** Slowly "marching" dashed threshold line for the calibration chart. */
export function ThresholdMarchLine({
  x1,
  x2,
  y,
  reduced,
}: {
  x1: number
  x2: number
  y: number
  reduced: boolean
}) {
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke="#FFB800"
      strokeOpacity="0.5"
      strokeWidth="1.3"
      strokeDasharray="4 4"
      style={reduced ? undefined : { animation: "home-wave-drift 3s linear infinite" }}
    />
  )
}

/** Pulsing ring + floating callout on the latest calibration data point. */
export function LatestPointHighlight({ x, y, value, reduced }: { x: number; y: number; value: number; reduced: boolean }) {
  return (
    <g aria-hidden="true">
      {!reduced && (
        <motion.circle
          cx={x}
          cy={y}
          r={4}
          fill="none"
          stroke="#00D4FF"
          strokeWidth={1.2}
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: [1, 2.4, 1], opacity: [0.9, 0, 0.9] }}
          transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY, ease: "easeOut" }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}
      <motion.g
        initial={{ opacity: 0, y: y - 8 }}
        whileInView={{ opacity: 1, y: y - 16 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 1.2 }}
      >
        <rect x={x - 30} y={y - 30} width={60} height={16} rx={4} fill="#0A0E17" stroke="#00D4FF" strokeOpacity={0.4} />
        <text x={x} y={y - 19} textAnchor="middle" fontSize="8" fill="#00D4FF">
          {`Latest: ${value}%`}
        </text>
      </motion.g>
    </g>
  )
}
