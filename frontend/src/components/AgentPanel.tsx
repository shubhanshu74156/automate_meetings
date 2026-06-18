import { Mic, MicOff, PhoneOff, Loader2, Radio, Volume2, VolumeX } from 'lucide-react'
import { TransportState } from '../types'
import MicSelector from './MicSelector'
import clsx from 'clsx'

interface Props {
  state: TransportState
  agentName: string
  onStart: () => void
  onStop: () => void
  isMicMuted: boolean
  onToggleMic: () => void
  hearLocally: boolean
  onToggleHearLocally: () => void
}

const STATE_LABELS: Record<TransportState, string> = {
  idle: 'Idle',
  initializing: 'Initialising…',
  initialized: 'Ready',
  authenticating: 'Authenticating…',
  connecting: 'Connecting…',
  connected: 'Connected',
  ready: 'Live',
  disconnecting: 'Disconnecting…',
  disconnected: 'Disconnected',
  error: 'Error',
}

const isActive = (s: TransportState) => s === 'ready' || s === 'connected'
// 'initializing' and 'initialized' are device-setup states that happen on page load;
// they are not an active connection, so the button must stay as "Start Agent".
const isBusy = (s: TransportState) => ['authenticating', 'connecting', 'disconnecting'].includes(s)

export default function AgentPanel({ state, agentName, onStart, onStop, isMicMuted, onToggleMic, hearLocally, onToggleHearLocally }: Props) {
  return (
    <div className="card space-y-5">
      {/* Status row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              'w-2.5 h-2.5 rounded-full',
              isActive(state) ? 'bg-green-400 animate-pulse-slow' :
              state === 'error' ? 'bg-red-400' :
              isBusy(state) ? 'bg-yellow-400 animate-pulse' :
              'bg-gray-600'
            )}
          />
          <span className="text-sm font-medium text-gray-200">{STATE_LABELS[state]}</span>
        </div>
        {isActive(state) && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <Radio size={13} />
            Live
          </div>
        )}
      </div>

      {/* Agent info */}
      <div className="space-y-1">
        <p className="text-base font-semibold text-white">{agentName}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {!isActive(state) && !isBusy(state) ? (
          <button className="btn-primary flex-1" onClick={onStart} disabled={isBusy(state)}>
            {isBusy(state) ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
            Start Agent
          </button>
        ) : (
          <>
            <button
              className={clsx('btn flex-none', isMicMuted ? 'btn-ghost opacity-60' : 'btn-ghost')}
              onClick={onToggleMic}
              disabled={!isActive(state)}
              title={isMicMuted ? 'Unmute mic' : 'Mute mic'}
            >
              {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <button
              className={clsx('btn flex-none', !hearLocally ? 'btn-ghost opacity-60' : 'btn-ghost')}
              onClick={onToggleHearLocally}
              title={hearLocally ? 'Hearing bot locally — click to mute on this device' : 'Bot audio muted here (Meet participants still hear it)'}
            >
              {hearLocally ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button
              className="btn-danger flex-1"
              onClick={onStop}
              disabled={!isActive(state) && !isBusy(state)}
            >
              {isBusy(state) ? <Loader2 size={16} className="animate-spin" /> : <PhoneOff size={16} />}
              Stop Agent
            </button>
          </>
        )}
      </div>

      {/* Mic selector — shown when not live so user can pick the right device */}
      {!isActive(state) && !isBusy(state) && <MicSelector />}
    </div>
  )
}
