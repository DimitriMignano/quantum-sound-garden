"""The circuit model: friendly garden actions -> a real Qiskit circuit -> ideal probabilities and code.

Pure and deterministic. Only `qiskit`, `numpy` and the standard library, so this exact file is copied into the
Qollab bundle (`qollab/qsg/circuit.py`) and called from JavaScript through Pyodide. Everything crosses the JS/Python
boundary as JSON strings, which avoids proxy conversions.

Vocabulary (the garden word -> the gate):
  flip   -> X          turn a seed over: |0> <-> |1>
  split  -> H          one path becomes two (superposition)
  twist  -> P(theta)   rotate the phase of the |1> path; theta = turns * 2*pi (half a turn = pi = Z)
  link   -> CX         control seed decides whether the target seed flips (entanglement when the control is split)
  bloom  -> measure    every seed is measured; the garden sounds the outcome

Bit order follows Qiskit: in the string '10', qubit 0 is the RIGHTMOST character.
"""
from __future__ import annotations

import json
import math
from typing import Any

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

MAX_QUBITS = 4
GATE_FOR = {"flip": "x", "split": "h", "twist": "p", "link": "cx"}

# Qiskit code comments shown to learners (the metaphor becomes the bridge, not the hiding place).
EXPLAIN = {
    "flip": "Swap (X gate): switches the track to its other sound, |0> becomes |1>",
    "split": "Shuffle (Hadamard): one path becomes two equal paths, a coin toss at Play",
    "twist": "Turn (phase gate): rotates the |1> path; silent until paths recombine",
    "link": "Sync (CNOT): the control track decides whether the target flips",
}


class CircuitError(ValueError):
    """A malformed op list. The message is safe to show to a user."""


def _as_ops(ops: Any) -> list[dict]:
    if isinstance(ops, str):
        try:
            ops = json.loads(ops)
        except json.JSONDecodeError as e:  # pragma: no cover - defensive
            raise CircuitError(f"ops is not valid JSON: {e}") from e
    if not isinstance(ops, list):
        raise CircuitError("ops must be a list")
    return ops


def turns_to_radians(turns: float) -> float:
    return float(turns) * 2.0 * math.pi


def validate(n_qubits: int, ops: Any) -> list[dict]:
    """Return the validated op list or raise CircuitError."""
    if not isinstance(n_qubits, int) or n_qubits < 1 or n_qubits > MAX_QUBITS:
        raise CircuitError(f"n_qubits must be between 1 and {MAX_QUBITS}")
    out: list[dict] = []
    for i, op in enumerate(_as_ops(ops)):
        if not isinstance(op, dict) or "op" not in op:
            raise CircuitError(f"op #{i} is not an object with an 'op' field")
        kind = op["op"]
        if kind not in GATE_FOR:
            raise CircuitError(f"op #{i}: unknown action '{kind}'")
        if kind == "link":
            c, t = op.get("control"), op.get("target")
            for name, q in (("control", c), ("target", t)):
                if not isinstance(q, int) or q < 0 or q >= n_qubits:
                    raise CircuitError(f"op #{i}: link {name} must be a seed index below {n_qubits}")
            if c == t:
                raise CircuitError(f"op #{i}: a seed cannot link to itself")
            out.append({"op": "link", "control": c, "target": t})
        else:
            q = op.get("q")
            if not isinstance(q, int) or q < 0 or q >= n_qubits:
                raise CircuitError(f"op #{i}: {kind} needs a seed index below {n_qubits}")
            if kind == "twist":
                turns = op.get("turns", 0.5)
                if not isinstance(turns, (int, float)) or not math.isfinite(turns):
                    raise CircuitError(f"op #{i}: twist turns must be a number")
                out.append({"op": "twist", "q": q, "turns": float(turns)})
            else:
                out.append({"op": kind, "q": q})
    if len(out) > 64:
        raise CircuitError("a garden holds at most 64 actions")
    return out


BASES = ("z", "x")


def build_circuit(n_qubits: int, ops: Any, measure: bool = True, basis: str = "z") -> QuantumCircuit:
    """Build the Qiskit circuit for a list of garden actions.

    basis "z" measures as usual; basis "x" ("Bloom sideways") applies H to every qubit first, so the
    measurement asks each seed a complementary question. A Bell pair stays perfectly correlated sideways; two
    classically correlated seeds do not.
    """
    if basis not in BASES:
        raise CircuitError("basis must be 'z' or 'x'")
    ops = validate(n_qubits, ops)
    qc = QuantumCircuit(n_qubits, n_qubits if measure else 0)
    for op in ops:
        kind = op["op"]
        if kind == "flip":
            qc.x(op["q"])
        elif kind == "split":
            qc.h(op["q"])
        elif kind == "twist":
            qc.p(turns_to_radians(op["turns"]), op["q"])
        elif kind == "link":
            qc.cx(op["control"], op["target"])
    if basis == "x":
        for q in range(n_qubits):
            qc.h(q)
    if measure:
        qc.measure(range(n_qubits), range(n_qubits))
    return qc


