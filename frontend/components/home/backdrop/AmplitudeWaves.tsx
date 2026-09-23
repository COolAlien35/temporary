"use client"

function wavePath(amplitude: number, frequency: number, phase: number, yOffset: number) {
  const points: string[] = []
  for (let x = 0; x <= 1000; x += 20) {
    const y = yOffset + Math.sin((x / 1000) * Math.PI * 2 * frequency + phase) * amplitude
    points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`)
  }
  return points.join(" ")
}

const WAVES = [
  { amplitude: 22, frequency: 1.4, phase: 0, yOffset: 90, color: "#00D4FF", opacity: 0.1, duration: 22 },
  { amplitude: 16, frequency: 2.1, phase: 1.1, yOffset: 230, color: "#00D4FF", opacity: 0.08, duration: 28 },
  { amplitude: 28, frequency: 0.9, phase: 2.3, yOffset: 400, color: "#F5B942", opacity: 0.07, duration: 34 },
  { amplitude: 18, frequency: 1.7, phase: 3.4, yOffset: 560, color: "#00D4FF", opacity: 0.09, duration: 26 },
  { amplitude: 24, frequency: 1.1, phase: 0.6, yOffset: 700, color: "#4ADE80", opacity: 0.06, duration: 30 },
]

export function AmplitudeWaves({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 1000 800" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {WAVES.map((w, i) => (
        <path
          key={i}
          d={wavePath(w.amplitude, w.frequency, w.phase, w.yOffset)}
          fill="none"
          stroke={w.color}
          strokeWidth={1.2}
          opacity={w.opacity}
          style={reduced ? undefined : { animation: `home-wave-drift ${w.duration}s linear infinite` }}
        />
      ))}
    </svg>
  )
}
