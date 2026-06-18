import { useCallback, useEffect, useRef, useState } from 'react'
import { PipecatClient, RTVIEvent, type RTVIMessage } from '@pipecat-ai/client-js'
import { SmallWebRTCTransport } from '@pipecat-ai/small-webrtc-transport'
import { PipecatClientProvider } from '@pipecat-ai/client-react'

import BotAudio from './components/BotAudio'
import ConfigForm from './components/ConfigForm'
import AgentPanel from './components/AgentPanel'
import TranscriptView from './components/TranscriptView'
import ToastContainer from './components/Toast'
import { useToast } from './hooks/useToast'
import { AgentConfig, DEFAULT_CONFIG, TranscriptEntry, TransportState } from './types'

let _entryCounter = 0
const makeId = () => `entry-${++_entryCounter}`

export default function App() {
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG)
  const [transportState, setTransportState] = useState<TransportState>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [hearLocally, setHearLocally] = useState(true)
  const { toasts, toast, dismiss } = useToast()

  const clientRef = useRef<PipecatClient | null>(null)
  if (!clientRef.current) {
    clientRef.current = new PipecatClient({
      transport: new SmallWebRTCTransport(),
      enableMic: true,
      enableCam: false,
    })
  }
  const client = clientRef.current

  // ── Wire up events ────────────────────────────────────────────────────────
  useEffect(() => {
    const addEntry = (speaker: TranscriptEntry['speaker'], text: string) => {
      if (!text?.trim()) return
      setTranscript(prev => [
        ...prev,
        { id: makeId(), speaker, text: text.trim(), timestamp: new Date() },
      ])
    }

    client.on(RTVIEvent.TransportStateChanged, (state: string) => {
      setTransportState(state as TransportState)
    })

    client.on(RTVIEvent.UserTranscript, (data: { text: string; final: boolean }) => {
      if (data.final) addEntry('user', data.text)
    })

    client.on(RTVIEvent.BotTranscript, (data: { text: string }) => {
      addEntry('agent', data.text)
    })

    // Pipeline error from the bot (FatalErrorFrame → RTVI error message)
    client.on(RTVIEvent.Error, (msg: RTVIMessage) => {
      const data = msg.data as { message?: string } | null
      const message = data?.message ?? 'An unknown pipeline error occurred'
      toast(message, 'error')
      // Stop the connection so the user can reconfigure and retry
      client.disconnect().catch(() => {})
    })

    return () => {
      client.removeAllListeners()
    }
  }, [client, toast])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    try {
      await client.connect({
        webrtcRequestParams: {
          endpoint: '/api/offer',
          requestData: config,
        },
      } as any)
    } catch (err: unknown) {
      // HTTP errors arrive as a Response object; pipeline errors as Error
      let message = 'Failed to connect'
      if (err instanceof Response) {
        try {
          const body = await err.json()
          message = body.detail ?? body.message ?? `Server error ${err.status}`
        } catch {
          message = `Server error ${err.status}`
        }
      } else if (err instanceof Error) {
        message = err.message
      }
      toast(message, 'error')
      setTransportState('error')
    }
  }, [client, config, toast])

  const handleStop = useCallback(async () => {
    try {
      await client.disconnect()
    } catch (err) {
      console.error('Stop error:', err)
    }
  }, [client])

  const handleToggleMic = useCallback(() => {
    if (isMicMuted) {
      client.enableMic(true)
      setIsMicMuted(false)
    } else {
      client.enableMic(false)
      setIsMicMuted(true)
    }
  }, [client, isMicMuted])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PipecatClientProvider client={client as any} autoInitDevices>
      <BotAudio muted={!hearLocally} />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <div className="min-h-screen bg-gray-950">
        <header className="border-b border-gray-800 px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-lg font-bold text-white">AI Meeting Delegate</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Multi-provider STT · LLM · TTS — powered by Pipecat
            </p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div>
            <ConfigForm
              config={config}
              onChange={setConfig}
              disabled={transportState !== 'idle' && transportState !== 'disconnected' && transportState !== 'error'}
            />
          </div>

          <div className="space-y-5">
            <AgentPanel
              state={transportState}
              agentName={config.agent_name || 'AI Delegate'}
              onStart={handleStart}
              onStop={handleStop}
              isMicMuted={isMicMuted}
              onToggleMic={handleToggleMic}
              hearLocally={hearLocally}
              onToggleHearLocally={() => setHearLocally(v => !v)}
            />

            <TranscriptView entries={transcript} />

            <div className="card text-xs text-gray-500 space-y-1 leading-relaxed">
              <p className="font-semibold text-gray-400">Google Meet audio routing</p>
              <p>In Google Meet settings set the <span className="text-gray-300">microphone</span> to <span className="text-gray-300">CABLE Output (VB-Audio)</span> so other participants hear the agent.</p>
              <p>Keep this app's microphone on your real mic — the selector above handles it automatically.</p>
            </div>
          </div>
        </main>
      </div>
    </PipecatClientProvider>
  )
}
