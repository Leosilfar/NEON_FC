import { useEffect, useRef } from "react"

type BackgroundProps = {
  className?: string
}

type ShapeType = "circle" | "ring" | "triangle" | "rhombus"

export default function Background({ className }: BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const ctx = canvas.getContext("2d")

    if (!ctx) return

    let animationFrameId: number

    const resize = () => {
      canvas.width = window.innerWidth

      canvas.height = window.innerHeight
    }

    resize()

    window.addEventListener("resize", resize)

    // Paleta eFootball + Branco Neon Brilhante

    const colors = [
      { r: 255, g: 255, b: 255 }, // Branco Puro Brilhante

      { r: 230, g: 0, b: 129 }, // Pink eFootball

      { r: 0, g: 229, b: 255 }, // Ciano Turquesa

      { r: 57, g: 255, b: 20 }, // Verde Lima Fluor

      { r: 138, g: 0, b: 230 }, // Roxo vibrante
    ]

    const shapeTypes: ShapeType[] = ["circle", "ring", "triangle", "rhombus"]

    // Gerador de Formas Geométricas

    const elements = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * canvas.width,

      y: Math.random() * canvas.height,

      size: Math.random() * 40 + 15, // Tamanho das formas

      vx: (Math.random() - 0.5) * 0.7,

      vy: (Math.random() - 0.5) * 0.7,

      rotation: Math.random() * Math.PI * 2,

      vRot: (Math.random() - 0.5) * 0.02, // Velocidade de rotação

      color: colors[Math.floor(Math.random() * colors.length)],

      type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],

      pulseSpeed: Math.random() * 0.02 + 0.005,

      pulsePhase: Math.random() * Math.PI * 2,
    }))

    // Partículas e Estrelas Flutuantes

    const particles = Array.from({ length: 45 }).map(() => ({
      x: Math.random() * canvas.width,

      y: Math.random() * canvas.height,

      size: Math.random() * 3 + 1,

      speedY: -(Math.random() * 0.7 + 0.2),

      speedX: (Math.random() - 0.5) * 0.4,

      color: colors[Math.floor(Math.random() * colors.length)],

      opacity: Math.random() * 0.8 + 0.2,
    }))

    // Função auxiliar para desenhar triângulo

    const drawTriangle = (context: CanvasRenderingContext2D, size: number) => {
      context.beginPath()

      context.moveTo(0, -size)

      context.lineTo(size, size)

      context.lineTo(-size, size)

      context.closePath()
    }

    // Função auxiliar para desenhar losango

    const drawRhombus = (context: CanvasRenderingContext2D, size: number) => {
      context.beginPath()

      context.moveTo(0, -size * 1.3)

      context.lineTo(size * 0.8, 0)

      context.moveTo(0, -size * 1.3)

      context.lineTo(0, size * 1.3)

      context.lineTo(-size * 0.8, 0)

      context.lineTo(0, -size * 1.3)

      context.closePath()
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 1. Fundo Gradiente Roxo Elétrico Profundo

      const bgGradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height,
      )

      bgGradient.addColorStop(0, "#190038")

      bgGradient.addColorStop(0.5, "#0d0022")

      bgGradient.addColorStop(1, "#050010")

      ctx.fillStyle = bgGradient

      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 2. Renderizar Formas Geométricas (Triângulos, Losangos, Círculos, Anéis)

      elements.forEach((el) => {
        el.x += el.vx

        el.y += el.vy

        el.rotation += el.vRot

        el.pulsePhase += el.pulseSpeed

        // Rebater nas bordas

        if (el.x < -80 || el.x > canvas.width + 80) el.vx *= -1

        if (el.y < -80 || el.y > canvas.height + 80) el.vy *= -1

        const currentSize = el.size + Math.sin(el.pulsePhase) * 6

        const { r, g, b } = el.color

        const isWhite = r === 255 && g === 255 && b === 255

        ctx.save()

        ctx.translate(el.x, el.y)

        ctx.rotate(el.rotation)

        // Intensifica o Glow de brilho para os elementos brancos

        ctx.shadowBlur = isWhite ? 30 : 20

        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${isWhite ? 0.95 : 0.8})`

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${isWhite ? 0.85 : 0.3})`

        ctx.lineWidth = isWhite ? 2.5 : 2

        if (el.type === "circle") {
          const gFill = ctx.createRadialGradient(0, 0, 0, 0, 0, currentSize)

          gFill.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`)

          gFill.addColorStop(1, "rgba(0, 0, 0, 0)")

          ctx.fillStyle = gFill

          ctx.beginPath()

          ctx.arc(0, 0, currentSize, 0, Math.PI * 2)

          ctx.fill()
        } else if (el.type === "ring") {
          ctx.beginPath()

          ctx.arc(0, 0, currentSize, 0, Math.PI * 2)

          ctx.stroke()
        } else if (el.type === "triangle") {
          drawTriangle(ctx, currentSize)

          ctx.stroke()

          if (isWhite) ctx.fill()
        } else if (el.type === "rhombus") {
          drawRhombus(ctx, currentSize)

          ctx.stroke()

          if (isWhite) ctx.fill()
        }

        ctx.restore()
      })

      // 3. Partículas Flutuantes Brilhantes

      particles.forEach((p) => {
        p.y += p.speedY

        p.x += p.speedX

        if (p.y < -20) {
          p.y = canvas.height + 20

          p.x = Math.random() * canvas.width
        }

        const { r, g, b } = p.color

        ctx.save()

        ctx.shadowBlur = 12

        ctx.shadowColor = `rgb(${r}, ${g}, ${b})`

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity})`

        ctx.beginPath()

        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)

        ctx.fill()

        ctx.restore()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener("resize", resize)

      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div
      className={className}
      style={{
        position: "absolute",

        inset: 0,

        pointerEvents: "none",

        zIndex: 0,

        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />

      {/* Máscara de Leitura de Texto (Manter o contraste limpo no centro) */}
      <div
        style={{
          position: "absolute",

          inset: 0,

          background:
            "radial-gradient(circle at center, rgba(13, 0, 34, 0.35) 0%, rgba(5, 0, 16, 0.7) 100%)",

          backdropFilter: "blur(3px)",

          pointerEvents: "none",
        }}
      />
    </div>
  )
}
