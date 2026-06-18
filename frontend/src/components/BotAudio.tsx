import { useEffect, useRef } from 'react'
import { usePipecatClientMediaTrack } from '@pipecat-ai/client-react'

interface Props {
  muted: boolean
}

export default function BotAudio({ muted }: Props) {
  const track = usePipecatClientMediaTrack('audio', 'bot')
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.srcObject = track ? new MediaStream([track]) : null
  }, [track])

  return <audio ref={audioRef} autoPlay muted={muted} />
}
