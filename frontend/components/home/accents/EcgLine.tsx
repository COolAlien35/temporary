"use client"

export function EcgLine() {
  return (
    <svg
      viewBox="0 0 200 24"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-6 w-full opacity-[0.16]"
      aria-hidden="true"
    >
      <path
        d="M0,12 L20,12 L26,4 L32,20 L38,12 L60,12 L66,6 L72,18 L78,12 L200,12"
        fill="none"
        stroke="#4ADE80"
        strokeWidth={1.2}
        style={{ animation: "home-wave-scroll 4s linear infinite" }}
      />
    </svg>
  )
}
