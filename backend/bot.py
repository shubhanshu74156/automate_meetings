"""
Pipecat meeting delegate bot.

Pipeline:
  transport.input()
    → STTInputGate           (drops mic audio while bot is speaking)
    → STT service            (speech → text; sarvam / openai / deepgram / groq)
    → user_aggregator        (VAD + context window)
    → LLM service            (text → text; openai / cerebras / anthropic / google / groq / together)
    → TTS service            (text → speech; cartesia / openai / deepgram / elevenlabs / groq)
    → VBCableOutput          (mirrors TTS audio → CABLE Input → Google Meet mic)
    → transport.output()
    → assistant_aggregator   (records bot utterances)
"""

from __future__ import annotations

import asyncio
import queue
import threading

try:
    import audioop  # stdlib; IDE may not resolve but it's present at runtime
    _AUDIOOP_OK = True
except ImportError:
    _AUDIOOP_OK = False

from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import (
    AudioRawFrame,
    BotStartedSpeakingFrame,
    BotStoppedSpeakingFrame,
    Frame,
    LLMRunFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.cerebras.llm import CerebrasLLMService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.openai.stt import OpenAISTTService
from pipecat.services.openai.tts import OpenAITTSService
from pipecat.services.sarvam.stt import SarvamSTTService

try:
    from pipecat.services.deepgram.stt import DeepgramSTTService
    from pipecat.services.deepgram.tts import DeepgramTTSService
    _DEEPGRAM_OK = True
except ImportError:
    _DEEPGRAM_OK = False

try:
    from pipecat.services.groq.stt import GroqSTTService
    from pipecat.services.groq.llm import GroqLLMService
    from pipecat.services.groq.tts import GroqTTSService
    _GROQ_OK = True
except ImportError:
    _GROQ_OK = False

try:
    from pipecat.services.anthropic.llm import AnthropicLLMService
    _ANTHROPIC_OK = True
except ImportError:
    _ANTHROPIC_OK = False

try:
    from pipecat.services.google.llm import GoogleLLMService
    _GOOGLE_OK = True
except ImportError:
    _GOOGLE_OK = False

try:
    from pipecat.services.together.llm import TogetherLLMService
    _TOGETHER_OK = True
except ImportError:
    _TOGETHER_OK = False

try:
    from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
    _ELEVENLABS_OK = True
except ImportError:
    _ELEVENLABS_OK = False
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.workers.runner import WorkerRunner

try:
    import sounddevice as sd
    _SD_OK = True
except ImportError:
    _SD_OK = False
    logger.warning("sounddevice not installed — TTS won't reach Google Meet mic (run: pip install sounddevice)")


# ---------------------------------------------------------------------------
# STT input gate — suppresses mic audio while the bot is speaking
# ---------------------------------------------------------------------------

class STTInputGate(FrameProcessor):
    """
    Sits between transport.input() and SarvamSTT.
    BotStartedSpeakingFrame / BotStoppedSpeakingFrame travel UPSTREAM through
    the pipeline (pushed by transport.output()), so this gate sees them and can
    drop incoming AudioRawFrames while the bot's TTS is playing — breaking the
    VB-Cable echo feedback loop.

    A cooldown keeps the gate closed for `cooldown_secs` after the bot stops
    speaking, so VB-Cable's trailing buffer drains before STT resumes.
    """

    def __init__(self, cooldown_secs: float = 2.0):
        super().__init__()
        self._bot_speaking = False
        self._cooldown_secs = cooldown_secs
        self._cooldown_task: asyncio.Task | None = None

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, BotStartedSpeakingFrame):
            self._bot_speaking = True
            if self._cooldown_task:
                self._cooldown_task.cancel()
                self._cooldown_task = None
            logger.debug("STTInputGate: muting mic (bot speaking)")
        elif isinstance(frame, BotStoppedSpeakingFrame):
            logger.debug(f"STTInputGate: bot stopped — {self._cooldown_secs}s cooldown before unmute")
            if self._cooldown_task:
                self._cooldown_task.cancel()
            self._cooldown_task = asyncio.create_task(self._unmute_after_cooldown())

        if (isinstance(frame, AudioRawFrame)
                and direction == FrameDirection.DOWNSTREAM
                and self._bot_speaking):
            return  # swallow — do not forward to STT

        await self.push_frame(frame, direction)

    async def _unmute_after_cooldown(self):
        await asyncio.sleep(self._cooldown_secs)
        self._bot_speaking = False
        self._cooldown_task = None
        logger.debug("STTInputGate: cooldown done — unmuting mic")


