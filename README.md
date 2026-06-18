# AI Meeting Delegate

A Pipecat-powered voice agent that attends Google Meet on your behalf.

```
Browser mic/speakers
        ↕  WebRTC (SmallWebRTCTransport)
  Pipecat server
    Sarvam STT  →  OpenAI / Cerebras LLM  →  Cartesia TTS
```

---

## Prerequisites

| Tool | Min version |
|------|-------------|
| Python | 3.11 |
| Node.js | 20 |
| uv (optional, recommended) | latest |

API keys needed:
- **Sarvam** — [sarvam.ai](https://sarvam.ai)
- **OpenAI** or **Cerebras** — [platform.openai.com](https://platform.openai.com) / [cloud.cerebras.ai](https://cloud.cerebras.ai)
- **Cartesia** — [cartesia.ai](https://cartesia.ai)

---

## Quick start

### 1. Backend

```bash
cd backend

# Create a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env (optional — keys can also be entered in the UI)
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

# Run
python main.py
# Server starts at http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App starts at http://localhost:5173
```

### 3. Use the app

1. Open **http://localhost:5173**
2. Fill in the Google Meet URL, agent name, and instructions
3. Enter your API keys for Sarvam, OpenAI/Cerebras, and Cartesia
4. Click **Start Agent**
5. Allow microphone access in the browser
6. The agent will introduce itself and start listening

---

## Google Meet audio routing

The agent runs in your browser and uses your default microphone and speakers.
To pipe Google Meet audio through it you need a **virtual audio cable**:

### Windows — VB-Cable
1. Download from [vb-audio.com](https://vb-audio.com/Cable/)
2. In Google Meet settings → Microphone: **CABLE Output (VB-Audio)**
3. In your browser (this app) → Microphone: **CABLE Input (VB-Audio)**
4. This app's speaker output → your real speakers (Google Meet participants hear the TTS)

### macOS — BlackHole
1. Install: `brew install blackhole-2ch`
2. Use Audio MIDI Setup to create an aggregate device
3. Route Google Meet audio through BlackHole to this app

---

## Project structure

```
meetings/
├── backend/
│   ├── bot.py          # Pipecat pipeline (STT → LLM → TTS)
│   ├── main.py         # FastAPI server (WebRTC offer endpoint)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.tsx                    # Root component + Pipecat client
    │   ├── types.ts                   # Shared types + default config
    │   └── components/
    │       ├── ConfigForm.tsx          # API keys + provider selection
    │       ├── AgentPanel.tsx          # Status + start/stop controls
    │       └── TranscriptView.tsx      # Live conversation transcript
    ├── index.html
    └── package.json
```

---

## Pipeline details

```
transport.input()           ← WebRTC audio in from browser
  → SarvamSTTService        ← speech-to-text (saaras:v3, auto-detect language)
  → user_aggregator         ← VAD (Silero) + context window management
  → OpenAILLMService        ← (or CerebrasLLMService) text generation
  → CartesiaTTSService      ← text-to-speech
  → transport.output()      ← WebRTC audio out to browser
  → assistant_aggregator    ← records bot utterances in context
```

VAD (Voice Activity Detection) is handled by **Silero** inside the user aggregator.
Interruptions are supported — the user can speak while the bot is talking.

---

## Customising the voice

Cartesia voice IDs can be found at [cartesia.ai/voices](https://cartesia.ai/voices).
Paste any voice ID into the **Voice** field in the UI.

Default voice: **71a7ad14-091c-4e8e-a314-022ece01c121** (British Reading Lady)

---

## Environment variables (optional)

```
SARVAM_API_KEY=
OPENAI_API_KEY=
CEREBRAS_API_KEY=
CARTESIA_API_KEY=
HOST=localhost
PORT=8000
```

These are only used as server-side defaults. Keys entered in the UI always take precedence.
