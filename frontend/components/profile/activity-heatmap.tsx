"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { HeatmapSweep, HeatmapLattice } from "@/components/me/accents/HeatmapScanner"
import { handleGlowPointerMove } from "@/lib/home-glow"

const COLORS = ["#141b2b", "#3a3320", "#6b551f", "#a3811f", "#F5B942"]
const CELL = 10
const GAP = 3
const WEEKS = 52
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function ActivityHeatmap() {
  const reduceMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState<{ week: number; day: number } | null>(null)
  const [swept, setSwept] = useState(false)
  const activities = useLearnerProgress((state) => state.activities)
  const activityDays = useLearnerProgress((state) => state.activityDays)
  const xp = useLearnerProgress((state) => state.xp)
  const streak = useLearnerProgress((state) => state.streak)
  useEffect(() => setMounted(true), [])
  const cellData = useMemo(() => {
    const byDay = new Map<string, { xp: number; runs: number }>()
    for (const activity of activities) {
      const key = dayKey(new Date(activity.timestamp))
      const current = byDay.get(key) ?? { xp: 0, runs: 0 }
      current.xp += activity.xp
      if (activity.kind === "experiment") current.runs += 1
      byDay.set(key, current)
    }
    const today = new Date()
    const start = new Date(today)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - (WEEKS * 7 - 1))
    return Array.from({ length: WEEKS * 7 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = dayKey(date)
      const record = byDay.get(key) ?? { xp: 0, runs: 0 }
      const active = mounted && activityDays.includes(key)
      const intensity = active ? Math.min(4, Math.max(1, Math.ceil((record.xp + record.runs * 8) / 25))) : 0
      return { week: Math.floor(index / 7), day: index % 7, intensity, active, date: key, label: date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" }), xp: record.xp, runs: record.runs }
    })
  }, [activities, activityDays, mounted])
  const activeDays = mounted ? cellData.filter((cell) => cell.active).length : 0

  return <motion.div onPointerMove={handleGlowPointerMove} onViewportEnter={() => setSwept(true)} viewport={{ once: true, margin: "-40px" }} className="home-glow-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
    <HeatmapLattice reduced={!!reduceMotion} />
    <div className="relative flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>52-Week Learning Activity</h3><p className="text-xs text-white/45"><span className="font-medium text-white/70">{activeDays}</span> active days · <span className="font-medium text-white/70">{mounted ? xp.toLocaleString() : 0}</span> XP · <span className="font-medium text-[#FFB800]">{mounted ? streak : 0}-day</span> streak</p></div>
    {activeDays === 0 ? <p className="relative mt-3 text-xs text-white/45">Your activity history will fill in as you complete lessons, assessments, and simulations.</p> : null}
    <div className="relative mt-4 overflow-x-auto pb-2"><HeatmapSweep play={swept} reduced={!!reduceMotion} /><svg viewBox={`0 0 ${WEEKS * (CELL + GAP)} ${7 * (CELL + GAP)}`} width={WEEKS * (CELL + GAP)} height={7 * (CELL + GAP)} role="img" aria-label={`Contribution heatmap: ${activeDays} active days in the last 364 days`} onMouseLeave={() => setHovered(null)}>
      {cellData.map((cell) => { const x = cell.week * (CELL + GAP); const y = cell.day * (CELL + GAP); const isHovered = hovered?.week === cell.week && hovered?.day === cell.day; return <g key={cell.date} onMouseEnter={() => setHovered({ week: cell.week, day: cell.day })} style={{ transformOrigin: `${x + CELL / 2}px ${y + CELL / 2}px`, transform: isHovered ? "scale(1.35)" : "scale(1)", transition: "transform 0.15s ease" }}><rect x={x} y={y} width={CELL} height={CELL} rx={2.5} fill={COLORS[cell.intensity]}><title>{`${cell.label}: ${cell.active ? `${cell.xp} XP, ${cell.runs} simulations` : "No recorded activity"}`}</title></rect></g> })}
    </svg></div>
    <div className="relative mt-3 flex items-center justify-end gap-1.5 text-[10px] text-white/40"><span>Less</span>{COLORS.map((color) => <span key={color} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: color }} />)}<span>More</span></div>
  </motion.div>
}