def bitstrings(n_qubits: int) -> list[str]:
    return [format(i, f"0{n_qubits}b") for i in range(2**n_qubits)]


def ideal(n_qubits: int, ops: Any, basis: str = "z") -> dict:
    """Exact statevector result before any measurement: probabilities and amplitudes per outcome (in `basis`)."""
    qc = build_circuit(n_qubits, ops, measure=False, basis=basis)
    sv = Statevector.from_instruction(qc)
    probs = sv.probabilities()
    amps = sv.data
    labels = bitstrings(n_qubits)
    return {
        "n_qubits": n_qubits,
        "basis": basis,
        "probabilities": {labels[i]: float(round(float(probs[i]), 12)) for i in range(len(labels))},
        "amplitudes": {
            labels[i]: [float(round(float(amps[i].real), 12)), float(round(float(amps[i].imag), 12))]
            for i in range(len(labels))
        },
        "depth": int(qc.depth()),
        "gate_count": int(sum(qc.count_ops().values())),
    }


def ideal_json(n_qubits: int, ops_json: str, basis: str = "z") -> str:
    return json.dumps(ideal(int(n_qubits), ops_json, basis))


def qiskit_code(n_qubits: int, ops: Any, shots: int = 256, basis: str = "z") -> str:
    """Readable Qiskit source that rebuilds the same circuit, for the code reveal."""
    if basis not in BASES:
        raise CircuitError("basis must be 'z' or 'x'")
    ops = validate(n_qubits, ops)
    lines = [
        "from qiskit import QuantumCircuit",
        "from qiskit.quantum_info import Statevector",
        "import math",
        "",
        f"qc = QuantumCircuit({n_qubits}, {n_qubits})   # {n_qubits} track{'s' if n_qubits != 1 else ''}, one classical bit each",
    ]
    for op in ops:
        kind = op["op"]
        if kind == "flip":
            lines.append(f"qc.x({op['q']})        # {EXPLAIN['flip']}")
        elif kind == "split":
            lines.append(f"qc.h({op['q']})        # {EXPLAIN['split']}")
        elif kind == "twist":
            lines.append(f"qc.p({_turns_expr(op['turns'])}, {op['q']})   # {EXPLAIN['twist']}")
        elif kind == "link":
            lines.append(f"qc.cx({op['control']}, {op['target']})    # {EXPLAIN['link']}")
    regs = ", ".join(str(i) for i in range(n_qubits))
    if basis == "x":
        for q in range(n_qubits):
            lines.append(f"qc.h({q})        # Play sideways: rotate track {q} into the X basis before measuring")
    lines += [
        f"qc.measure([{regs}], [{regs}])   # Play: measure every track",
        "",
        "# Ideal probabilities, before any shots:",
        "state = Statevector.from_instruction(qc.remove_final_measurements(inplace=False))",
        "print(state.probabilities_dict())",
        "",
        "# Run it. On Qollab `backend` is the device you picked; locally use AerSimulator().",
        f"job = backend.run(qc, shots={int(shots)})",
        "print(job.result().get_counts())",
    ]
    return "\n".join(lines) + "\n"


def _turns_expr(turns: float) -> str:
    """Write the phase as a friendly multiple of pi when it is one."""
    frac = turns * 2  # in units of pi
    for denom in (1, 2, 3, 4, 6, 8):
        num = frac * denom
        if abs(num - round(num)) < 1e-9:
            num = int(round(num))
            if num == 0:
                return "0"
            sign = "-" if num < 0 else ""
            num = abs(num)
            if denom == 1:
                return f"{sign}math.pi" if num == 1 else f"{sign}{num} * math.pi"
            return f"{sign}math.pi / {denom}" if num == 1 else f"{sign}{num} * math.pi / {denom}"
    return f"{turns_to_radians(turns):.6f}"


def qasm(n_qubits: int, ops: Any) -> str:
    from qiskit.qasm2 import dumps

    return dumps(build_circuit(n_qubits, ops, measure=True))


