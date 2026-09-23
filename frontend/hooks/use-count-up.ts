"use client"

import { useEffect, useState } from "react"

/**
 * Animates a number from 0 (or `from`) up to `value` once, starting when
 * `start` becomes true. Intended to be paired with an IntersectionObserver
 * or whileInView trigger so the count-up plays once per mount.
 *
 * Note: intentionally has no "already played" ref guard — React Strict
 * Mode's dev-only double effect invocation would set such a guard on the
 * throwaway first pass and then skip the real run, leaving the display
 * stuck at `from`. Re-running on remount is harmless here.
 */
export function useCountUp(value: number, { start = true, duration = 900, from = 0 } = {}) {
  const [display, setDisplay] = useState(from)

  useEffect(() => {
    if (!start) return

    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      setDisplay(value)
      return
    }

    let raf = 0
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [start, value, duration, from])

  return display
}
