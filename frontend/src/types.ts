export type STTProvider = 'sarvam' | 'openai' | 'deepgram' | 'groq'
export type LLMProvider = 'openai' | 'cerebras' | 'anthropic' | 'google' | 'groq' | 'together'
export type TTSProvider = 'cartesia' | 'openai' | 'deepgram' | 'elevenlabs' | 'groq'

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
  stt_provider: STTProvider
  stt_api_key: string
  stt_model: string
  // LLM
  llm_provider: LLMProvider
  llm_api_key: string
  llm_model: string
  // TTS
  tts_provider: TTSProvider
  tts_api_key: string
  tts_voice_id: string
  tts_model: string
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
  stt_provider: 'sarvam',
  stt_api_key: '',
  stt_model: 'saaras:v3',
  llm_provider: 'openai',
  llm_api_key: '',
  llm_model: 'gpt-4o-mini',
  tts_provider: 'cartesia',
  tts_api_key: '',
  tts_voice_id: '71a7ad14-091c-4e8e-a314-022ece01c121',
  tts_model: '',
}

// ── STT ──────────────────────────────────────────────────────────────────────

export const STT_PROVIDERS: { value: STTProvider; label: string }[] = [
  { value: 'sarvam', label: 'Sarvam' },
  { value: 'openai', label: 'OpenAI (Whisper)' },
  { value: 'deepgram', label: 'Deepgram' },
  { value: 'groq', label: 'Groq (Whisper)' },
]

export const STT_MODELS: Record<STTProvider, { value: string; label: string }[]> = {
  sarvam: [
    { value: 'saaras:v3', label: 'Saaras v3 (auto-detect)' },
    { value: 'saarika:v2.5', label: 'Saarika v2.5' },
  ],
  openai: [
    { value: 'gpt-4o-transcribe', label: 'GPT-4o Transcribe' },
    { value: 'gpt-4o-mini-transcribe', label: 'GPT-4o Mini Transcribe (fast)' },
    { value: 'whisper-1', label: 'Whisper-1' },
  ],
  deepgram: [
    { value: 'nova-3-general', label: 'Nova 3 General' },
    { value: 'nova-2-general', label: 'Nova 2 General' },
    { value: 'nova-2-phonecall', label: 'Nova 2 Phone Call' },
  ],
  groq: [
    { value: 'whisper-large-v3-turbo', label: 'Whisper Large v3 Turbo' },
    { value: 'whisper-large-v3', label: 'Whisper Large v3' },
    { value: 'distil-whisper-large-v3-en', label: 'Distil-Whisper Large v3 (EN)' },
  ],
}

// ── LLM ──────────────────────────────────────────────────────────────────────

export const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'groq', label: 'Groq' },
  { value: 'together', label: 'Together AI' },
]

export const LLM_MODELS: Record<LLMProvider, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  cerebras: [
    { value: 'gpt-oss-120b', label: 'gpt-oss-120b (fast)' },
    { value: 'llama3.3-70b', label: 'Llama 3.3 70B' },
    { value: 'llama3.1-8b', label: 'Llama 3.1 8B (fastest)' },
  ],
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
    { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (powerful)' },
  ],
  google: [
    { value: 'gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { value: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
    { value: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 Instruct' },
  ],
  together: [
    { value: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B' },
    { value: 'meta-llama/Llama-3-70b-chat-hf', label: 'Llama 3 70B Chat' },
    { value: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B Instruct' },
  ],
}

// ── TTS ──────────────────────────────────────────────────────────────────────

export const TTS_PROVIDERS: { value: TTSProvider; label: string }[] = [
  { value: 'cartesia', label: 'Cartesia' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepgram', label: 'Deepgram Aura' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'groq', label: 'Groq (Orpheus)' },
]

export const TTS_VOICES: Record<TTSProvider, { value: string; label: string }[]> = {
  cartesia: [
    { value: '71a7ad14-091c-4e8e-a314-022ece01c121', label: 'British Reading Lady' },
    { value: '79a125e8-cd45-4c13-8a67-188112f4dd22', label: 'Friendly Male' },
    { value: 'b7d50908-b17c-442d-ad8d-810c63997ed9', label: 'Professional Female' },
  ],
  openai: [
    { value: 'alloy', label: 'Alloy (neutral)' },
    { value: 'nova', label: 'Nova (female)' },
    { value: 'shimmer', label: 'Shimmer (female)' },
    { value: 'echo', label: 'Echo (male)' },
    { value: 'fable', label: 'Fable (male)' },
    { value: 'onyx', label: 'Onyx (male)' },
  ],
  deepgram: [
    { value: 'aura-2-helena-en', label: 'Helena (female)' },
    { value: 'aura-2-stella-en', label: 'Stella (female)' },
    { value: 'aura-2-orion-en', label: 'Orion (male)' },
    { value: 'aura-2-hades-en', label: 'Hades (male)' },
  ],
  elevenlabs: [
    { value: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (female)' },
    { value: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli (female)' },
    { value: '29vD33N1CtxCmqQRPOHJ', label: 'Drew (male)' },
    { value: '2EiwWnXFnvU5JabPnv8n', label: 'Clyde (male)' },
  ],
  groq: [
    { value: 'autumn', label: 'Autumn (female)' },
    { value: 'celeste', label: 'Celeste (female)' },
    { value: 'luna', label: 'Luna (female)' },
    { value: 'hudson', label: 'Hudson (male)' },
    { value: 'orion', label: 'Orion (male)' },
  ],
}

export const TTS_MODELS: Partial<Record<TTSProvider, { value: string; label: string }[]>> = {
  openai: [
    { value: 'gpt-4o-mini-tts', label: 'GPT-4o Mini TTS' },
    { value: 'tts-1', label: 'TTS-1' },
    { value: 'tts-1-hd', label: 'TTS-1 HD' },
  ],
  elevenlabs: [
    { value: 'eleven_flash_v2_5', label: 'Flash v2.5 (fastest)' },
    { value: 'eleven_turbo_v2_5', label: 'Turbo v2.5' },
    { value: 'eleven_multilingual_v2', label: 'Multilingual v2' },
  ],
  groq: [
    { value: 'canopylabs/orpheus-v1-english', label: 'Orpheus v1 English' },
  ],
}
