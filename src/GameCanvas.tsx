import { useCallback, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, HandTap, PersonSimpleRun } from '@phosphor-icons/react'
import type { GameState, InputState, PlayerState } from './types'

const VIEW_W = 1280
const VIEW_H = 720
const PLAYER_W = 34
const PLAYER_H = 50
const COLORS = ['#f6c945', '#54c9bd']

const PLATFORMS = [
  { x: 0, y: 620, w: 760, h: 100 },
  { x: 820, y: 568, w: 150, h: 24 },
  { x: 1010, y: 510, w: 120, h: 24 },
  { x: 1120, y: 620, w: 1090, h: 100 },
  { x: 2720, y: 620, w: 820, h: 100 },
  { x: 3590, y: 552, w: 170, h: 24 },
  { x: 3820, y: 478, w: 150, h: 24 },
  { x: 4035, y: 548, w: 165, h: 24 },
  { x: 4240, y: 620, w: 960, h: 100 },
]
const SPIKES = [
  { x: 600, y: 598, w: 70, h: 22 },
  { x: 1280, y: 598, w: 76, h: 22 },
  { x: 2870, y: 598, w: 82, h: 22 },
  { x: 4500, y: 598, w: 90, h: 22 },
]
const CHECKPOINTS = [1180, 2780, 4280]
const PLATES = [1510, 1775]
const NODES = [3080, 3280]

function worldX(x: number, camera: number) {
  return Math.round(x - camera)
}

function drawBackground(ctx: CanvasRenderingContext2D, camera: number) {
  ctx.fillStyle = '#0b111b'
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)

  const slow = camera * 0.08
  ctx.fillStyle = '#111d29'
  ctx.beginPath()
  ctx.moveTo(0, 450)
  for (let x = -200; x < VIEW_W + 320; x += 280) {
    const shifted = x - (slow % 280)
    ctx.lineTo(shifted, 315 + ((x / 280) % 2) * 55)
    ctx.lineTo(shifted + 170, 450)
  }
  ctx.lineTo(VIEW_W, 720)
  ctx.lineTo(0, 720)
  ctx.fill()

  const near = camera * 0.16
  ctx.fillStyle = '#152534'
  ctx.beginPath()
  ctx.moveTo(0, 520)
  for (let x = -160; x < VIEW_W + 260; x += 230) {
    const shifted = x - (near % 230)
    ctx.quadraticCurveTo(shifted + 90, 405, shifted + 210, 520)
  }
  ctx.lineTo(VIEW_W, 720)
  ctx.lineTo(0, 720)
  ctx.fill()

  ctx.fillStyle = 'rgba(84, 201, 189, 0.08)'
  ctx.fillRect(0, 530, VIEW_W, 2)
}

function drawPlatforms(ctx: CanvasRenderingContext2D, camera: number) {
  for (const platform of PLATFORMS) {
    const x = worldX(platform.x, camera)
    if (x > VIEW_W || x + platform.w < 0) continue
    ctx.fillStyle = '#26384a'
    ctx.fillRect(x, platform.y, platform.w, platform.h)
    ctx.fillStyle = '#3c5568'
    ctx.fillRect(x, platform.y, platform.w, 7)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let mark = 24; mark < platform.w; mark += 54) {
      ctx.fillRect(x + mark, platform.y + 18, 2, Math.min(36, platform.h - 22))
    }
  }
}

function drawSpikes(ctx: CanvasRenderingContext2D, camera: number) {
  ctx.fillStyle = '#e95e52'
  for (const spike of SPIKES) {
    const x = worldX(spike.x, camera)
    const count = Math.max(2, Math.floor(spike.w / 18))
    const size = spike.w / count
    for (let index = 0; index < count; index += 1) {
      ctx.beginPath()
      ctx.moveTo(x + index * size, spike.y + spike.h)
      ctx.lineTo(x + index * size + size / 2, spike.y)
      ctx.lineTo(x + (index + 1) * size, spike.y + spike.h)
      ctx.fill()
    }
  }
}

function drawGate(
  ctx: CanvasRenderingContext2D,
  camera: number,
  xPosition: number,
  isOpen: boolean,
) {
  const x = worldX(xPosition, camera)
  ctx.fillStyle = '#40566a'
  ctx.fillRect(x - 10, 415, 58, 18)
  if (isOpen) {
    ctx.fillStyle = 'rgba(84, 201, 189, 0.5)'
    ctx.fillRect(x + 6, 438, 4, 150)
    ctx.fillRect(x + 30, 438, 4, 150)
    return
  }
  ctx.fillStyle = '#ba4e49'
  for (let y = 432; y < 620; y += 34) ctx.fillRect(x, y, 38, 18)
}