# ---------------------------------------------------------------------------
# VB-Cable output — mirrors TTS audio frames to CABLE Input
# ---------------------------------------------------------------------------

class VBCableOutput(FrameProcessor):
    """
    Sits in the pipeline after the TTS service.
    Each AudioRawFrame is written to a sounddevice RawOutputStream pointed at
    'CABLE Input (VB-Audio Virtual Cable)', which flows out of 'CABLE Output'
    — the device Google Meet uses as the bot's microphone.
    Audio is written in a background thread so the async pipeline never blocks.
    """

    def __init__(self, device_name: str = "CABLE Input"):
        super().__init__()
        self._device_idx: int | None = self._find_device(device_name) if _SD_OK else None
        self._stream: sd.RawOutputStream | None = None
        self._write_queue: queue.Queue = queue.Queue(maxsize=200)
        self._worker_thread: threading.Thread | None = None

    # ── Device lookup ─────────────────────────────────────────────────────────

    def _find_device(self, name: str) -> int | None:
        try:
            for i, d in enumerate(sd.query_devices()):
                if name.lower() in d["name"].lower() and d["max_output_channels"] > 0:
                    logger.info(f"VBCableOutput: using '{d['name']}' (device index {i})")
                    return i
        except Exception as e:
            logger.warning(f"VBCableOutput: device query failed — {e}")
        logger.warning(f"VBCableOutput: '{name}' not found — TTS audio won't reach Google Meet")
        return None

    # ── Background writer thread ──────────────────────────────────────────────

    def _writer(self):
        """Drains the queue and writes PCM bytes into the sounddevice stream."""
        native_rate: int = 0
        ratecv_state = None
        while True:
            item = self._write_queue.get()
            if item is None:           # poison pill → stop
                break
            audio_bytes, sample_rate, channels = item
            try:
                if self._stream is None or self._stream.closed:
                    # Open at the device's native rate to avoid pitch shift.
                    # Writing 16 kHz audio to a 48 kHz device at the wrong rate
                    # plays back at 16/48 speed → male-sounding voice.
                    dev = sd.query_devices(self._device_idx)
                    native_rate = int(dev["default_samplerate"])
                    self._stream = sd.RawOutputStream(
                        device=self._device_idx,
                        samplerate=native_rate,
                        channels=channels,
                        dtype="int16",
                        latency="low",
                    )
                    self._stream.start()
                    logger.info(
                        f"VBCableOutput: stream opened "
                        f"(device {native_rate}Hz, input {sample_rate}Hz, {channels}ch)"
                    )
                    ratecv_state = None

                # Resample from pipeline rate to device native rate if they differ
                if _AUDIOOP_OK and sample_rate != native_rate:
                    audio_bytes, ratecv_state = audioop.ratecv(
                        audio_bytes, 2, channels, sample_rate, native_rate, ratecv_state
                    )

                self._stream.write(audio_bytes)
            except Exception as e:
                logger.debug(f"VBCableOutput write error: {e}")
                self._stream = None
                ratecv_state = None

    # ── FrameProcessor interface ──────────────────────────────────────────────

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, AudioRawFrame) and self._device_idx is not None:
            # Start the writer thread lazily on the first audio frame
            if self._worker_thread is None or not self._worker_thread.is_alive():
                self._worker_thread = threading.Thread(target=self._writer, daemon=True)
                self._worker_thread.start()

            try:
                self._write_queue.put_nowait(
                    (frame.audio, frame.sample_rate, frame.num_channels)
                )
            except queue.Full:
                pass  # drop frame rather than block the pipeline

        await self.push_frame(frame, direction)

    async def cleanup(self):
        """Stop the background thread and close the stream on shutdown."""
        self._write_queue.put(None)
        if self._worker_thread:
            self._worker_thread.join(timeout=2)
        if self._stream and not self._stream.closed:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Service builders
