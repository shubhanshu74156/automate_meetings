"""
AI Meeting Delegate — FastAPI server

Endpoints:
  POST /api/config   store agent configuration (API keys, provider choices)
  GET  /api/config   read current configuration (keys redacted)
  POST /api/offer    WebRTC SDP offer/answer (called by the frontend SDK)
  GET  /api/status   connection status
  GET  /health       liveness probe
"""

import asyncio
from contextlib import asynccontextmanager

import uvicorn
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from aiortc.sdp import candidate_from_sdp
from pipecat.transports.smallwebrtc.connection import IceServer, SmallWebRTCConnection

from bot import run_bot

load_dotenv()

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

_config: dict = {}
pcs_map: dict[str, SmallWebRTCConnection] = {}

ICE_SERVERS = [IceServer(urls="stun:stun.l.google.com:19302")]


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Meeting Delegate starting up")
    yield
    logger.info("Shutting down — closing WebRTC connections")
    await asyncio.gather(*(pc.disconnect() for pc in pcs_map.values()), return_exceptions=True)
    pcs_map.clear()


app = FastAPI(title="AI Meeting Delegate", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

@app.post("/api/config")
async def set_config(body: dict):
    global _config
    _config = body
    logger.info(
        f"Config saved — agent={body.get('agent_name')} "
        f"llm={body.get('llm_provider')} model={body.get('llm_model')}"
    )
    return {"status": "ok"}


@app.get("/api/config")
async def get_config():
    return {k: ("***" if k.endswith("_key") else v) for k, v in _config.items()}


# ---------------------------------------------------------------------------
# WebRTC offer  (SmallWebRTCTransport handshake — called by the frontend SDK)
# ---------------------------------------------------------------------------

@app.post("/api/offer")
async def offer(request: dict, background_tasks: BackgroundTasks):
    if not _config:
        raise HTTPException(status_code=400, detail="POST /api/config first.")

    connection = SmallWebRTCConnection(ICE_SERVERS)
    await connection.initialize(sdp=request["sdp"], type=request["type"])

    @connection.event_handler("closed")
    async def on_closed(conn: SmallWebRTCConnection):
        pcs_map.pop(conn.pc_id, None)

    background_tasks.add_task(run_bot, connection, dict(_config))

    answer = connection.get_answer()
    pcs_map[answer["pc_id"]] = connection
    return answer


@app.patch("/api/offer")
async def ice_candidates(request: dict):
    """ICE candidate trickling — adds remote candidates to an existing peer connection."""
    pc_id = request.get("pc_id")
    if not pc_id or pc_id not in pcs_map:
        raise HTTPException(status_code=404, detail=f"Unknown pc_id: {pc_id!r}")

    connection = pcs_map[pc_id]
    for c in request.get("candidates", []):
        candidate_str = c.get("candidate", "")
        if not candidate_str:
            continue  # empty string = end-of-candidates signal, safe to skip
        if candidate_str.startswith("candidate:"):
            candidate_str = candidate_str[len("candidate:"):]
        candidate = candidate_from_sdp(candidate_str)
        # JS SDK sends camelCase; accept both
        candidate.sdpMid = c.get("sdpMid") or c.get("sdp_mid", "")
        candidate.sdpMLineIndex = c.get("sdpMLineIndex") or c.get("sdp_mline_index", 0)
        await connection.add_ice_candidate(candidate)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Status / health
# ---------------------------------------------------------------------------

@app.get("/api/status")
async def status():
    return {
        "active_connections": len(pcs_map),
        "config_loaded": bool(_config),
        "agent_name": _config.get("agent_name"),
        "llm_provider": _config.get("llm_provider"),
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
