import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { io } from 'socket.io-client'

const TEST_PORT = 3101
const TEST_URL = `http://127.0.0.1:${TEST_PORT}`

function waitForEvent(socket, eventName, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, onEvent)
      reject(new Error(`Hết thời gian chờ ${eventName}`))
    }, timeout)
    const onEvent = (payload) => {
      if (!predicate(payload)) return
      clearTimeout(timer)
      socket.off(eventName, onEvent)
      resolve(payload)
    }
    socket.on(eventName, onEvent)
  })
}

function emitWithReply(socket, eventName, payload) {
  return new Promise((resolve) => socket.emit(eventName, payload, resolve))
}

test('hai socket tạo phòng, vào phòng và nhìn thấy chuyển động của nhau', async (context) => {
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const first = io(TEST_URL, { transports: ['websocket'] })
  const second = io(TEST_URL, { transports: ['websocket'] })

  context.after(() => {
    first.disconnect()
    second.disconnect()
    server.kill()
  })

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server test không khởi động')), 5000)
    server.stdout.on('data', (chunk) => {
      if (!chunk.toString().includes('server')) return
      clearTimeout(timer)
      resolve()
    })
    server.stderr.on('data', (chunk) => reject(new Error(chunk.toString())))
  })

  if (!first.connected) await new Promise((resolve) => first.once('connect', resolve))
  if (!second.connected) await new Promise((resolve) => second.once('connect', resolve))

  const created = await emitWithReply(first, 'room:create', { name: 'An' })
  assert.equal(created.ok, true)
  const code = created.room.code
  const joined = await emitWithReply(second, 'room:join', { code, name: 'Bình' })
  assert.equal(joined.ok, true)
  assert.equal(joined.room.players.length, 2)

  const firstStarted = waitForEvent(first, 'room:state', (room) => room.game?.status === 'playing')
  first.emit('player:ready', true)
  second.emit('player:ready', true)
  const startedRoom = await firstStarted
  const startX = startedRoom.game.players.find((player) => player.name === 'An').x

  const moved = waitForEvent(
    second,
    'room:state',
    (room) => room.game?.players.some((player) => player.name === 'An' && player.x > startX + 12),
  )
  first.emit('player:input', { left: false, right: true, jump: false, action: false })
  const movedRoom = await moved
  first.emit('player:input', { left: false, right: false, jump: false, action: false })
  const observedX = movedRoom.game.players.find((player) => player.name === 'An').x
  assert.ok(observedX > startX + 12)
})