# ---------------------------------------------------------------------------

def build_stt(config: dict):
    provider = config.get("stt_provider", "sarvam").lower()
    api_key = config.get("stt_api_key", "")
    model = config.get("stt_model", "")

    if provider == "openai":
        return OpenAISTTService(
            api_key=api_key,
            settings=OpenAISTTService.Settings(model=model or "gpt-4o-transcribe"),
        )

    if provider == "deepgram":
        if not _DEEPGRAM_OK:
            raise RuntimeError("Deepgram extras not installed — run: pip install 'pipecat-ai[deepgram]'")
        return DeepgramSTTService(
            api_key=api_key,
            settings=DeepgramSTTService.Settings(model=model or "nova-3-general"),
        )

    if provider == "groq":
        if not _GROQ_OK:
            raise RuntimeError("Groq extras not installed — run: pip install 'pipecat-ai[groq]'")
        return GroqSTTService(
            api_key=api_key,
            settings=GroqSTTService.Settings(model=model or "whisper-large-v3-turbo"),
        )

    # default: sarvam
    return SarvamSTTService(
        api_key=api_key,
        settings=SarvamSTTService.Settings(model=model or "saaras:v3"),
    )


_LLM_DEFAULTS: dict[str, str] = {
    "openai": "gpt-4o-mini",
    "cerebras": "gpt-oss-120b",
    "anthropic": "claude-sonnet-4-6",
    "google": "gemini-2.0-flash-001",
    "groq": "llama-3.3-70b-versatile",
    "together": "openai/gpt-oss-20b",
}


def build_llm(config: dict):
    system_prompt = _make_system_prompt(config)
    provider = config.get("llm_provider", "openai").lower()
    model = config.get("llm_model", "") or _LLM_DEFAULTS.get(provider, "gpt-4o-mini")
    api_key = config.get("llm_api_key", "")

    if provider == "cerebras":
        return CerebrasLLMService(
            api_key=api_key,
            settings=CerebrasLLMService.Settings(model=model, system_instruction=system_prompt),
        )

    if provider == "anthropic":
        if not _ANTHROPIC_OK:
            raise RuntimeError("Anthropic extras not installed — run: pip install 'pipecat-ai[anthropic]'")
        return AnthropicLLMService(
            api_key=api_key,
            settings=AnthropicLLMService.Settings(model=model, system_instruction=system_prompt),
        )

    if provider == "google":
        if not _GOOGLE_OK:
            raise RuntimeError("Google extras not installed — run: pip install 'pipecat-ai[google]'")
        return GoogleLLMService(
            api_key=api_key,
            settings=GoogleLLMService.Settings(model=model, system_instruction=system_prompt),
        )

    if provider == "groq":
        if not _GROQ_OK:
            raise RuntimeError("Groq extras not installed — run: pip install 'pipecat-ai[groq]'")
        return GroqLLMService(
            api_key=api_key,
            settings=GroqLLMService.Settings(model=model, system_instruction=system_prompt),
        )

    if provider == "together":
        if not _TOGETHER_OK:
            raise RuntimeError("Together extras not installed — run: pip install 'pipecat-ai[together]'")
        return TogetherLLMService(
            api_key=api_key,
            settings=TogetherLLMService.Settings(model=model, system_instruction=system_prompt),
        )

    # default: openai
    return OpenAILLMService(
        api_key=api_key,
        settings=OpenAILLMService.Settings(model=model, system_instruction=system_prompt),
    )


