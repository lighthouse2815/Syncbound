import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowClockwise,
  ArrowRight,
  Check,
  Copy,
  GameController,
  LinkSimpleHorizontal,
  SignOut,
  UsersThree,
} from '@phosphor-icons/react'
import { io, type Socket } from 'socket.io-client'
import { GameCanvas } from './GameCanvas'
import type { GameState, InputState, RoomReply, RoomState } from './types'

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function objectiveFor(game: GameState) {
  if (!game.team.doorOneOpen) return 'Mỗi người đứng trên một bàn đạp để mở cổng.'
  if (game.team.checkpoint < 2) return 'Giữ gần nhau để cầu năng lượng không biến mất.'
  if (!game.team.doorTwoOpen) return 'Đứng cạnh hai khóa và cùng giữ phím E.'
  if (game.team.checkpoint < 3) return 'Qua dãy vực, nếu bạn ngã đồng đội có thể cứu.'
  return 'Cả hai cùng đứng trong khung vàng để hoàn thành.'
}

function ProgressMeter({ value }: { value: number }) {
  return (
    <div className="charge-track" aria-label={`Tiến độ ${Math.round(value)} phần trăm`}>
      <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, value / 100))})` }} />
    </div>
  )
}

function LobbyScene() {
  return (
    <div className="lobby-scene" aria-label="Minh họa hai người phối hợp vượt cổng">
      <div className="scene-moon" />
      <div className="scene-cliff scene-cliff-one" />
      <div className="scene-cliff scene-cliff-two" />
      <div className="scene-tether" />
      <div className="scene-player scene-player-one"><span /></div>
      <div className="scene-player scene-player-two"><span /></div>
      <div className="scene-gate"><i /><i /><i /><i /></div>
      <div className="scene-floor" />
      <p>Không ai về đích một mình.</p>
    </div>
  )
}

type LobbyProps = {
  connected: boolean
  initialCode: string
  error: string
  onCreate: (name: string) => void
  onJoin: (name: string, code: string) => void
}

function Lobby({ connected, initialCode, error, onCreate, onJoin }: LobbyProps) {
  const [name, setName] = useState(() => localStorage.getItem('noi-nhip-name') ?? '')
  const [code, setCode] = useState(initialCode)

  const rememberName = () => {
    const safeName = name.trim() || 'Người chơi'
    localStorage.setItem('noi-nhip-name', safeName)
    return safeName
  }

  return (
    <main className="lobby-shell">
      <nav className="site-nav" aria-label="Điều hướng chính">
        <div className="brand"><LinkSimpleHorizontal weight="bold" /><span>NỐI NHỊP</span></div>
        <div className={`connection-state ${connected ? 'is-online' : ''}`}>
          <span /> {connected ? 'Server sẵn sàng' : 'Đang kết nối'}
        </div>
      </nav>

      <section className="lobby-grid">
        <div className="hero-copy">
          <p className="eyebrow">CO-OP ONLINE 2 NGƯỜI</p>
          <h1>HAI NGƯỜI.<br />MỘT NHỊP.</h1>
          <p className="hero-lead">Chạy, nhảy, giữ cầu và cứu nhau qua một đường đua chỉ thắng khi cả hai cùng tới đích.</p>

          <div className="room-form">
            <label htmlFor="player-name">Tên của bạn</label>
            <input
              id="player-name"
              maxLength={18}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Minh"
            />

            <div className="room-actions">
              <button className="primary-button" type="button" disabled={!connected} onClick={() => onCreate(rememberName())}>
                <GameController weight="fill" /> Tạo phòng
              </button>
              <div className="join-row">
                <input
                  aria-label="Mã phòng"
                  maxLength={5}
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="MÃ PHÒNG"
                />
                <button type="button" disabled={!connected || code.length !== 5} onClick={() => onJoin(rememberName(), code)}>
                  Vào <ArrowRight />
                </button>
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
        </div>

        <div className="scene-column">
          <LobbyScene />
          <div className="mechanic-notes">
            <p><strong>Giữ dây nối</strong><span>Đi quá xa, cả hai cùng chậm lại.</span></p>
            <p><strong>Đúng thời điểm</strong><span>Cổng chỉ mở khi hai người cùng hành động.</span></p>
          </div>
        </div>
      </section>
    </main>
  )
}

type WaitingProps = {
  room: RoomState
  localId: string
  onReady: (ready: boolean) => void
  onLeave: () => void
}

function WaitingRoom({ room, localId, onReady, onLeave }: WaitingProps) {
  const [copied, setCopied] = useState(false)
  const local = room.players.find((player) => player.id === localId)
  const inviteUrl = `${window.location.origin}?room=${room.code}`

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${inviteUrl} | Mã phòng: ${room.code}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="waiting-shell">
      <nav className="site-nav">
        <div className="brand"><LinkSimpleHorizontal weight="bold" /><span>NỐI NHỊP</span></div>
        <button className="text-button" type="button" onClick={onLeave}><SignOut /> Rời phòng</button>
      </nav>

      <section className="waiting-panel">
        <div className="room-code-block">
          <p>Gửi mã này cho đồng đội</p>
          <button type="button" onClick={copyInvite} aria-label="Sao chép lời mời">
            <strong>{room.code}</strong>
            {copied ? <Check weight="bold" /> : <Copy />}
          </button>
        </div>

        <div className="player-slots">
          {[0, 1].map((slot) => {
            const player = room.players.find((candidate) => candidate.slot === slot)
            return (
              <div className={`player-slot slot-${slot + 1} ${player ? 'is-filled' : ''}`} key={slot}>
                <span className="player-avatar">{player ? player.name.slice(0, 1).toUpperCase() : '?'}</span>
                <div>
                  <small>NGƯỜI CHƠI {slot + 1}</small>
                  <strong>{player?.name ?? 'Đang chờ...'}</strong>
                </div>
                <span className="ready-label">{player?.ready ? 'Sẵn sàng' : player ? 'Chưa sẵn sàng' : 'Trống'}</span>
              </div>
            )
          })}
        </div>

        <div className="waiting-actions">
          <p>{room.players.length < 2 ? 'Đang chờ người thứ hai vào phòng.' : 'Cả hai nhấn sẵn sàng để bắt đầu.'}</p>
          <button
            className="primary-button"
            type="button"
            disabled={room.players.length < 2}
            onClick={() => onReady(!local?.ready)}
          >
            {local?.ready ? <><ArrowClockwise /> Hủy sẵn sàng</> : <><Check weight="bold" /> Tôi sẵn sàng</>}
          </button>
        </div>
      </section>
    </main>
  )
}

type GameProps = {
  room: RoomState
  localId: string
  sendInput: (input: InputState) => void
  onRestart: () => void
  onLeave: () => void
}

function GameScreen({ room, localId, sendInput, onRestart, onLeave }: GameProps) {
  const game = room.game!
  const objective = objectiveFor(game)
  const stage = !game.team.doorOneOpen ? 1 : !game.team.doorTwoOpen ? (game.team.checkpoint < 2 ? 2 : 3) : 4
  const downed = game.players.find((player) => player.downed)

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="game-room"><LinkSimpleHorizontal weight="bold" /><span>PHÒNG</span><strong>{room.code}</strong></div>
        <div className="game-objective"><small>MỤC TIÊU {stage}/4</small><strong>{objective}</strong></div>
        <div className="game-stats"><span>{formatTime(game.elapsedMs)}</span><span>{game.team.deaths} lần ngã</span></div>
      </header>

      <section className="game-stage">
        <GameCanvas game={game} localPlayerId={localId} sendInput={sendInput} />
        {downed && game.status === 'playing' && (
          <div className="rescue-callout">
            <strong>{downed.name} đang cần cứu</strong>
            <span>Đến gần và giữ E</span>
            <ProgressMeter value={(game.team.reviveCharge / 70) * 100} />
          </div>
        )}
        {game.status === 'complete' && (
          <div className="finish-overlay">
            <div>
              <UsersThree weight="fill" />
              <p>CẢ HAI ĐÃ TỚI ĐÍCH</p>
              <h2>Khớp nhịp hoàn hảo.</h2>
              <span>Thời gian {formatTime(game.elapsedMs)} với {game.team.deaths} lần ngã.</span>
              <div className="finish-actions">
                <button className="primary-button" type="button" onClick={onRestart}><ArrowClockwise /> Chơi lại</button>
                <button type="button" onClick={onLeave}><SignOut /> Rời phòng</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="game-footer">
        <div className="player-legend">
          {game.players.map((player) => <span className={`legend-${player.slot + 1}`} key={player.id}>{player.name}</span>)}
        </div>
        <p><kbd>A</kbd><kbd>D</kbd> di chuyển <kbd>W</kbd> hoặc <kbd>Space</kbd> nhảy <kbd>E</kbd> tương tác</p>
        <button className="text-button" type="button" onClick={onLeave}><SignOut /> Rời</button>
      </footer>
    </main>
  )
}

export default function App() {
  const socket: Socket = useMemo(
    () => io(import.meta.env.VITE_SERVER_URL || undefined, { transports: ['websocket', 'polling'] }),
    [],
  )
  const [connected, setConnected] = useState(socket.connected)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [error, setError] = useState('')
  const initialCode = new URLSearchParams(window.location.search).get('room')?.toUpperCase().slice(0, 5) ?? ''

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onRoomState = (nextRoom: RoomState) => setRoom(nextRoom)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('room:state', onRoomState)
    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('room:state', onRoomState)
      socket.disconnect()
    }
  }, [socket])

  useEffect(() => {
    if (!room) return
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('room', room.code)
    window.history.replaceState({}, '', nextUrl)
  }, [room])

  const handleReply = (reply: RoomReply) => {
    if (reply.ok) {
      setError('')
      setRoom(reply.room)
    } else {
      setError(reply.error)
    }
  }

  const createRoom = (name: string) => socket.emit('room:create', { name }, handleReply)
  const joinRoom = (name: string, code: string) => socket.emit('room:join', { name, code }, handleReply)
  const leaveRoom = () => {
    socket.emit('room:leave')
    setRoom(null)
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete('room')
    window.history.replaceState({}, '', nextUrl)
  }
  const sendInput = useCallback((input: InputState) => socket.emit('player:input', input), [socket])

  if (!room) {
    return <Lobby connected={connected} initialCode={initialCode} error={error} onCreate={createRoom} onJoin={joinRoom} />
  }
  if (!room.game) {
    return <WaitingRoom room={room} localId={socket.id ?? ''} onReady={(ready) => socket.emit('player:ready', ready)} onLeave={leaveRoom} />
  }
  return <GameScreen room={room} localId={socket.id ?? ''} sendInput={sendInput} onRestart={() => socket.emit('game:restart')} onLeave={leaveRoom} />
}
