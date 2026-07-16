export const TICK_RATE = 60
export const WORLD = { width: 5200, height: 720 }

const PLAYER_W = 34
const PLAYER_H = 50
const MOVE_SPEED = 6.2
const JUMP_SPEED = 14.2
const GRAVITY = 0.72
const MAX_FALL = 18

export const STATIC_PLATFORMS = [
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

export const SPIKES = [
  { x: 600, y: 598, w: 70, h: 22 },
  { x: 1280, y: 598, w: 76, h: 22 },
  { x: 2870, y: 598, w: 82, h: 22 },
  { x: 4500, y: 598, w: 90, h: 22 },
]

export const CHECKPOINTS = [1180, 2780, 4280]
export const PLATES = [
  { x: 1510, y: 608, w: 76, h: 12 },
  { x: 1775, y: 608, w: 76, h: 12 },
]
export const SYNC_NODES = [
  { x: 3080, y: 548, w: 72, h: 72 },
  { x: 3280, y: 548, w: 72, h: 72 },
]
export const FINISH_ZONE = { x: 4930, y: 500, w: 190, h: 120 }
export const BRIDGE = { x: 2210, y: 570, w: 510, h: 22 }

export function createPlayerState(id, slot, name) {
  return {
    id,
    slot,
    name,
    x: 165 + slot * 62,
    y: 570,
    vx: 0,
    vy: 0,
    grounded: true,
    downed: false,
    facing: 1,
    lastSafeX: 165 + slot * 62,
    lastSafeY: 570,
    input: { left: false, right: false, jump: false, action: false },
    jumpHeld: false,
  }
}

export function createGame(players) {
  const playerStates = players.map((player, index) =>
    createPlayerState(player.id, index, player.name),
  )
  return {
    status: 'playing',
    tick: 0,
    elapsedMs: 0,
    players: playerStates,
    team: {
      checkpoint: 0,
      doorOneOpen: false,
      plateCharge: 0,
      bridgeActive: false,
      doorTwoOpen: false,
      syncCharge: 0,
      deaths: 0,
      rescueTicks: 0,
      reviveCharge: 0,
      finishCharge: 0,
    },
  }
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function playerRect(player) {
  return { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H }
}

function centerDistance(a, b) {
  const ax = a.x + PLAYER_W / 2
  const ay = a.y + PLAYER_H / 2
  const bx = b.x + PLAYER_W / 2
  const by = b.y + PLAYER_H / 2
  return Math.hypot(ax - bx, ay - by)
}

function solidsFor(game) {
  const solids = [...STATIC_PLATFORMS]
  if (game.team.bridgeActive) solids.push(BRIDGE)
  if (!game.team.doorOneOpen) solids.push({ x: 2030, y: 430, w: 36, h: 190 })
  if (!game.team.doorTwoOpen) solids.push({ x: 3420, y: 420, w: 38, h: 200 })
  return solids
}

function movePlayer(player, solids) {
  player.vx = 0
  if (player.input.left) {
    player.vx = -MOVE_SPEED
    player.facing = -1
  }
  if (player.input.right) {
    player.vx = MOVE_SPEED
    player.facing = 1
  }

  if (player.input.jump && !player.jumpHeld && player.grounded) {
    player.vy = -JUMP_SPEED
    player.grounded = false
  }
  player.jumpHeld = player.input.jump

  player.x += player.vx
  for (const solid of solids) {
    const rect = playerRect(player)
    if (!intersects(rect, solid)) continue
    if (player.vx > 0) player.x = solid.x - PLAYER_W
    if (player.vx < 0) player.x = solid.x + solid.w
  }

  player.vy = Math.min(player.vy + GRAVITY, MAX_FALL)
  player.y += player.vy
  player.grounded = false
  for (const solid of solids) {
    const rect = playerRect(player)
    if (!intersects(rect, solid)) continue
    if (player.vy >= 0) {
      player.y = solid.y - PLAYER_H
      player.vy = 0
      player.grounded = true
    } else {
      player.y = solid.y + solid.h
      player.vy = 0
    }
  }

  player.x = Math.max(0, Math.min(WORLD.width - PLAYER_W, player.x))
  if (player.grounded && !SPIKES.some((spike) => intersects(playerRect(player), spike))) {
    player.lastSafeX = player.x
    player.lastSafeY = player.y
  }
}

function isOnPlate(player, plate) {
  const feet = player.y + PLAYER_H
  return player.x + PLAYER_W > plate.x && player.x < plate.x + plate.w && Math.abs(feet - plate.y) < 18
}

function nearNode(player, node) {
  const px = player.x + PLAYER_W / 2
  const py = player.y + PLAYER_H / 2
  const nx = node.x + node.w / 2
  const ny = node.y + node.h / 2
  return Math.hypot(px - nx, py - ny) < 92
}

function downPlayer(game, player) {
  if (player.downed) return
  player.downed = true
  player.vx = 0
  player.vy = 0
  player.x = player.lastSafeX
  player.y = player.lastSafeY
  game.team.deaths += 1
  game.team.rescueTicks = 300
  game.team.reviveCharge = 0
}

function resetAtCheckpoint(game) {
  const baseX = game.team.checkpoint === 0 ? 165 : CHECKPOINTS[game.team.checkpoint - 1] + 28
  game.players.forEach((player, index) => {
    player.x = baseX + index * 58
    player.y = 570
    player.vx = 0
    player.vy = 0
    player.downed = false
    player.grounded = true
    player.lastSafeX = player.x
    player.lastSafeY = player.y
  })
  game.team.rescueTicks = 0
  game.team.reviveCharge = 0
}

function updateCoopSystems(game) {
  const [first, second] = game.players
  if (!first || !second) return

  const activePlayers = game.players.filter((player) => !player.downed)
  game.team.bridgeActive = activePlayers.length === 2 && centerDistance(first, second) <= 330

  if (!game.team.doorOneOpen) {
    const correctPair =
      (isOnPlate(first, PLATES[0]) && isOnPlate(second, PLATES[1])) ||
      (isOnPlate(first, PLATES[1]) && isOnPlate(second, PLATES[0]))
    game.team.plateCharge = Math.max(0, Math.min(60, game.team.plateCharge + (correctPair ? 1 : -2)))
    if (game.team.plateCharge >= 60) game.team.doorOneOpen = true
  }

  if (!game.team.doorTwoOpen) {
    const correctPair =
      (nearNode(first, SYNC_NODES[0]) && nearNode(second, SYNC_NODES[1])) ||
      (nearNode(first, SYNC_NODES[1]) && nearNode(second, SYNC_NODES[0]))
    const bothActing = first.input.action && second.input.action
    game.team.syncCharge = Math.max(0, Math.min(75, game.team.syncCharge + (correctPair && bothActing ? 1 : -1)))
    if (game.team.syncCharge >= 75) game.team.doorTwoOpen = true
  }

  const downed = game.players.find((player) => player.downed)
  const rescuer = game.players.find((player) => !player.downed)
  if (downed && rescuer) {
    game.team.rescueTicks -= 1
    const closeEnough = centerDistance(downed, rescuer) < 96
    game.team.reviveCharge = Math.max(0, Math.min(70, game.team.reviveCharge + (closeEnough && rescuer.input.action ? 1 : -1)))
    if (game.team.reviveCharge >= 70) {
      downed.downed = false
      downed.x = rescuer.x - rescuer.facing * 48
      downed.y = rescuer.y
      downed.lastSafeX = downed.x
      downed.lastSafeY = downed.y
      game.team.rescueTicks = 0
      game.team.reviveCharge = 0
    } else if (game.team.rescueTicks <= 0) {
      resetAtCheckpoint(game)
    }
  }

  for (let index = game.team.checkpoint; index < CHECKPOINTS.length; index += 1) {
    if (game.players.every((player) => !player.downed && player.x >= CHECKPOINTS[index])) {
      game.team.checkpoint = index + 1
    }
  }

  const bothAtFinish = game.players.every((player) =>
    intersects(playerRect(player), FINISH_ZONE),
  )
  game.team.finishCharge = Math.max(0, Math.min(90, game.team.finishCharge + (bothAtFinish ? 1 : -2)))
  if (game.team.finishCharge >= 90) game.status = 'complete'
}

function updateBridgeState(game) {
  const [first, second] = game.players
  if (!first || !second) return
  const activePlayers = game.players.filter((player) => !player.downed)
  game.team.bridgeActive = activePlayers.length === 2 && centerDistance(first, second) <= 330
}

function updateTether(game) {
  const [first, second] = game.players
  if (!first || !second || first.downed || second.downed) return
  const distance = centerDistance(first, second)
  if (distance <= 560) return
  const direction = Math.sign(second.x - first.x)
  first.x += direction * Math.min(3.2, (distance - 560) * 0.04)
  second.x -= direction * Math.min(3.2, (distance - 560) * 0.04)
}

export function stepGame(game) {
  if (game.status !== 'playing') return game
  game.tick += 1
  game.elapsedMs = Math.round((game.tick / TICK_RATE) * 1000)

  updateBridgeState(game)
  const solids = solidsFor(game)
  game.players.forEach((player) => {
    if (!player.downed) movePlayer(player, solids)
  })
  updateTether(game)

  game.players.forEach((player) => {
    if (player.downed) return
    if (player.y > WORLD.height + 80 || SPIKES.some((spike) => intersects(playerRect(player), spike))) {
      downPlayer(game, player)
    }
  })

  updateCoopSystems(game)
  return game
}

export function publicGameState(game) {
  return {
    status: game.status,
    tick: game.tick,
    elapsedMs: game.elapsedMs,
    world: WORLD,
    players: game.players.map(({ input, jumpHeld, lastSafeX, lastSafeY, ...player }) => player),
    team: { ...game.team },
  }
}
