"use client"

import { useEffect, useState } from "react"
import { StarField } from "@/components/home/backdrop/StarField"
import { AmplitudeWaves } from "@/components/home/backdrop/AmplitudeWaves"
import { OrbitRings } from "@/components/home/backdrop/OrbitRings"
import { FloatingMotifs } from "@/components/home/backdrop/FloatingMotifs"
import { ScrollCircuitTrace } from "@/components/home/backdrop/ScrollCircuitTrace"
import { PassportMotifs } from "@/components/shared/backdrop/PassportMotifs"
import { useScrollParallax, useMouseParallax, useTabVisible } from "@/hooks/use-scroll-parallax"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

const LAYER_SPEEDS = [0.05, 0.1, 0.2, 0.35, 0.55]

export type BackdropVariant = "roadmap" | "passport" | "studio" | "curriculum" | "cohorts" | "docs"
export type TraceSection = { label: string }

const GRADIENTS: Record<BackdropVariant, string> = {
  roadmap: "radial-gradient(ellipse 60% 50% at 15% 85%, rgba(245,185,66,0.10), transparent 60%), radial-gradient(ellipse 60% 50% at 85% 10%, rgba(0,212,255,0.12), transparent 60%), #0A0E17",
  passport: "radial-gradient(ellipse 60% 50% at 12% 12%, rgba(245,185,66,0.13), transparent 60%), radial-gradient(ellipse 60% 50% at 88% 88%, rgba(0,212,255,0.11), transparent 60%), #0A0E17",
  studio: "radial-gradient(ellipse 70% 50% at 80% 20%, rgba(0,212,255,0.11), transparent 65%), #0A0E17",
  curriculum: "radial-gradient(ellipse 60% 60% at 25% 30%, rgba(74,222,128,0.08), transparent 65%), radial-gradient(ellipse 60% 50% at 85% 80%, rgba(0,212,255,0.10), transparent 65%), #0A0E17",
  cohorts: "radial-gradient(ellipse 60% 50% at 20% 20%, rgba(245,185,66,0.10), transparent 65%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(0,212,255,0.11), transparent 65%), #0A0E17",
  docs: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,212,255,0.08), transparent 65%), #0A0E17",
}

export function ParallaxBackdrop({
  variant = "roadmap",
  sections,
}: {
  variant?: BackdropVariant
  sections?: TraceSection[]
}) {
  const scrollY = useScrollParallax()
  const mouse = useMouseParallax(12)
  const reduced = useReducedMotion()
  const tabVisible = useTabVisible()
  const [isDesktop, setIsDesktop] = useState(true)
  const [docHeight, setDocHeight] = useState(1)

  useEffect(() => {
    function measure() {
      setIsDesktop(window.innerWidth >= 768)
      setDocHeight(Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const paused = reduced || !tabVisible
  const scrollProgress = scrollY / docHeight

  return (
    <>
      <div
        className="fixed inset-0 z-[-1] overflow-hidden"
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      >
        {/* Layer 0 — far radial glow blobs */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{
            transform: paused ? undefined : `translate3d(${mouse.x * 0.2}px, ${mouse.y * 0.2 - scrollY * LAYER_SPEEDS[0]}px, 0)`,
            background: GRADIENTS[variant],
          }}
        />

        {/* Layer 1 — starfield */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: paused ? undefined : `translate3d(${mouse.x * 0.4}px, ${mouse.y * 0.4 - scrollY * LAYER_SPEEDS[1]}px, 0)` }}
        >
          <StarField reduced={paused} />
        </div>

        {/* Layer 2 — amplitude waves */}
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: paused ? undefined : `translate3d(${mouse.x * 0.6}px, ${mouse.y * 0.6 - scrollY * LAYER_SPEEDS[2]}px, 0)` }}
        >
          <AmplitudeWaves reduced={paused} />
        </div>

        {isDesktop && (
          <>
            {variant === "studio" && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(0,212,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,.35) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />}
            {variant === "docs" && <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.7) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />}
            {variant === "curriculum" && <svg className="absolute inset-0 h-full w-full opacity-10" aria-hidden="true"><path d="M0 30% C20% 10%, 30% 70%, 52% 38% S78% 18%, 100% 50% M10% 80% C34% 55%, 50% 92%, 70% 60% S90% 45%, 100% 75%" fill="none" stroke="#4ADE80" strokeWidth="1" /></svg>}
            {variant === "cohorts" && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, #00D4FF 0 5px, transparent 6px), radial-gradient(circle at 75% 60%, #F5B942 0 6px, transparent 7px), linear-gradient(35deg, transparent 49%, rgba(0,212,255,.6) 50%, transparent 51%)" }} />}

            {/* Layer 3 — orbit rings */}
            <div
              className="absolute inset-0 will-change-transform"
              style={{ transform: paused ? undefined : `translate3d(${mouse.x * 0.8}px, ${mouse.y * 0.8 - scrollY * LAYER_SPEEDS[3]}px, 0)` }}
            >
              <OrbitRings reduced={paused} variant={variant === "passport" ? "passport" : "roadmap"} />
            </div>

            {/* Layer 4 — floating motifs */}
            <div
              className="absolute inset-0 will-change-transform"
              style={{ transform: paused ? undefined : `translate3d(${mouse.x}px, ${mouse.y - scrollY * LAYER_SPEEDS[4]}px, 0)` }}
            >
              {variant === "passport" ? <PassportMotifs reduced={paused} /> : <FloatingMotifs reduced={paused} />}
            </div>
          </>
        )}
      </div>

      {isDesktop && !reduced && <ScrollCircuitTrace progress={scrollProgress} sections={sections} accent={variant === "passport" ? "#F5B942" : "#00D4FF"} />}
    </>
  )
}
