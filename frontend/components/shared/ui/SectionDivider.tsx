"use client"

import { useReducedMotion } from "@/hooks/use-reduced-motion"

export function SectionDivider({ color = "#00D4FF", className = "" }: { color?: string; className?: string }) {
  const reduced = useReducedMotion()

  return (
    <div className={`my-8 flex items-center gap-4 ${className}`}>
      <svg
        className="h-[1.5px] flex-1"
        viewBox="0 0 100 1"
        preserveAspectRatio="none"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="divider-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="30%" stopColor={color} stopOpacity="1" />
            <stop offset="70%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,0.5 Q25,0 50,0.5 T100,0.5" stroke="url(#divider-gradient)" strokeWidth="1" fill="none" />
      </svg>
      {!reduced && (
        <div
          className="h-1 w-1 rounded-full"
          style={{
            background: color,
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      )}
    </div>
  )
}
