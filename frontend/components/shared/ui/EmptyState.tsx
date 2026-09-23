"use client"

import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center", className)}>
      {Icon && <Icon className="mb-4 h-12 w-12 text-white/30" />}
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mb-4 max-w-sm text-sm text-white/60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
