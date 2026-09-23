"use client"

export function PlaygroundWave() {
  return (
    <svg
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.08]"
      aria-hidden="true"
    >
      <path
        d="M0,40 Q25,10 50,40 T100,40 T150,40 T200,40 T250,40 T300,40 T350,40 T400,40"
        fill="none"
        stroke="#4FD1E8"
        strokeWidth={1.5}
        style={{ animation: "home-wave-scroll 8s linear infinite" }}
      />
    </svg>
  )
}
