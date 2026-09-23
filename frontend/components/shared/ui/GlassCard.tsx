"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function GlassCard({
  children,
  className,
  interactive = true,
}: {
  children: React.ReactNode
  className?: string
  interactive?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!interactive || !ref.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = ref.current?.getBoundingClientRect()
      if (!rect) return
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setPosition({ x, y })
    }

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 })
    }

    const el = ref.current
    el.addEventListener("mousemove", handleMouseMove)
    el.addEventListener("mouseleave", handleMouseLeave)
    return () => {
      el.removeEventListener("mousemove", handleMouseMove)
      el.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [interactive])

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-5 backdrop-blur-sm",
        interactive && "transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-[#00D4FF]/10",
        className,
      )}
      style={{
        "--mx": `${position.x}px`,
        "--my": `${position.y}px`,
      } as React.CSSProperties}
    >
      {interactive && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px at var(--mx) var(--my), rgba(0,212,255,0.1), transparent 80%)`,
          }}
        />
      )}
      <div className="relative z-0">{children}</div>
    </div>
  )
}
