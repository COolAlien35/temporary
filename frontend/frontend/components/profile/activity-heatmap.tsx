"use client"

import { useReducedMotion } from "motion/react"
import { HEATMAP_CELLS, HEATMAP_SUMMARY } from "@/lib/quantum-passport-data"

const INTENSITY_COLORS = ["#141b2b", "#3a3320", "#6b551f", "#a3811f", "#F5B942"]
const CELL = 10
const GAP = 3
const WEEKS = 52

export function ActivityHeatmap() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          52-Week Research Heatmap
        </h3>
        <p className="text-xs text-white/45">
          <span className="font-medium text-white/70">{HEATMAP_SUMMARY.activeDays}</span> active days &middot;{" "}
          <span className="font-medium text-white/70">{HEATMAP_SUMMARY.totalXp.toLocaleString()}</span> XP &middot;{" "}
          <span className="font-medium text-[#FFB800]">{HEATMAP_SUMMARY.streak}-day</span> streak
        </p>
      </div>

      <style>{`
        @keyframes heatmap-cell-in {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="mt-4 overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${WEEKS * (CELL + GAP)} ${7 * (CELL + GAP)}`}
          width={WEEKS * (CELL + GAP)}
          height={7 * (CELL + GAP)}
          role="img"
          aria-label={`Contribution heatmap: ${HEATMAP_SUMMARY.activeDays} active days out of 364, ${HEATMAP_SUMMARY.totalXp} total XP earned`}
        >
          {HEATMAP_CELLS.map((cell) => {
            const x = cell.week * (CELL + GAP)
            const y = cell.day * (CELL + GAP)
            return (
              <g key={`${cell.week}-${cell.day}`}>
                <rect
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2.5}
                  fill={INTENSITY_COLORS[cell.intensity]}
                  style={
                    reduceMotion
                      ? undefined
                      : {
                          animation: `heatmap-cell-in 0.4s ease-out backwards`,
                          animationDelay: `${cell.week * 8}ms`,
                        }
                  }
                >
                  <title>
                    {`${cell.label}: ${cell.xp} XP, ${cell.simulations} simulation${cell.simulations === 1 ? "" : "s"} run`}
                  </title>
                </rect>
                {cell.isToday && (
                  <rect
                    x={x - 1.5}
                    y={y - 1.5}
                    width={CELL + 3}
                    height={CELL + 3}
                    rx={3.5}
                    fill="none"
                    stroke="#00D4FF"
                    strokeWidth="1.4"
                  >
                    {!reduceMotion && (
                      <animate attributeName="opacity" values="1;0.25;1" dur="2s" repeatCount="indefinite" />
                    )}
                  </rect>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-white/40">
        <span>Less</span>
        {INTENSITY_COLORS.map((color) => (
          <span key={color} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
