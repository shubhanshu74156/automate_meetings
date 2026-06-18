import {
  AgentConfig,
  LLMProvider,
  STTProvider,
  TTSProvider,
  LLM_MODELS,
  LLM_PROVIDERS,
  STT_MODELS,
  STT_PROVIDERS,
  TTS_MODELS,
  TTS_PROVIDERS,
  TTS_VOICES,
} from '../types'

interface Props {
  config: AgentConfig
  onChange: (c: AgentConfig) => void
  disabled: boolean
}

export default function ConfigForm({ config, onChange, disabled }: Props) {
  const set = (key: keyof AgentConfig, value: string) =>
    onChange({ ...config, [key]: value })

  const handleSTTProviderChange = (provider: STTProvider) => {
    const defaultModel = STT_MODELS[provider][0].value
    onChange({ ...config, stt_provider: provider, stt_model: defaultModel, stt_api_key: '' })
  }

  const handleLLMProviderChange = (provider: LLMProvider) => {
    const defaultModel = LLM_MODELS[provider][0].value
    onChange({ ...config, llm_provider: provider, llm_model: defaultModel, llm_api_key: '' })
  }

  const handleTTSProviderChange = (provider: TTSProvider) => {
    const defaultVoice = TTS_VOICES[provider][0].value
    const defaultModel = TTS_MODELS[provider]?.[0]?.value ?? ''
    onChange({ ...config, tts_provider: provider, tts_voice_id: defaultVoice, tts_model: defaultModel, tts_api_key: '' })
  }

  const sttModels = STT_MODELS[config.stt_provider]
  const llmModels = LLM_MODELS[config.llm_provider]
  const ttsVoices = TTS_VOICES[config.tts_provider]
  const ttsModels = TTS_MODELS[config.tts_provider]

  const llmProviderLabel = LLM_PROVIDERS.find(p => p.value === config.llm_provider)?.label ?? 'LLM'
  const sttProviderLabel = STT_PROVIDERS.find(p => p.value === config.stt_provider)?.label ?? 'STT'
  const ttsProviderLabel = TTS_PROVIDERS.find(p => p.value === config.tts_provider)?.label ?? 'TTS'

  return (
    <div className="space-y-6">
      {/* ── Agent ───────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Agent</h2>

        <div className="field">
          <label className="label">Agent Name</label>
          <input
            className="input"
            type="text"
            placeholder="AI Delegate"
            value={config.agent_name}
            onChange={e => set('agent_name', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="field">
          <label className="label">Instructions</label>
          <textarea
            className="input resize-none h-28"
            placeholder="Attend this meeting on my behalf. Gather requirements. Do not make commitments…"
            value={config.instructions}
            onChange={e => set('instructions', e.target.value)}
            disabled={disabled}
          />
        </div>
      </section>

      {/* ── STT ─────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          STT — {sttProviderLabel}
        </h2>

        <div className="field">
          <label className="label">Provider</label>
          <select
            className="select"
            value={config.stt_provider}
            onChange={e => handleSTTProviderChange(e.target.value as STTProvider)}
            disabled={disabled}
          >
            {STT_PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label">{sttProviderLabel} API Key</label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="API key…"
            value={config.stt_api_key}
            onChange={e => set('stt_api_key', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="field">
          <label className="label">Model</label>
          <select
            className="select"
            value={config.stt_model}
            onChange={e => set('stt_model', e.target.value)}
            disabled={disabled}
          >
            {sttModels.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── LLM ─────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          LLM — {llmProviderLabel}
        </h2>

        <div className="field">
          <label className="label">Provider</label>
          <select
            className="select"
            value={config.llm_provider}
            onChange={e => handleLLMProviderChange(e.target.value as LLMProvider)}
            disabled={disabled}
          >
            {LLM_PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label">{llmProviderLabel} API Key</label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="API key…"
            value={config.llm_api_key}
            onChange={e => set('llm_api_key', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="field">
          <label className="label">Model</label>
          <select
            className="select"
            value={config.llm_model}
            onChange={e => set('llm_model', e.target.value)}
            disabled={disabled}
          >
            {llmModels.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── TTS ─────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          TTS — {ttsProviderLabel}
        </h2>

        <div className="field">
          <label className="label">Provider</label>
          <select
            className="select"
            value={config.tts_provider}
            onChange={e => handleTTSProviderChange(e.target.value as TTSProvider)}
            disabled={disabled}
          >
            {TTS_PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label">{ttsProviderLabel} API Key</label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="API key…"
            value={config.tts_api_key}
            onChange={e => set('tts_api_key', e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="field">
          <label className="label">Voice</label>
          <select
            className="select"
            value={config.tts_voice_id}
            onChange={e => set('tts_voice_id', e.target.value)}
            disabled={disabled}
          >
            {ttsVoices.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {ttsModels && (
          <div className="field">
            <label className="label">Model</label>
            <select
              className="select"
              value={config.tts_model}
              onChange={e => set('tts_model', e.target.value)}
              disabled={disabled}
            >
              {ttsModels.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}
      </section>
    </div>
  )
}