def build_tts(config: dict):
    provider = config.get("tts_provider", "cartesia").lower()
    api_key = config.get("tts_api_key", "")
    voice = config.get("tts_voice_id", "")
    tts_model = config.get("tts_model", "")

    if provider == "openai":
        return OpenAITTSService(
            api_key=api_key,
            settings=OpenAITTSService.Settings(
                voice=voice or "alloy",
                model=tts_model or "gpt-4o-mini-tts",
            ),
        )

    if provider == "deepgram":
        if not _DEEPGRAM_OK:
            raise RuntimeError("Deepgram extras not installed — run: pip install 'pipecat-ai[deepgram]'")
        return DeepgramTTSService(
            api_key=api_key,
            settings=DeepgramTTSService.Settings(voice=voice or "aura-2-helena-en"),
        )

    if provider == "elevenlabs":
        if not _ELEVENLABS_OK:
            raise RuntimeError("ElevenLabs extras not installed — run: pip install 'pipecat-ai[elevenlabs]'")
        return ElevenLabsTTSService(
            api_key=api_key,
            settings=ElevenLabsTTSService.Settings(
                voice=voice or "21m00Tcm4TlvDq8ikWAM",
                model=tts_model or "eleven_flash_v2_5",
            ),
        )

    if provider == "groq":
        if not _GROQ_OK:
            raise RuntimeError("Groq extras not installed — run: pip install 'pipecat-ai[groq]'")
        return GroqTTSService(
            api_key=api_key,
            settings=GroqTTSService.Settings(
                voice=voice or "autumn",
                model=tts_model or "canopylabs/orpheus-v1-english",
            ),
        )

    # default: cartesia
    return CartesiaTTSService(
        api_key=api_key,
        settings=CartesiaTTSService.Settings(
            voice=voice or "71a7ad14-091c-4e8e-a314-022ece01c121",
        ),
    )


def _make_system_prompt(config: dict) -> str:
    name = config.get("agent_name", "AI Delegate")
    instructions = config.get("instructions", "Attend this meeting on my behalf.")

    return (
        f"You are {name}, a voice AI meeting delegate.\n\n"
        "IMPORTANT: You are ALREADY live and connected in a voice call right now. "
        "You are NOT being asked to join anything — you are already in the meeting, "
        "listening through a microphone and speaking through a speaker via text-to-speech. "
        "Do not mention meeting URLs, links, or say you cannot join anything.\n\n"
        f"Your instructions from the user:\n{instructions}\n\n"
        "Rules:\n"
        "- This is a VOICE conversation. Never use markdown, bullet points, or emojis.\n"
        "- Keep responses to 1-3 sentences unless more detail is asked for.\n"
        "- When you cannot commit to timelines or decisions, say you will relay it to the user.\n"
        "- Ask short, focused clarifying questions when requirements are unclear.\n"
        f"- You are {name}. Identify yourself when it helps clarity."
    )


# ---------------------------------------------------------------------------
# Main bot runner
# ---------------------------------------------------------------------------

async def run_bot(webrtc_connection: SmallWebRTCConnection, config: dict) -> None:
    """Create the Pipecat pipeline and run it for one WebRTC session."""

    logger.info(
        f"Bot starting — agent={config.get('agent_name')} "
        f"stt={config.get('stt_provider', 'sarvam')} "
        f"llm={config.get('llm_provider', 'openai')} "
        f"tts={config.get('tts_provider', 'cartesia')}"
    )

    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=TransportParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            audio_out_sample_rate=48000,  # Cartesia outputs 48kHz → matches VB-Cable native rate
        ),
    )

    stt = build_stt(config)
    llm = build_llm(config)
    tts = build_tts(config)
    stt_gate = STTInputGate()  # mutes mic while bot is speaking → breaks echo loop
    vb_out = VBCableOutput()   # writes TTS audio → CABLE Input → Google Meet mic

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt_gate,            # ← drops mic audio while bot speaks
            stt,
            user_aggregator,
            llm,
            tts,
            vb_out,              # ← taps TTS frames to VB-Cable before WebRTC
            transport.output(),
            assistant_aggregator,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @transport.event_handler("on_client_connected")
    async def on_connected(transport, client):
        agent_name = config.get("agent_name", "AI Delegate")
        context.add_message(
            {
                "role": "developer",
                "content": (
                    f"You are now live. Say a single short sentence introducing yourself as {agent_name} "
                    "and that you are listening. Do not mention URLs, links, or joining anything."
                ),
            }
        )
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(transport, client):
        logger.info("Client disconnected — cancelling worker")
        await worker.cancel()

    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)
    await runner.run()
    logger.info("Bot session ended")
