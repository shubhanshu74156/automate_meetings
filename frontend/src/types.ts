export type LLMProvider = 'openai' | 'cerebras'

export type TransportState =
  | 'idle'
  | 'initializing'
  | 'initialized'
  | 'authenticating'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'disconnecting'
  | 'disconnected'
  | 'error'

export interface AgentConfig {
  agent_name: string
  instructions: string
  // STT
  stt_api_key: string
  stt_model: string
  // LLM
  llm_provider: LLMProvider
  llm_api_key: string
  llm_model: string
  // TTS
  tts_api_key: string
  tts_voice_id: string
}

export interface TranscriptEntry {
  id: string
  speaker: 'user' | 'agent'
  text: string
  timestamp: Date
}

export const DEFAULT_CONFIG: AgentConfig = {
  agent_name: 'AI Delegate',
  instructions:
    'Attend this meeting on my behalf. Gather requirements. Do not make commitments. Ask clarifying questions when requirements are unclear.',
  stt_api_key: '',
  stt_model: 'saaras:v3',
  llm_provider: 'openai',
  llm_api_key: '',
  llm_model: 'gpt-4o-mini',
  tts_api_key: '',
  tts_voice_id: '71a7ad14-091c-4e8e-a314-022ece01c121',
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
  { value: 'gpt-4o', label: 'GPT-4o (capable)' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
]

export const CEREBRAS_MODELS = [
  { value: 'gpt-oss-120b', label: 'gpt-oss-120b (default)' },
  { value: 'llama3.3-70b', label: 'Llama 3.3 70B' },
  { value: 'llama3.1-8b', label: 'Llama 3.1 8B (fast)' },
]

export const SARVAM_MODELS = [
  { value: 'saaras:v3', label: 'Saaras v3 (auto-detect)' },
  { value: 'saarika:v2.5', label: 'Saarika v2.5' },
]

export const CARTESIA_VOICES = [
  { value: '71a7ad14-091c-4e8e-a314-022ece01c121', label: 'British Reading Lady' },
  { value: '79a125e8-cd45-4c13-8a67-188112f4dd22', label: 'Friendly Male' },
  { value: 'b7d50908-b17c-442d-ad8d-810c63997ed9', label: 'Professional Female' },
]
