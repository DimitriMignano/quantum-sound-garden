"""Backend abstraction for the standalone/dev server (NOT used inside Qollab, where Qollab picks the backend).

  local-ideal       Qiskit Aer, exact gates, shot noise only
  local-noisy       Qiskit Aer with a depolarizing + readout noise model (two presets, see NOISE_PRESETS)
  ionq-ideal        IonQ cloud simulator through qiskit-ionq (needs IONQ_API_KEY)
  ionq-noisy        IonQ cloud simulator with IonQ's own noise model of a QPU (needs IONQ_API_KEY)

Every RunResult says which backend actually produced it. When an IonQ backend is requested and cannot run
(no key, network, timeout, API error) the run falls back to local-ideal and the result carries
`fallback_from` + `fallback_reason` so the UI can say so. Nothing here ever labels local output as IonQ.
"""
from __future__ import annotations

import concurrent.futures
import os
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from qiskit import transpile
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, ReadoutError, depolarizing_error

from . import circuit as C

try:  # .env is optional; qiskit-ionq also reads IONQ_API_KEY from the environment itself
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:  # pragma: no cover
    pass


# Noise presets. Numbers are ours, chosen from IonQ's PUBLISHED Aria-class figures (1-qubit gate fidelity about
# 99.95%, 2-qubit about 99.4%, state preparation and measurement about 99.5%). They are not an official IonQ model.
# "teaching" is exaggerated on purpose (roughly 20x) so a two-gate circuit audibly differs from a ten-gate one.
NOISE_PRESETS: dict[str, dict[str, float]] = {
    "ionq-inspired": {"p1": 0.0005, "p2": 0.006, "readout": 0.005},
    "teaching": {"p1": 0.02, "p2": 0.10, "readout": 0.03},
}
ONE_QUBIT_GATES = ["x", "h", "p", "rz", "ry", "rx", "sx", "s", "sdg", "u", "u1", "u2", "u3", "id", "z"]
TWO_QUBIT_GATES = ["cx", "cz", "swap"]


def make_noise_model(preset: str) -> NoiseModel:
    cfg = NOISE_PRESETS[preset]
    nm = NoiseModel()
    nm.add_all_qubit_quantum_error(depolarizing_error(cfg["p1"], 1), ONE_QUBIT_GATES)
    nm.add_all_qubit_quantum_error(depolarizing_error(cfg["p2"], 2), TWO_QUBIT_GATES)
    r = cfg["readout"]
    nm.add_all_qubit_readout_error(ReadoutError([[1 - r, r], [r, 1 - r]]))
    return nm


@dataclass
class BackendInfo:
    id: str
    label: str
    kind: str  # local-ideal | local-noisy | ionq-ideal | ionq-noisy
    produced_by: str  # "qiskit-aer" | "qiskit-ionq"
    noisy: bool
    remote: bool
    available: bool
    reason: str | None = None
    noise_preset: str | None = None
    noise_model: str | None = None


@dataclass
class RunResult:
    counts: dict[str, int]
    shots: int
    counts_kind: str
    backend: BackendInfo
    elapsed_ms: int
    fallback_from: str | None = None
    fallback_reason: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["distribution"] = C.distribution(self.counts)
        return d


def ionq_key_present() -> bool:
    return bool(os.getenv("IONQ_API_KEY") or os.getenv("QISKIT_IONQ_API_TOKEN") or os.getenv("IONQ_API_TOKEN"))


def ionq_noise_model_name() -> str:
    return os.getenv("IONQ_NOISE_MODEL", "forte-1")


def list_backends() -> list[BackendInfo]:
    key = ionq_key_present()
    reason = None if key else "IONQ_API_KEY is not set (see server/.env.example)"
    return [
        BackendInfo("local-ideal", "Local Qiskit simulator (Aer, ideal)", "local-ideal", "qiskit-aer", False, False, True),
        BackendInfo(
            "local-noisy-teaching",
            "Local Qiskit simulator with teaching noise (exaggerated)",
            "local-noisy",
            "qiskit-aer",
            True,
            False,
            True,
            noise_preset="teaching",
        ),
        BackendInfo(
            "local-noisy-ionq-inspired",
            "Local Qiskit simulator with IonQ-inspired noise",
            "local-noisy",
            "qiskit-aer",
            True,
            False,
            True,
            noise_preset="ionq-inspired",
        ),
        BackendInfo("ionq-ideal", "IonQ cloud simulator (ideal)", "ionq-ideal", "qiskit-ionq", False, True, key, reason),
        BackendInfo(
            "ionq-noisy",
            f"IonQ cloud simulator, {ionq_noise_model_name()} noise model",
            "ionq-noisy",
            "qiskit-ionq",
            True,
            True,
            key,
            reason,
            noise_model=ionq_noise_model_name(),
        ),
    ]


