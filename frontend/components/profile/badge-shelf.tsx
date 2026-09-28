"use client"

import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { LockIcon } from "lucide-react"
import { BADGES, type Badge } from "@/lib/quantum-passport-data"
import { useLearnerProgress } from "@/store/use-learner-progress"
import { BadgeGlyph } from "@/components/svg/badge-glyphs"
import { EarnedBadgeAura, LockedBadgeAura } from "@/components/me/accents/BadgeShimmer"
import { ShelfLine } from "@/components/me/accents/ShelfLine"
import { handleGlowPointerMove } from "@/lib/home-glow"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"

const FILTERS = [
  { value: "all", label: "All" },
  { value: "earned", label: "Earned" },
  { value: "locked", label: "Locked" },
] as const

const ACHIEVEMENTS: Array<Pick<Badge, "id" | "title" | "description" | "criteria" | "glyph">> = [
  { id: "first-lesson", title: "First Steps", description: "Completed your first curriculum lesson.", criteria: "Complete any lesson in the curriculum.", glyph: "hadamard" },
  { id: "first-experiment", title: "Simulation Explorer", description: "Ran your first local circuit simulation.", criteria: "Run a circuit in Studio or an algorithm lab.", glyph: "decoherence" },
  { id: "quiz-finisher", title: "Knowledge Check", description: "Passed a unit quiz.", criteria: "Earn a score of at least 70% on a unit quiz.", glyph: "socratic" },
  { id: "challenge-solver", title: "Circuit Solver", description: "Passed a simulator-graded circuit challenge.", criteria: "Meet the target outcome and constraints in any circuit challenge.", glyph: "oracle" },
]

function filterBadges(filter: string, badges: Badge[]) {
  if (filter === "earned") return badges.filter((b) => b.earned)
  if (filter === "locked") return badges.filter((b) => !b.earned)
  return badges
}

function BadgeCard({ badge, onViewCriteria }: { badge: Badge; onViewCriteria: (badge: Badge) => void }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={reduceMotion ? undefined : { rotateX: -4, rotateY: 4, scale: 1.02 }}
      style={{ transformPerspective: 700 }}
      className="group"
    >
      <div
        onPointerMove={handleGlowPointerMove}
        className={
          badge.earned
            ? "home-glow-card relative flex h-full flex-col overflow-hidden rounded-xl border border-[#FFB800]/35 bg-[#FFB800]/[0.05] p-4 shadow-[0_0_24px_-12px_rgba(255,184,0,0.7)] sm:p-5"
            : "relative flex h-full flex-col overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 sm:p-5"
        }
      >
        {badge.earned ? (
          <EarnedBadgeAura reduced={!!reduceMotion} />
        ) : (
          <LockedBadgeAura reduced={!!reduceMotion} />
        )}

        <div className="relative flex items-start justify-between gap-2">
          <div
            className={
              badge.earned
                ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FFB800]/10 text-[#FFB800]"
                : "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/30"
            }
          >
            <BadgeGlyph id={badge.glyph} className="h-8 w-8" />
          </div>
          {!badge.earned && (
            <span className="passport-lock-icon flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-white/40">
              <LockIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>

        <h4 className="relative mt-3 text-sm font-semibold text-white">{badge.title}</h4>
        <p className="relative mt-1.5 flex-1 text-xs leading-relaxed text-white/50">{badge.description}</p>

        <div className="relative mt-4 flex items-center justify-between gap-2 pt-1">
          {badge.earned ? (
            <span className="text-[10px] font-medium text-[#FFB800]/80">Earned {badge.earnedDate}</span>
          ) : (
            <button
              type="button"
              onClick={() => onViewCriteria(badge)}
              className="text-[10px] font-medium text-[#00D4FF] hover:underline"
            >
              View criteria
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function BadgeShelf() {
  const [filter, setFilter] = useState<string>("all")
  const [activeBadge, setActiveBadge] = useState<Badge | null>(null)
  const [mounted, setMounted] = useState(false)
  const earnedIds = useLearnerProgress((state) => state.badges)
  const activities = useLearnerProgress((state) => state.activities)
  useEffect(() => setMounted(true), [])
  const availableIds = mounted ? earnedIds : []
  const recentActivities = mounted ? activities : []
  const badges: Badge[] = [
    ...ACHIEVEMENTS.map((badge) => {
      const earned = availableIds.includes(badge.id)
      const activity = recentActivities.find((item) => badge.id === "first-lesson" ? item.kind === "lesson" : badge.id === "first-experiment" ? item.kind === "experiment" : badge.id === "quiz-finisher" ? item.kind === "quiz" && (item.score ?? 0) >= 70 : item.kind === "challenge" && item.xp > 0)
      return { ...badge, earned, earnedDate: earned && activity ? new Date(activity.timestamp).toLocaleDateString() : undefined, progress: earned ? 100 : 0 }
    }),
    ...BADGES.filter((badge) => !["hadamard-pioneer", "bell-state-architect", "decoherence-defier", "socratic-solver"].includes(badge.id)).map((badge) => ({ ...badge, earned: false, earnedDate: undefined, progress: 0 })),
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-space-grotesk)" }}>
          Honors &amp; Insignia
        </h3>
        <Tabs value={filter} onValueChange={(v) => setFilter(String(v))}>
          <TabsList variant="line">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filterBadges(filter, badges).map((badge) => (
          <BadgeCard key={badge.id} badge={badge} onViewCriteria={setActiveBadge} />
        ))}
      </div>
      {!badges.some((badge) => badge.earned) && <p className="mt-4 text-xs text-white/45">No badges yet. Your first completed lesson, simulation, quiz, or challenge will earn one.</p>}
      <ShelfLine />

      <Dialog open={activeBadge !== null} onOpenChange={(open) => !open && setActiveBadge(null)}>
        <DialogContent>
          {activeBadge && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 text-white/40">
                    <BadgeGlyph id={activeBadge.glyph} className="h-8 w-8" />
                  </div>
                  <DialogTitle>{activeBadge.title}</DialogTitle>
                </div>
                <DialogDescription>{activeBadge.criteria}</DialogDescription>
              </DialogHeader>

              <Progress value={activeBadge.progress ?? 0}>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Progress</span>
                  <span className="tabular-nums text-white/80">{activeBadge.progress ?? 0}%</span>
                </div>
                <ProgressTrack className="bg-white/10">
                  <ProgressIndicator className="bg-[#00D4FF]" />
                </ProgressTrack>
              </Progress>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
