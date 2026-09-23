"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { CircuitBuilderIcon, AiTutorIcon, AnalyticsIcon } from "@/lib/quantum-icons"

const ELECTRONS = [
  {
    Icon: CircuitBuilderIcon,
    color: "#00D4FF",
    label: "Build real quantum circuits",
    target: { x: -280, y: -60 },
    start: 0.15,
    end: 0.55,
  },
  {
    Icon: AiTutorIcon,
    color: "#4FD1E8",
    label: "Get AI explanations as you go",
    target: { x: 0, y: 230 },
    start: 0.25,
    end: 0.65,
  },
  {
    Icon: AnalyticsIcon,
    color: "#FFB800",
    label: "Track your progress concept by concept",
    target: { x: 280, y: -60 },
    start: 0.35,
    end: 0.75,
  },
]

export function ScrollAtomSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  const orbitScale = useTransform(scrollYProgress, [0, 0.15, 0.55], [1, 1, 1.9])
  const atomFade = useTransform(scrollYProgress, [0.65, 0.9], [0.3, 0])
  const ringOpacity = useTransform(scrollYProgress, [0, 0.3, 0.6], [0.35, 0.35, 0])
  const headingOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])
  const headingY = useTransform(scrollYProgress, [0, 0.15], [0, -40])

  return (
    <section ref={containerRef} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          style={{ opacity: headingOpacity, y: headingY }}
          className="pointer-events-none absolute top-20 z-20 px-6 text-center"
        >
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            One atom. Three ways to learn.
          </h2>
          <p className="mt-2 text-sm text-white/50">Keep scrolling to watch it unfold</p>
        </motion.div>

        <motion.svg
          viewBox="0 0 200 200"
          className="absolute h-[280px] w-[280px] sm:h-[360px] sm:w-[360px]"
          style={{ scale: orbitScale, opacity: atomFade }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="nucleus-glow-2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4FD1E8" stopOpacity="1" />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="16" fill="url(#nucleus-glow-2)" />
          <circle cx="100" cy="100" r="5" fill="#E5F9FF" />
          {[0, 60, 120].map((rotate) => (
            <ellipse
              key={rotate}
              cx="100"
              cy="100"
              rx="75"
              ry="28"
              fill="none"
              stroke="#00D4FF"
              strokeOpacity={0.3}
              strokeWidth="1"
              transform={`rotate(${rotate} 100 100)`}
              style={{ opacity: ringOpacity as unknown as number }}
            />
          ))}
        </motion.svg>

        {ELECTRONS.map((electron, i) => (
          <Electron key={i} electron={electron} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  )
}

function Electron({
  electron,
  progress,
}: {
  electron: (typeof ELECTRONS)[number]
  progress: ReturnType<typeof useScroll>["scrollYProgress"]
}) {
  const { Icon, color, label, target, start, end } = electron
  const x = useTransform(progress, [start, end], [0, target.x])
  const y = useTransform(progress, [start, end], [0, target.y])
  const scale = useTransform(progress, [start, start + 0.1, end], [0.6, 1.1, 1])
  const iconOpacity = useTransform(progress, [end - 0.1, end], [0, 1])
  const dotOpacity = useTransform(progress, [start, end - 0.1], [1, 0])
  const textOpacity = useTransform(progress, [end, Math.min(end + 0.15, 1)], [0, 1])
  const textY = useTransform(progress, [end, Math.min(end + 0.15, 1)], [12, 0])

  return (
    <motion.div
      className="absolute z-10 flex flex-col items-center gap-3"
      style={{ x, y }}
    >
      <motion.div className="relative h-14 w-14" style={{ scale }}>
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color, opacity: dotOpacity, boxShadow: `0 0 18px ${color}` }}
        />
        <motion.div
          style={{ opacity: iconOpacity }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl"
        >
          <Icon className="h-6 w-6" style={{ color }} />
        </motion.div>
      </motion.div>
      <motion.p
        style={{ opacity: textOpacity, y: textY }}
        className="max-w-[160px] text-center text-xs font-medium text-white/70 sm:text-sm"
      >
        {label}
      </motion.p>
    </motion.div>
  )
}
