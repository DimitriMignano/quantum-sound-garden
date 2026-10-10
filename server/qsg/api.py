"""FastAPI server for the standalone app and local development.

    uvicorn qsg.api:app --port 8765 --reload   (from server/)

Endpoints (all JSON):
    GET  /api/health              -> {ok, version, ionq_key_present}
    GET  /api/backends            -> [BackendInfo]
    POST /api/ideal               {n_qubits, ops}                         -> ideal + code + qasm
    POST /api/run                 {n_qubits, ops, shots, backend_id, seed?} -> RunResult
If ../web/dist exists it is served at / so one process can host the whole standalone app.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import backends as B
from . import circuit as C

VERSION = "0.1.0"
app = FastAPI(title="Quantum Sound Garden", version=VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type"],
)


class CircuitBody(BaseModel):
    n_qubits: int = Field(ge=1, le=C.MAX_QUBITS)
    ops: list[dict[str, Any]]


class RunBody(CircuitBody):
    shots: int = Field(default=256, ge=1, le=10000)
    backend_id: str = "local-ideal"
    seed: int | None = None


@app.get("/api/health")
def health():
    return {"ok": True, "version": VERSION, "ionq_key_present": B.ionq_key_present()}


@app.get("/api/backends")
def backends():
    return [b.__dict__ for b in B.list_backends()]


@app.post("/api/ideal")
def ideal(body: CircuitBody):
    try:
        out = C.ideal(body.n_qubits, body.ops)
        out["qiskit_code"] = C.qiskit_code(body.n_qubits, body.ops)
        out["qasm"] = C.qasm(body.n_qubits, body.ops)
        return out
    except C.CircuitError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/run")
def run(body: RunBody):
    try:
        return B.run(body.backend_id, body.n_qubits, body.ops, body.shots, body.seed).to_dict()
    except C.CircuitError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


_dist = Path(__file__).resolve().parent.parent.parent / "web" / "dist"
if _dist.is_dir():  # production: serve the built app from the same process
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="web")