function drawCoopObjects(ctx: CanvasRenderingContext2D, game: GameState, camera: number) {
  PLATES.forEach((plate, index) => {
    const x = worldX(plate, camera)
    const active = game.team.plateCharge > 0 && !game.team.doorOneOpen
    ctx.fillStyle = game.team.doorOneOpen || active ? COLORS[index] : '#6a7884'
    ctx.fillRect(x, 607, 76, game.team.doorOneOpen ? 5 : 12)
  })

  drawGate(ctx, camera, 2030, game.team.doorOneOpen)
  drawGate(ctx, camera, 3420, game.team.doorTwoOpen)

  const bridgeX = worldX(2210, camera)
  ctx.fillStyle = game.team.bridgeActive ? 'rgba(84, 201, 189, 0.84)' : 'rgba(84, 201, 189, 0.1)'
  if (game.team.bridgeActive) {
    ctx.fillRect(bridgeX, 570, 510, 7)
    for (let x = 0; x < 510; x += 40) ctx.fillRect(bridgeX + x, 579, 26, 3)
  } else {
    for (let x = 0; x < 510; x += 44) ctx.fillRect(bridgeX + x, 570, 22, 3)
  }

  NODES.forEach((node, index) => {
    const x = worldX(node, camera)
    const charged = game.team.doorTwoOpen || game.team.syncCharge > 0
    ctx.strokeStyle = charged ? COLORS[index] : '#6a7884'
    ctx.lineWidth = 6
    ctx.strokeRect(x, 548, 72, 72)
    ctx.fillStyle = charged ? 'rgba(84, 201, 189, 0.22)' : 'rgba(106, 120, 132, 0.12)'
    ctx.fillRect(x + 9, 557, 54, 54)
    ctx.fillStyle = charged ? COLORS[index] : '#83909a'
    ctx.font = '700 22px Trebuchet MS'
    ctx.textAlign = 'center'
    ctx.fillText('E', x + 36, 591)
  })

  CHECKPOINTS.forEach((checkpoint, index) => {
    const x = worldX(checkpoint, camera)
    const active = game.team.checkpoint > index
    ctx.fillStyle = active ? '#54c9bd' : '#526272'
    ctx.fillRect(x, 520, 5, 100)
    ctx.beginPath()
    ctx.moveTo(x + 5, 522)
    ctx.lineTo(x + 54, 538)
    ctx.lineTo(x + 5, 554)
    ctx.fill()
  })

  const finishX = worldX(4930, camera)
  ctx.strokeStyle = '#f6c945'
  ctx.lineWidth = 8
  ctx.strokeRect(finishX, 486, 190, 134)
  ctx.fillStyle = 'rgba(246, 201, 69, 0.09)'
  ctx.fillRect(finishX + 8, 494, 174, 126)
  ctx.fillStyle = '#f6c945'
  ctx.textAlign = 'center'
  ctx.font = '800 18px Trebuchet MS'
  ctx.fillText('CẢ HAI VÀO ĐÂY', finishX + 95, 530)
}

function drawTether(ctx: CanvasRenderingContext2D, players: PlayerState[], camera: number) {
  if (players.length < 2) return
  const [first, second] = players
  const distance = Math.hypot(first.x - second.x, first.y - second.y)
  ctx.save()
  ctx.strokeStyle = distance < 330 ? 'rgba(84, 201, 189, 0.72)' : distance < 560 ? 'rgba(246, 201, 69, 0.5)' : 'rgba(233, 94, 82, 0.8)'
  ctx.lineWidth = distance > 560 ? 4 : 2
  ctx.setLineDash(distance > 560 ? [8, 6] : [])
  ctx.beginPath()
  ctx.moveTo(worldX(first.x + PLAYER_W / 2, camera), first.y + PLAYER_H / 2)
  ctx.lineTo(worldX(second.x + PLAYER_W / 2, camera), second.y + PLAYER_H / 2)
  ctx.stroke()
  ctx.restore()
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, camera: number) {
  const x = worldX(player.x, camera)
  const color = COLORS[player.slot] ?? COLORS[0]
  ctx.save()
  ctx.globalAlpha = player.downed ? 0.38 : 1
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, player.y, PLAYER_W, PLAYER_H, 9)
  ctx.fill()
  ctx.fillStyle = '#0b111b'
  const eyeX = player.facing > 0 ? x + 23 : x + 8
  ctx.fillRect(eyeX, player.y + 13, 5, 7)
  ctx.fillStyle = 'rgba(11,17,27,0.28)'
  ctx.fillRect(x + 6, player.y + 38, 8, 12)
  ctx.fillRect(x + 20, player.y + 38, 8, 12)
  ctx.restore()

  ctx.fillStyle = '#edf5f7'
  ctx.font = '700 14px Trebuchet MS'
  ctx.textAlign = 'center'
  ctx.fillText(player.downed ? 'GIỮ E ĐỂ CỨU' : player.name, x + PLAYER_W / 2, player.y - 12)
}

