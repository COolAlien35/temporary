"use client"

const NODE_COUNT = 8

export type TraceSection = { label: string }

export function ScrollCircuitTrace({
  progress,
  sections,
  accent = "#00D4FF",
}: {
  progress: number
  sections?: TraceSection[]
  accent?: string
}) {
  const clamped = Math.min(1, Math.max(0, progress))
  const nodes = sections && sections.length > 0 ? sections : Array.from({ length: NODE_COUNT }).map(() => ({ label: "" }))
  const count = nodes.length
  const glow = `drop-shadow(0 0 3px ${accent}99)`
  const nodeGlow = `drop-shadow(0 0 4px ${accent}cc)`

  return (
    <div className="pointer-events-none fixed left-6 top-0 z-0 hidden h-screen w-32 lg:block" aria-hidden="true">
      <svg viewBox="0 0 24 800" preserveAspectRatio="none" className="h-full w-6 overflow-visible">
        <line x1={12} y1={0} x2={12} y2={800} stroke={accent} strokeWidth={1} opacity={0.08} />
        <line
          x1={12}
          y1={0}
          x2={12}
          y2={800 * clamped}
          stroke={accent}
          strokeWidth={1.4}
          opacity={0.45}
          style={{ filter: glow }}
        />
        {nodes.map((node, i) => {
          const y = (800 / (count - 1)) * i
          const passed = clamped * 800 >= y
          return (
            <g key={i}>
              <circle
                cx={12}
                cy={y}
                r={passed ? 3 : 2}
                fill={passed ? accent : "#ffffff"}
                opacity={passed ? 0.9 : 0.18}
                style={passed ? { filter: nodeGlow } : undefined}
              />
              {node.label && (
                <text
                  x={20}
                  y={y + 3}
                  fontSize="9"
                  fill={passed ? accent : "rgba(255,255,255,0.35)"}
                  opacity={passed ? 0.9 : 0.5}
                >
                  {node.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
