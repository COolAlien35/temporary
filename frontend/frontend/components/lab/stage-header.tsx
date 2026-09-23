import type { ReactNode } from "react"

export function StageHeader({
  eyebrow,
  title,
  accuracyBadge,
  action,
}: {
  eyebrow: string
  title: string
  accuracyBadge?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-primary">{eyebrow}</span>
          {accuracyBadge}
        </div>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function AccuracyBadge({ accuracy }: { accuracy: number }) {
  return (
    <span
      className={
        accuracy >= 70
          ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
          : accuracy > 0
            ? "rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
            : "rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400"
      }
    >
      Accuracy: {accuracy}%
    </span>
  )
}
