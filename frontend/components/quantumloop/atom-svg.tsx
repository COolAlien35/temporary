"use client"

import { motion } from "motion/react"

export function AtomSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="nucleus-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4FD1E8" stopOpacity="1" />
          <stop offset="60%" stopColor="#00D4FF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="200" cy="200" r="26" fill="url(#nucleus-glow)" />
      <circle cx="200" cy="200" r="9" fill="#E5F9FF" />

      {[
        { rx: 150, ry: 55, rotate: 0, duration: 14, color: "#00D4FF" },
        { rx: 150, ry: 55, rotate: 60, duration: 18, color: "#4FD1E8" },
        { rx: 150, ry: 55, rotate: 120, duration: 22, color: "#FFB800" },
      ].map((ring, i) => (
        <motion.g
          key={i}
          style={{ transformOrigin: "200px 200px" }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: ring.duration, ease: "linear" }}
        >
          <g transform={`rotate(${ring.rotate} 200 200)`}>
            <ellipse
              cx="200"
              cy="200"
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke={ring.color}
              strokeOpacity="0.35"
              strokeWidth="1.2"
            />
            <circle cx={200 + ring.rx} cy="200" r="6" fill={ring.color}>
              <animate attributeName="opacity" values="1;0.6;1" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
        </motion.g>
      ))}
    </svg>
  )
}
