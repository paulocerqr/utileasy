"use client"

import { useEffect, useRef } from "react"

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

export function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let stars: Star[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = document.body.scrollHeight
      initStars()
    }

    const initStars = () => {
      const count = Math.floor((canvas.width * canvas.height) / 12000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        radius: Math.random() * 1.5 + 0.3,
        opacity: Math.random() * 0.6 + 0.2,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update positions
      for (const star of stars) {
        star.x += star.vx
        star.y += star.vy

        if (star.x < 0 || star.x > canvas.width) star.vx *= -1
        if (star.y < 0 || star.y > canvas.height) star.vy *= -1
      }

      // Draw connections
      const maxDist = 140
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x
          const dy = stars[i].y - stars[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.18
            ctx.beginPath()
            ctx.moveTo(stars[i].x, stars[i].y)
            ctx.lineTo(stars[j].x, stars[j].y)
            ctx.strokeStyle = `rgba(121, 184, 255, ${alpha})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      // Draw stars
      for (const star of stars) {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(157, 177, 197, ${star.opacity})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    resize()
    draw()

    const handleResize = () => resize()
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
