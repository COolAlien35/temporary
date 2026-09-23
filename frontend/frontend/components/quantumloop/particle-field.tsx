"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  depth: number
  hue: "cyan" | "gold"
}

const COLORS = {
  cyan: "77, 209, 232",
  gold: "255, 184, 0",
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let width = window.innerWidth
    let height = window.innerHeight
    let particles: Particle[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx?.scale(dpr, dpr)
    }

    function createParticles() {
      const count = Math.min(90, Math.floor((width * height) / 16000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.6 + 0.6,
        depth: Math.random() * 0.6 + 0.2,
        hue: Math.random() > 0.85 ? "gold" : "cyan",
      }))
    }

    resize()
    createParticles()

    function handleMouseMove(e: MouseEvent) {
      mouseRef.current.x = (e.clientX / width - 0.5) * 2
      mouseRef.current.y = (e.clientY / height - 0.5) * 2
    }

    function handleResize() {
      resize()
      createParticles()
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    window.addEventListener("resize", handleResize)

    let raf = 0
    function draw() {
      ctx!.clearRect(0, 0, width, height)
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      for (const p of particles) {
        if (!reducedMotionRef.current) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < -10) p.x = width + 10
          if (p.x > width + 10) p.x = -10
          if (p.y < -10) p.y = height + 10
          if (p.y > height + 10) p.y = -10
        }

        const parallaxX = mx * p.depth * 18
        const parallaxY = my * p.depth * 18
        const drawX = p.x + parallaxX
        const drawY = p.y + parallaxY

        const grad = ctx!.createRadialGradient(drawX, drawY, 0, drawX, drawY, p.radius * 4)
        const color = COLORS[p.hue]
        grad.addColorStop(0, `rgba(${color}, ${0.85 * p.depth + 0.15})`)
        grad.addColorStop(1, `rgba(${color}, 0)`)
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.arc(drawX, drawY, p.radius * 4, 0, Math.PI * 2)
        ctx!.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
