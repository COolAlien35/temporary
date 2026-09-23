"use client"

import { useEffect, useState } from "react"

/**
 * Tracks page scroll position via a passive listener batched to
 * requestAnimationFrame, so consumers can derive per-layer parallax
 * offsets (scrollY * speed) without triggering layout thrash.
 */
export function useScrollParallax() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        setScrollY(window.scrollY)
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return scrollY
}

export function useMouseParallax(maxShift = 12) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (isTouch) return
    let ticking = false
    function onMove(e: PointerEvent) {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2
        const ny = (e.clientY / window.innerHeight - 0.5) * 2
        setOffset({ x: -nx * maxShift, y: -ny * maxShift })
        ticking = false
      })
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [maxShift])

  return offset
}

export function useTabVisible() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    function onChange() {
      setVisible(document.visibilityState === "visible")
    }
    document.addEventListener("visibilitychange", onChange)
    return () => document.removeEventListener("visibilitychange", onChange)
  }, [])
  return visible
}