function renderGame(ctx: CanvasRenderingContext2D, game: GameState, camera: number) {
  drawBackground(ctx, camera)
  drawPlatforms(ctx, camera)
  drawCoopObjects(ctx, game, camera)
  drawSpikes(ctx, camera)
  drawTether(ctx, game.players, camera)
  game.players.forEach((player) => drawPlayer(ctx, player, camera))
}

type Props = {
  game: GameState
  localPlayerId: string
  sendInput: (input: InputState) => void
}

export function GameCanvas({ game, localPlayerId, sendInput }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef(game)
  const cameraRef = useRef(0)
  const inputRef = useRef<InputState>({ left: false, right: false, jump: false, action: false })

  useEffect(() => { gameRef.current = game }, [game])

  const updateControl = useCallback((control: keyof InputState, pressed: boolean) => {
    if (inputRef.current[control] === pressed) return
    inputRef.current = { ...inputRef.current, [control]: pressed }
    sendInput(inputRef.current)
  }, [sendInput])

  useEffect(() => {
    const keyToControl = (key: string): keyof InputState | null => {
      const normalized = key.toLowerCase()
      if (normalized === 'a' || normalized === 'arrowleft') return 'left'
      if (normalized === 'd' || normalized === 'arrowright') return 'right'
      if (normalized === 'w' || normalized === 'arrowup' || normalized === ' ') return 'jump'
      if (normalized === 'e' || normalized === 'shift') return 'action'
      return null
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const control = keyToControl(event.key)
      if (!control) return
      event.preventDefault()
      updateControl(control, true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      const control = keyToControl(event.key)
      if (!control) return
      event.preventDefault()
      updateControl(control, false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      sendInput({ left: false, right: false, jump: false, action: false })
    }
  }, [sendInput, updateControl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    let frame = 0
    const render = () => {
      const state = gameRef.current
      const local = state.players.find((player) => player.id === localPlayerId)
      const partner = state.players.find((player) => player.id !== localPlayerId)
      const focusX = local && partner ? local.x * 0.68 + partner.x * 0.32 : local?.x ?? 0
      const target = Math.max(0, Math.min(state.world.width - VIEW_W, focusX - VIEW_W * 0.43))
      cameraRef.current += (target - cameraRef.current) * 0.08
      renderGame(context, state, cameraRef.current)
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)
    return () => cancelAnimationFrame(frame)
  }, [localPlayerId])

  const pointerHandlers = (control: keyof InputState) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      updateControl(control, true)
    },
    onPointerUp: () => updateControl(control, false),
    onPointerCancel: () => updateControl(control, false),
    onPointerLeave: () => updateControl(control, false),
  })

  return (
    <div className="game-canvas-wrap">
      <canvas ref={canvasRef} width={VIEW_W} height={VIEW_H} aria-label="Màn chơi Nối Nhịp" />
      <div className="touch-controls" aria-label="Điều khiển cảm ứng">
        <div className="touch-cluster">
          <button type="button" aria-label="Đi sang trái" {...pointerHandlers('left')}><ArrowLeft /></button>
          <button type="button" aria-label="Đi sang phải" {...pointerHandlers('right')}><ArrowRight /></button>
        </div>
        <div className="touch-cluster touch-actions">
          <button type="button" aria-label="Tương tác" {...pointerHandlers('action')}><HandTap /></button>
          <button type="button" aria-label="Nhảy" {...pointerHandlers('jump')}><PersonSimpleRun /></button>
        </div>
      </div>
    </div>
  )
}
