"use client"

import { cn } from "@/lib/utils"

export function StatChip({
  label,
  value,
  variant = "default",
  className,
}: {
  label: string
  value: string | number
  variant?: "default" | "gold" | "green"
  className?: string
}) {
  const colors = {
    default: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/30",
    gold: "bg-[#F5B942]/10 text-[#F5B942] border-[#F5B942]/30",
    green: "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30",
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium", colors[variant], className)}>
      <span className="text-white/60">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
