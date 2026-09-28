"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/store/use-session"

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  const learnerPreference = useSession((state) => Boolean(state.user && state.preferences.reduceMotion))

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    query.addEventListener("change", handler)
    return () => query.removeEventListener("change", handler)
  }, [])

  return reduced || learnerPreference
}