def get_backend_info(backend_id: str) -> BackendInfo:
    for b in list_backends():
        if b.id == backend_id:
            return b
    raise C.CircuitError(f"unknown backend '{backend_id}'")


# --- local (Aer) -------------------------------------------------------------------------------------------------
_AER_CACHE: dict[str, AerSimulator] = {}


def _aer(preset: str | None) -> AerSimulator:
    key = preset or "ideal"
    if key not in _AER_CACHE:
        _AER_CACHE[key] = AerSimulator(noise_model=make_noise_model(preset)) if preset else AerSimulator()
    return _AER_CACHE[key]


def run_local(n_qubits: int, ops: Any, shots: int, preset: str | None = None, seed: int | None = None) -> tuple[dict, str]:
    qc = C.build_circuit(n_qubits, ops, measure=True)
    sim = _aer(preset)
    tqc = transpile(qc, sim, optimization_level=0)  # keep the learner's gates as written: noise counts each one
    result = sim.run(tqc, shots=shots, seed_simulator=seed).result()
    return C.normalize_counts(result.get_counts(), n_qubits, shots)


# --- IonQ (qiskit-ionq) ------------------------------------------------------------------------------------------
def _ionq_timeout() -> float:
    try:
        return float(os.getenv("IONQ_TIMEOUT_SECONDS", "90"))
    except ValueError:
        return 90.0


def run_ionq(n_qubits: int, ops: Any, shots: int, noise_model: str | None) -> tuple[dict, str, dict]:
    """Run on IonQ's cloud simulator. Raises on any failure; the caller decides about fallback."""
    from qiskit_ionq import IonQProvider

    provider = IonQProvider()  # reads IONQ_API_KEY
    backend = provider.get_backend("simulator")
    if noise_model:
        backend.set_options(noise_model=noise_model)
    qc = C.build_circuit(n_qubits, ops, measure=True)

    def _go():
        job = backend.run(qc, shots=shots)
        return job, job.result()

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        job, result = ex.submit(_go).result(timeout=_ionq_timeout())
    counts, kind = C.normalize_counts(result.get_counts(), n_qubits, shots)
    extra = {"job_id": getattr(job, "job_id", lambda: None)() if callable(getattr(job, "job_id", None)) else None}
    return counts, kind, extra


# --- the one entry point ------------------------------------------------------------------------------------------
def run(backend_id: str, n_qubits: int, ops: Any, shots: int, seed: int | None = None) -> RunResult:
    shots = max(1, min(int(shots), 10000))
    info = get_backend_info(backend_id)
    t0 = time.perf_counter()
    if info.kind.startswith("local"):
        counts, kind = run_local(n_qubits, ops, shots, info.noise_preset, seed)
        return RunResult(counts, shots, kind, info, int((time.perf_counter() - t0) * 1000))

    # IonQ path
    if not info.available:
        return _fallback(info, info.reason or "IonQ unavailable", n_qubits, ops, shots, seed, t0)
    try:
        counts, kind, extra = run_ionq(n_qubits, ops, shots, info.noise_model if info.kind == "ionq-noisy" else None)
        return RunResult(counts, shots, kind, info, int((time.perf_counter() - t0) * 1000), extra=extra)
    except concurrent.futures.TimeoutError:
        return _fallback(info, f"IonQ did not answer within {int(_ionq_timeout())} s", n_qubits, ops, shots, seed, t0)
    except Exception as e:  # network, auth, API errors: fall back honestly
        return _fallback(info, f"IonQ request failed: {type(e).__name__}: {_safe_message(e)}", n_qubits, ops, shots, seed, t0)


def _fallback(requested: BackendInfo, reason: str, n_qubits, ops, shots, seed, t0) -> RunResult:
    local = get_backend_info("local-ideal")
    counts, kind = run_local(n_qubits, ops, shots, None, seed)
    return RunResult(
        counts,
        shots,
        kind,
        local,
        int((time.perf_counter() - t0) * 1000),
        fallback_from=requested.id,
        fallback_reason=reason,
    )


def _safe_message(e: Exception) -> str:
    """Error text for the UI, with anything that looks like a token removed."""
    msg = str(e)[:200]
    key = os.getenv("IONQ_API_KEY")
    if key and key in msg:
        msg = msg.replace(key, "***")
    return msg
