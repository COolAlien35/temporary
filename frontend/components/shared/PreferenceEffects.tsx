"use client"

import { useEffect } from "react"
import { MotionConfig } from "motion/react"
import { useSession } from "@/store/use-session"

export function PreferenceEffects({ children }: { children: React.ReactNode }) {
  const reduceMotion = useSession((state) => Boolean(state.user && state.preferences.reduceMotion))

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion)
    return () => document.documentElement.classList.remove("reduce-motion")
  }, [reduceMotion])

  return <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>
}
