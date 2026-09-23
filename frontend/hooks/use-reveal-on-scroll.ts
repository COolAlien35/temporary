"use client"

import { useEffect, useRef, useState } from "react"

/** Fires once when the element enters the viewport; stays true afterward. */
export function useRevealOnScroll<T extends HTMLElement = HTMLDivElement>(margin = "-60px") {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin: `0px 0px ${margin} 0px`, threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [margin])

  return { ref, revealed }
}