def normalize_counts(raw: Any, n_qubits: int, shots: int) -> tuple[dict[str, int], str]:
    """Turn whatever a backend's get_counts returned into {bitstring: int} over every outcome.

    Returns (counts, kind) where kind is 'counts' (integers that sum to shots) or 'probabilities' (the IonQ ideal
    simulator returns exact probabilities; they are scaled to `shots` with largest-remainder rounding, so the
    distribution is exact and carries NO shot noise — the UI says so).
    """
    if hasattr(raw, "items"):
        items = list(raw.items())
    else:
        raise CircuitError("backend returned counts in an unknown shape")
    labels = bitstrings(n_qubits)
    acc: dict[str, float] = {k: 0.0 for k in labels}
    for key, value in items:
        k = str(key).replace(" ", "")
        if k.startswith("0x"):
            k = format(int(k, 16), f"0{n_qubits}b")
        k = k[-n_qubits:].rjust(n_qubits, "0")
        acc[k] = acc.get(k, 0.0) + float(value)
    total = sum(acc.values())
    is_int = all(abs(v - round(v)) < 1e-9 for v in acc.values())
    if is_int and total > 1.5:
        return {k: int(round(v)) for k, v in acc.items()}, "counts"
    # probabilities (sum ~ 1) -> scale to shots, largest remainder
    if total <= 0:
        raise CircuitError("backend returned an empty distribution")
    scaled = {k: v / total * shots for k, v in acc.items()}
    floored = {k: int(math.floor(v)) for k, v in scaled.items()}
    remainder = shots - sum(floored.values())
    order = sorted(labels, key=lambda k: scaled[k] - floored[k], reverse=True)
    for k in order[:remainder]:
        floored[k] += 1
    return floored, "probabilities"


def distribution(counts: dict[str, int]) -> dict[str, float]:
    total = sum(counts.values()) or 1
    return {k: v / total for k, v in counts.items()}


def _backend_name(backend: Any) -> str:
    name = getattr(backend, "name", None)
    if callable(name):
        try:
            name = name()
        except Exception:  # pragma: no cover
            name = None
    return str(name or type(backend).__name__)


def run_json(backend: Any, n_qubits: int, ops_json: str, shots: int = 256, basis: str = "z") -> str:
    """Qollab entry point: build the circuit, run it on the backend Qollab chose, return counts as JSON.

    Called from main.js as `await circuit.run_json.callPromising(backend, n, opsJson, shots, basis)`.
    """
    n = int(n_qubits)
    shots = max(1, min(int(shots), 10000))
    qc = build_circuit(n, ops_json, measure=True, basis=basis)
    job = backend.run(qc, shots=shots)
    result = job.result()
    raw = result.get_counts()
    counts, kind = normalize_counts(raw, n, shots)
    return json.dumps(
        {
            "counts": counts,
            "shots": shots,
            "counts_kind": kind,
            "backend_name": _backend_name(backend),
            "backend_class": type(backend).__name__,
            "basis": basis,
        }
    )


def build_circuit_for_run(n_qubits: int, ops_json: str, basis: str = "z"):
    """Qollab entry point: the measured circuit as an object, for main.js to pass to `backend.run` ITSELF.

    Qollab's runtime proxies a remote (IonQ) job only when it is submitted from JavaScript
    (`await backend.run(qc, { shots })`, then `await job.result()`); the same call made inside Python tries to POST
    from the sandbox and is blocked. Measured 2026-10-11 on qollab.xyz with a probe project.
    """
    return build_circuit(int(n_qubits), ops_json, measure=True, basis=basis)


def normalize_counts_json(counts: Any, n_qubits: int, shots: int) -> str:
    """Qollab entry point: the counts a JavaScript-submitted job returned, normalized like run_json's.

    JavaScript hands `job.result().get_counts()` straight back, so this receives Qiskit's Counts object itself: on
    Qollab its toJs() is a plain object, not a Map, and JSON.stringify of the proxy is "{}" (measured 2026-10-11).
    A JSON string is accepted too.
    """
    raw = json.loads(counts) if isinstance(counts, str) else counts
    if hasattr(raw, "to_py"):  # a JavaScript object reaches Python as a JsProxy
        raw = raw.to_py()
    shots = max(1, min(int(shots), 10000))
    counts, kind = normalize_counts(raw, int(n_qubits), shots)
    return json.dumps({"counts": counts, "shots": shots, "counts_kind": kind})


def describe_backend_json(backend: Any) -> str:
    """Qollab entry point: what did the person pick in the Select QPU dialog?"""
    name = _backend_name(backend)
    cls = type(backend).__name__
    module = type(backend).__module__ or ""
    lowered = f"{name} {cls} {module}".lower()
    if "ionq" in lowered:
        kind = "ionq-qpu" if "qpu" in lowered else "ionq-simulator"
    elif "fake" in lowered or "noise" in lowered:
        kind = "local-noisy"
    elif "basic" in lowered or "aer" in lowered or "statevector" in lowered or "braket" in lowered:
        kind = "local-ideal"
    else:
        kind = "unknown"
    return json.dumps({"name": name, "class": cls, "module": module, "kind": kind})
