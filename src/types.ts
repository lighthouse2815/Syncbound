export type InputState = {
  left: boolean
  right: boolean
  jump: boolean
  action: boolean
}

export type PlayerState = {
  id: string
  slot: number
  name: string
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  downed: boolean
  facing: number
}

export type TeamState = {
  checkpoint: number
  doorOneOpen: boolean
  plateCharge: number
  bridgeActive: boolean
  doorTwoOpen: boolean
  syncCharge: number
  deaths: number
  rescueTicks: number
  reviveCharge: number
  finishCharge: number
}

export type GameState = {
  status: 'playing' | 'complete'
  tick: number
  elapsedMs: number
  world: { width: number; height: number }
  players: PlayerState[]
  team: TeamState
}

export type RoomPlayer = {
  id: string
  name: string
  ready: boolean
  slot: number
}

export type RoomState = {
  code: string
  hostId: string | null
  players: RoomPlayer[]
  game: GameState | null
}

export type RoomReply =
  | { ok: true; room: RoomState }
  | { ok: false; error: string }
