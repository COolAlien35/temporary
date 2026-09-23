"use client"

import { useCountUp } from "@/hooks/use-count-up"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export function CountUp({
  from = 0,
  to,
  duration = 1,
  className,
}: {
  from?: number
  to: number
  duration?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const value = useCountUp(to, { from, duration: reduced ? 0 : duration })

  return <span className={className}>{Math.floor(value)}</span>
}
