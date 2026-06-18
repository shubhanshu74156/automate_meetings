import { AgentConfig, CARTESIA_VOICES, CEREBRAS_MODELS, LLMProvider, OPENAI_MODELS, SARVAM_MODELS } from '../types'

interface Props {
  config: AgentConfig
  onChange: (c: AgentConfig) => void
  disabled: boolean
}

export default function ConfigForm({ config, onChange, disabled }: Props) {
  const set = (key: keyof AgentConfig, value: string) =>
    onChange({ ...config, [key]: value })

  const handleProviderChange = (provider: LLMProvider) => {
    const defaultModel =
      provider === 'cerebras' ? CEREBRAS_MODELS[0].value : OPENAI_MODELS[0].value
    onChange({ ...config, llm_provider: provider, llm_model: defaultModel })
  }

  const llmModels = config.llm_provider === 'cerebras' ? CEREBRAS_MODELS : OPENAI_MODELS

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
          STT — Sarvam
        </h2>

        <div className="field">
          <label className="label">Sarvam API Key</label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="sk-…"
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
            {SARVAM_MODELS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ── LLM ─────────────────────────────────────────────────── */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">LLM</h2>

        <div className="field">
          <label className="label">Provider</label>
          <select
            className="select"
            value={config.llm_provider}
            onChange={e => handleProviderChange(e.target.value as LLMProvider)}
            disabled={disabled}
          >
            <option value="openai">OpenAI</option>
            <option value="cerebras">Cerebras</option>
          </select>
        </div>

        <div className="field">
          <label className="label">
            {config.llm_provider === 'cerebras' ? 'Cerebras' : 'OpenAI'} API Key
          </label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="sk-…"
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
          TTS — Cartesia
        </h2>

        <div className="field">
          <label className="label">Cartesia API Key</label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="sk-…"
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
            {CARTESIA_VOICES.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Or paste any Cartesia voice ID directly into the field above.
          </p>
        </div>
      </section>
    </div>
  )
}
