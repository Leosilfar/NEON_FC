import { useCallback, useEffect, useRef, useState } from "react"

import type { GameSettings, GS, HudSnap, PieceType, SlotPiece } from "@/types"

import {
  BR,
  FIXED_DT,
  GOAL_Y0,
  GOAL_Y1,
  MATCH_SECS,
  MAX_FRAME_DT,
  MAX_STEPS_PER_FRAME,
  MOVE_SPD,
  PR,
  TEAM_A_START,
  TEAM_B_PRESET,
  VH,
  VW,
  clamp,
  vdist,
} from "@/constants"

import { cBall, cParticle, cPiece, cShockwave } from "@/utils/canvasDrawing"

import { ballNearPieceAabb, shapeBallHit } from "@/utils/collision"

import { getPlayRect } from "@/utils/canvasHelpers"

import { makeGS } from "@/utils/matchInit"

export function useMatch(
  playerSlots: SlotPiece[],

  settings: GameSettings,

  fieldRef: React.RefObject<HTMLDivElement | null>,

  canvasRef: React.RefObject<HTMLCanvasElement | null>,

  fw: number,

  fh: number,
) {
  const gsRef = useRef<GS>(makeGS(playerSlots))

  const settRef = useRef<GameSettings>(settings)

  useEffect(() => {
    settRef.current = settings
  }, [settings])

  const keysRef = useRef<Set<string>>(new Set())

  const rafRef = useRef<number>(0)

  const lastTsRef = useRef<number>(0)

  const accRef = useRef(0)

  const nextHudSyncRef = useRef(0)

  useEffect(() => {
    const c = canvasRef.current

    if (!c) return

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))

    c.width = Math.max(1, Math.round(fw * dpr))

    c.height = Math.max(1, Math.round(fh * dpr))
  }, [fw, fh, canvasRef])

  const [hud, setHud] = useState<HudSnap>(() => {
    const gs = gsRef.current

    return {
      scoreA: 0,

      scoreB: 0,

      timeLeft: MATCH_SECS,

      notification: null,

      paused: false,

      selectedId: gs.pieces.filter((p) => p.team === "A")[0]?.id ?? null,

      flashColor: null,

      goalColor: null,
    }
  })

  const hudRef = useRef(hud)

  useEffect(() => {
    hudRef.current = hud
  }, [hud])

  const makeHudSnap = useCallback((): HudSnap => {
    const gs = gsRef.current

    const teamA = gs.pieces.filter((p) => p.team === "A")

    return {
      scoreA: gs.scoreA,

      scoreB: gs.scoreB,

      timeLeft: gs.timeLeft,

      notification: gs.notification,

      paused: gs.paused,

      selectedId: teamA[gs.selectedIdx]?.id ?? null,

      flashColor:
        gs.goalColor && performance.now() < gs.flashUntil ? gs.goalColor : null,

      goalColor: gs.goalColor,
    }
  }, [])

  const publishHud = useCallback(
    (force = false) => {
      const next = makeHudSnap()

      const prev = hudRef.current

      const changed =
        force ||
        prev.scoreA !== next.scoreA ||
        prev.scoreB !== next.scoreB ||
        prev.paused !== next.paused ||
        prev.notification !== next.notification ||
        prev.goalColor !== next.goalColor ||
        prev.flashColor !== next.flashColor ||
        prev.selectedId !== next.selectedId ||
        Math.floor(prev.timeLeft) !== Math.floor(next.timeLeft)

      if (changed) {
        hudRef.current = next

        setHud(next)
      }
    },

    [makeHudSnap],
  )

  const finishGoalReset = useCallback(() => {
    const gs = gsRef.current

    gs.ball = { x: VW / 2, y: VH / 2, vx: 0, vy: 0 }

    try {
      const fresh = makeGS(playerSlots)

      const freshA = fresh.pieces.filter((p) => p.team === "A")

      const freshB = fresh.pieces.filter((p) => p.team === "B")

      gs.pieces
        .filter((p) => p.team === "A")
        .forEach((p, i) => {
          if (freshA[i]) {
            p.x = freshA[i].x

            p.y = freshA[i].y
          }
        })

      gs.pieces
        .filter((p) => p.team === "B")
        .forEach((p, i) => {
          if (freshB[i]) {
            p.x = freshB[i].x

            p.y = freshB[i].y
          }
        })
    } catch {
      gs.pieces
        .filter((p) => p.team === "A")
        .forEach((p, i) => {
          p.x = TEAM_A_START[i].x

          p.y = TEAM_A_START[i].y
        })

      TEAM_B_PRESET.forEach((preset) => {
        const p = gs.pieces.find((x) => x.id === preset.id)

        if (p) {
          p.x = preset.x

          p.y = preset.y
        }
      })
    }

    gs.notification = null

    gs.goalCooldown = 0

    gs.pieceVx = 0

    gs.pieceVy = 0

    gs.goalColor = null

    gs.pendingResetScorerA = null
  }, [playerSlots])

  const beginGoal = useCallback(
    (scorerA: boolean, goalX: number, goalY: number, ts: number) => {
      const gs = gsRef.current

      const s = settRef.current

      const color = scorerA ? s.teamA.color : s.teamB.color

      const towardCenter = scorerA ? -1 : 1

      gs.ball = { x: clamp(goalX, 0, VW), y: clamp(goalY, 0, VH), vx: 0, vy: 0 }

      gs.notification = "GOL!"

      gs.notifEnd = ts + 2000

      gs.goalCooldown = 2000

      gs.goalColor = color

      gs.pendingResetScorerA = scorerA

      gs.shakeUntil = ts + 300

      gs.flashUntil = ts + 1000

      gs.shockwaves.push({
        x: gs.ball.x,
        y: gs.ball.y,
        life: 760,
        ttl: 760,
        color,
      })

      const shapes: PieceType[] = [
        "triangle",
        "square",
        "diamond",
        "pentagon",
        "line",
      ]

      const count = 24 + Math.floor(Math.random() * 7)

      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * Math.PI * 0.95

        const angle = (towardCenter > 0 ? 0 : Math.PI) + spread

        const speed = 270 + Math.random() * 620

        const ttl = 900 + Math.random() * 520

        gs.particles.push({
          x: gs.ball.x,

          y: gs.ball.y,

          vx: Math.cos(angle) * speed,

          vy: Math.sin(angle) * speed,

          life: ttl,

          ttl,

          size: 4 + Math.random() * 5,

          rot: Math.random() * Math.PI * 2,

          vr: (Math.random() - 0.5) * 10,

          type: shapes[Math.floor(Math.random() * shapes.length)],

          color,
        })
      }
    },
    [],
  )

  const updateFx = useCallback((dt: number) => {
    const gs = gsRef.current

    const drag = Math.exp(-3.2 * dt)

    gs.particles = gs.particles.filter((p) => {
      p.life -= dt * 1000

      p.vx *= drag

      p.vy *= drag

      p.x += p.vx * dt

      p.y += p.vy * dt

      p.rot += p.vr * dt

      return p.life > 0
    })

    gs.shockwaves = gs.shockwaves.filter((w) => {
      w.life -= dt * 1000

      return w.life > 0
    })
  }, [])

  const stepPhysics = useCallback(
    (dt: number, ts: number) => {
      const gs = gsRef.current

      const s = settRef.current

      if (gs.paused) return

      updateFx(dt)

      if (gs.goalCooldown > 0) {
        gs.goalCooldown -= dt * 1000

        if (gs.goalCooldown <= 0 || ts > gs.notifEnd) finishGoalReset()

        return
      }

      gs.notification = null

      gs.timeLeft = Math.max(0, gs.timeLeft - dt)

      const teamA = gs.pieces.filter((p) => p.team === "A")

      const sel = teamA[gs.selectedIdx]

      if (sel) {
        const keys = keysRef.current

        let dx = 0,
          dy = 0

        if (keys.has("w") || keys.has("ArrowUp")) dy -= 1

        if (keys.has("s") || keys.has("ArrowDown")) dy += 1

        if (keys.has("a") || keys.has("ArrowLeft")) dx -= 1

        if (keys.has("d") || keys.has("ArrowRight")) dx += 1

        const len = Math.sqrt(dx * dx + dy * dy)

        if (len > 0) {
          const spd = MOVE_SPD * (0.7 + s.attrs[sel.type].speed / 300) * dt

          let nx = clamp(sel.x + (dx / len) * spd, PR, VW - PR)

          let ny = clamp(sel.y + (dy / len) * spd, PR, VH - PR)

          for (let iter = 0; iter < 3; iter++) {
            for (const other of gs.pieces) {
              if (other.id === sel.id) continue

              const minD = PR * 2 + 1

              if (
                Math.abs(nx - other.x) > minD ||
                Math.abs(ny - other.y) > minD
              )
                continue

              const d = vdist(nx, ny, other.x, other.y)

              if (d < minD && d > 0.01) {
                const ex = (nx - other.x) / d,
                  ey = (ny - other.y) / d

                nx = clamp(other.x + ex * minD, PR, VW - PR)

                ny = clamp(other.y + ey * minD, PR, VH - PR)
              }
            }
          }

          gs.pieceVx = (nx - sel.x) / dt

          gs.pieceVy = (ny - sel.y) / dt

          sel.x = nx

          sel.y = ny
        } else {
          gs.pieceVx = 0

          gs.pieceVy = 0
        }
      }

      const fric = Math.exp(-2.2 * dt)

      gs.ball.vx *= fric

      gs.ball.vy *= fric

      const s0 = Math.sqrt(gs.ball.vx ** 2 + gs.ball.vy ** 2)

      if (s0 < 6) {
        gs.ball.vx = 0

        gs.ball.vy = 0
      }

      gs.ball.x += gs.ball.vx * dt

      gs.ball.y += gs.ball.vy * dt

      if (gs.ball.y < BR) {
        gs.ball.y = BR

        gs.ball.vy = Math.abs(gs.ball.vy) * 0.82
      }

      if (gs.ball.y > VH - BR) {
        gs.ball.y = VH - BR

        gs.ball.vy = -Math.abs(gs.ball.vy) * 0.82
      }

      if (gs.ball.x < BR) {
        if (gs.ball.y >= GOAL_Y0 && gs.ball.y <= GOAL_Y1) {
          gs.scoreB++

          beginGoal(false, 0, gs.ball.y, ts)
        } else {
          gs.ball.x = BR

          gs.ball.vx = Math.abs(gs.ball.vx) * 0.82
        }
      }

      if (gs.ball.x > VW - BR) {
        if (gs.ball.y >= GOAL_Y0 && gs.ball.y <= GOAL_Y1) {
          gs.scoreA++

          beginGoal(true, VW, gs.ball.y, ts)
        } else {
          gs.ball.x = VW - BR

          gs.ball.vx = -Math.abs(gs.ball.vx) * 0.82
        }
      }

      const selId = teamA[gs.selectedIdx]?.id ?? null

      for (const p of gs.pieces) {
        if (!ballNearPieceAabb(p, gs.ball.x, gs.ball.y)) continue

        const hit = shapeBallHit(p, gs.ball.x, gs.ball.y)

        if (!hit) continue

        const { nx: cnx, ny: cny, pen } = hit

        gs.ball.x += cnx * (pen + 0.8)

        gs.ball.y += cny * (pen + 0.8)

        const isSel = p.id === selId

        const pvx = isSel ? gs.pieceVx : 0

        const pvy = isSel ? gs.pieceVy : 0

        const relVn = (gs.ball.vx - pvx) * cnx + (gs.ball.vy - pvy) * cny

        if (relVn < 0) {
          const rest = 0.72 + s.attrs[p.type].rebound * 0.0028

          const impulse = -(1 + rest) * relVn

          gs.ball.vx += impulse * cnx

          gs.ball.vy += impulse * cny

          gs.ball.vx += pvx * 0.42

          gs.ball.vy += pvy * 0.42
        }

        const minKick = s.attrs[p.type].power * 3.2 + (isSel ? 120 : 18)

        const sc = Math.sqrt(gs.ball.vx ** 2 + gs.ball.vy ** 2)

        if (sc > 0.1 && sc < minKick) {
          gs.ball.vx = (gs.ball.vx / sc) * minKick

          gs.ball.vy = (gs.ball.vy / sc) * minKick
        }

        const sf = Math.sqrt(gs.ball.vx ** 2 + gs.ball.vy ** 2)

        if (sf > 1400) {
          gs.ball.vx = (gs.ball.vx / sf) * 1400

          gs.ball.vy = (gs.ball.vy / sf) * 1400
        }
      }
    },

    [beginGoal, finishGoalReset, updateFx],
  )

  const tick = useCallback(
    (ts: number) => {
      const last = lastTsRef.current || ts

      const frameDt = Math.min((ts - last) / 1000, MAX_FRAME_DT)

      lastTsRef.current = ts

      accRef.current += frameDt

      let steps = 0

      while (accRef.current >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
        stepPhysics(FIXED_DT, ts)

        accRef.current -= FIXED_DT

        steps++
      }

      if (steps === MAX_STEPS_PER_FRAME) accRef.current = 0

      const gs = gsRef.current

      const s = settRef.current

      const canvas = canvasRef.current

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext("2d")

        if (ctx) {
          const rect = canvas.getBoundingClientRect()

          const cw = rect.width || canvas.width

          const ch = rect.height || canvas.height

          const dprX = canvas.width / cw

          const dprY = canvas.height / ch

          ctx.setTransform(dprX, 0, 0, dprY, 0, 0)

          ctx.clearRect(0, 0, cw, ch)

          const play = getPlayRect(cw, ch, false)

          const shakeT = clamp((gs.shakeUntil - ts) / 300, 0, 1)

          const shakeX = shakeT > 0 ? (Math.random() - 0.5) * 8 * shakeT : 0

          const shakeY = shakeT > 0 ? (Math.random() - 0.5) * 8 * shakeT : 0

          ctx.save()

          ctx.translate(shakeX, shakeY)

          const toX = (vx: number) => play.x + (vx / VW) * play.w

          const toY = (vy: number) => play.y + (vy / VH) * play.h

          const pr = PR * play.scale

          const br = BR * play.scale

          const teamA = gs.pieces.filter((p) => p.team === "A")

          const selId = teamA[gs.selectedIdx]?.id ?? null

          for (const p of gs.pieces) {
            cPiece(
              ctx,

              p,

              toX(p.x),

              toY(p.y),

              pr,

              s.pieceColors[p.type],

              p.id === selId,

              ts,

              s.glowIntensity,

              s.teamA.color,

              s.teamB.color,
            )
          }

          cBall(ctx, toX(gs.ball.x), toY(gs.ball.y), br, ts)

          for (const w of gs.shockwaves)
            cShockwave(ctx, w, toX, toY, play.scale)

          for (const p of gs.particles) cParticle(ctx, p, toX, toY, play.scale)

          ctx.restore()
        }
      }

      if (ts >= nextHudSyncRef.current) {
        publishHud()

        nextHudSyncRef.current = ts + 125
      }

      rafRef.current = requestAnimationFrame(tick)
    },

    [canvasRef, publishHud, stepPhysics],
  )

  useEffect(() => {
    lastTsRef.current = performance.now()

    accRef.current = 0

    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          " ",
          "Tab",
        ].includes(e.key)
      )
        e.preventDefault()

      keysRef.current.add(e.key)

      if (e.key === "Tab") {
        const gs = gsRef.current

        const ta = gs.pieces.filter((p) => p.team === "A")

        gs.selectedIdx = (gs.selectedIdx + 1) % ta.length

        publishHud(true)
      }

      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        gsRef.current.paused = !gsRef.current.paused

        publishHud(true)
      }
    }

    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key)

    window.addEventListener("keydown", onDown)

    window.addEventListener("keyup", onUp)

    return () => {
      window.removeEventListener("keydown", onDown)

      window.removeEventListener("keyup", onUp)
    }
  }, [publishHud])

  function pauseToggle() {
    gsRef.current.paused = !gsRef.current.paused

    publishHud(true)
  }

  function restartGame() {
    gsRef.current = makeGS(playerSlots)

    keysRef.current.clear()

    publishHud(true)
  }

  function selectPieceAt(clientX: number, clientY: number) {
    const gs = gsRef.current

    const rect = fieldRef.current!.getBoundingClientRect()

    const pr = getPlayRect(rect.width, rect.height, false)

    const lx = clientX - rect.left - pr.x

    const ly = clientY - rect.top - pr.y

    if (lx < 0 || ly < 0 || lx > pr.w || ly > pr.h) return

    const mx = (lx / pr.w) * VW

    const my = (ly / pr.h) * VH

    const teamA = gs.pieces.filter((p) => p.team === "A")

    let best: number | null = null,
      bestD = PR * 1.6

    teamA.forEach((p, i) => {
      const d = vdist(p.x, p.y, mx, my)

      if (d < bestD) {
        bestD = d

        best = i
      }
    })

    if (best !== null) {
      gs.selectedIdx = best

      publishHud(true)
    }
  }

  return { hud, gsRef, pauseToggle, restartGame, selectPieceAt }
}
