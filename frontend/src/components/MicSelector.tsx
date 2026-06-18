import { useEffect } from 'react'
import { usePipecatClientMediaDevices } from '@pipecat-ai/client-react'

const VIRTUAL_LABELS = ['cable', 'virtual', 'voicemeeter', 'blackhole', 'soundflower', 'vb-audio']

const isVirtual = (label: string) =>
  VIRTUAL_LABELS.some(kw => label.toLowerCase().includes(kw))

export default function MicSelector() {
  const { availableMics, selectedMic, updateMic } = usePipecatClientMediaDevices()

  // Auto-select the first real (non-virtual) mic when the device list loads
  useEffect(() => {
    if (availableMics.length === 0) return
    const currentIsVirtual = selectedMic && isVirtual(selectedMic.label ?? '')
    if (!selectedMic || currentIsVirtual) {
      const realMic = availableMics.find(m => !isVirtual(m.label))
      if (realMic) updateMic(realMic.deviceId)
    }
  }, [availableMics]) // eslint-disable-line react-hooks/exhaustive-deps

  if (availableMics.length === 0) return null

  return (
    <div className="field">
      <label className="label text-xs">Microphone (this app)</label>
      <select
        className="select text-xs"
        value={selectedMic?.deviceId ?? ''}
        onChange={e => updateMic(e.target.value)}
      >
        {availableMics.map(mic => (
          <option key={mic.deviceId} value={mic.deviceId}>
            {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
            {isVirtual(mic.label) ? ' — virtual' : ''}
          </option>
        ))}
      </select>
      <p className="text-[10px] text-gray-600 mt-1">
        Use your real mic here. Set Google Meet's mic to <span className="text-gray-400">CABLE Output</span>.
      </p>
    </div>
  )
}
