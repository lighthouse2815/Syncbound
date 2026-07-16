import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, PLATES, stepGame, SYNC_NODES } from './game-engine.js'

function freshGame() {
  return createGame([
    { id: 'a', name: 'An' },
    { id: 'b', name: 'Bình' },
  ])
}

test('hai người đứng đúng bàn đạp sẽ mở cổng đầu', () => {
  const game = freshGame()
  game.players[0].x = PLATES[0].x + 10
  game.players[0].y = 558
  game.players[1].x = PLATES[1].x + 10
  game.players[1].y = 558
  for (let tick = 0; tick < 65; tick += 1) stepGame(game)
  assert.equal(game.team.doorOneOpen, true)
})

test('đứng gần nhau sẽ duy trì cầu năng lượng', () => {
  const game = freshGame()
  game.players[0].x = 2150
  game.players[1].x = 2320
  stepGame(game)
  assert.equal(game.team.bridgeActive, true)
  game.players[1].x = 2800
  stepGame(game)
  assert.equal(game.team.bridgeActive, false)
})

test('giữ thao tác ở hai khóa sẽ mở cổng nhịp', () => {
  const game = freshGame()
  game.players[0].x = SYNC_NODES[0].x + 18
  game.players[0].y = 570
  game.players[1].x = SYNC_NODES[1].x + 18
  game.players[1].y = 570
  game.players.forEach((player) => { player.input.action = true })
  for (let tick = 0; tick < 80; tick += 1) stepGame(game)
  assert.equal(game.team.doorTwoOpen, true)
})
