import express from 'express'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { createGame, publicGameState, stepGame, TICK_RATE } from './game-engine.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true },
})
const rooms = new Map()
const STATE_BROADCAST_EVERY_TICKS = 2

const cleanName = (value) => String(value || 'Người chơi').trim().slice(0, 18) || 'Người chơi'
const cleanCode = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do {
    code = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  } while (rooms.has(code))
  return code
}

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.players[0]?.id ?? null,
    players: room.players.map((player, slot) => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      slot,
    })),
    game: room.game ? publicGameState(room.game) : null,
  }
}

function publishRoom(room, volatile = false) {
  const channel = io.to(room.code)
  if (volatile) {
    channel.volatile.emit('room:state', roomSnapshot(room))
    return
  }
  channel.emit('room:state', roomSnapshot(room))
}

function leaveCurrentRoom(socket) {
  const code = socket.data.roomCode
  if (!code) return
  const room = rooms.get(code)
  socket.leave(code)
  socket.data.roomCode = null
  if (!room) return
  room.players = room.players.filter((player) => player.id !== socket.id)
  if (room.players.length === 0) {
    rooms.delete(code)
  } else {
    room.players.forEach((player, slot) => { player.slot = slot; player.ready = false })
    room.game = null
    publishRoom(room)
  }
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name } = {}, reply = () => {}) => {
    leaveCurrentRoom(socket)
    const code = makeCode()
    const room = {
      code,
      players: [{ id: socket.id, name: cleanName(name), ready: false, slot: 0 }],
      game: null,
    }
    rooms.set(code, room)
    socket.join(code)
    socket.data.roomCode = code
    reply({ ok: true, room: roomSnapshot(room) })
    publishRoom(room)
  })

  socket.on('room:join', ({ code, name } = {}, reply = () => {}) => {
    leaveCurrentRoom(socket)
    const normalizedCode = cleanCode(code)
    const room = rooms.get(normalizedCode)
    if (!room) return reply({ ok: false, error: 'Không tìm thấy phòng này.' })
    if (room.players.length >= 2) return reply({ ok: false, error: 'Phòng đã đủ hai người.' })
    room.players.push({ id: socket.id, name: cleanName(name), ready: false, slot: 1 })
    socket.join(normalizedCode)
    socket.data.roomCode = normalizedCode
    reply({ ok: true, room: roomSnapshot(room) })
    publishRoom(room)
  })

  socket.on('player:ready', (ready = true) => {
    const room = rooms.get(socket.data.roomCode)
    if (!room || room.game) return
    const player = room.players.find((candidate) => candidate.id === socket.id)
    if (!player) return
    player.ready = Boolean(ready)
    if (room.players.length === 2 && room.players.every((candidate) => candidate.ready)) {
      room.game = createGame(room.players)
    }
    publishRoom(room)
  })

  socket.on('player:input', (input = {}) => {
    const room = rooms.get(socket.data.roomCode)
    const player = room?.game?.players.find((candidate) => candidate.id === socket.id)
    if (!player) return
    player.input = {
      left: Boolean(input.left),
      right: Boolean(input.right),
      jump: Boolean(input.jump),
      action: Boolean(input.action),
    }
  })

  socket.on('game:restart', () => {
    const room = rooms.get(socket.data.roomCode)
    if (!room || room.players.length !== 2) return
    room.game = createGame(room.players)
    publishRoom(room)
  })

  socket.on('room:leave', () => leaveCurrentRoom(socket))
  socket.on('disconnect', () => leaveCurrentRoom(socket))
})

setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.game || room.game.status !== 'playing') continue
    stepGame(room.game)
    if (room.game.status !== 'playing') publishRoom(room)
    else if (room.game.tick % STATE_BROADCAST_EVERY_TICKS === 0) publishRoom(room, true)
  }
}, 1000 / TICK_RATE)

app.get('/health', (_request, response) => {
  response.json({ ok: true, rooms: rooms.size })
})

const distPath = path.resolve(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('/{*splat}', (_request, response) => {
  response.sendFile(path.join(distPath, 'index.html'), (error) => {
    if (error && !response.headersSent) response.status(404).send('Hãy chạy npm run build trước.')
  })
})

const port = Number(process.env.PORT || 3001)
httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Nối Nhịp server đang chạy tại http://localhost:${port}`)
})
