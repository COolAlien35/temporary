"use client"

import { motion } from "motion/react"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#00D4FF]/70">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-white/60">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  )
}
