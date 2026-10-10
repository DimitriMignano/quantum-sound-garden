"""Writes the parity fixture the TypeScript tests read, so the browser math and the Qiskit code generator are held
to Qiskit's numbers and text. Run before `vitest` (npm run check does)."""
import json
from pathlib import Path

from qsg import circuit as C

FIXTURE = Path(__file__).resolve().parent.parent.parent / "web" / "src" / "engine" / "__fixtures__" / "parity.json"

S0, S1 = {"op": "split", "q": 0}, {"op": "split", "q": 1}
L01 = {"op": "link", "control": 0, "target": 1}
L10 = {"op": "link", "control": 1, "target": 0}
CASES = {
    "empty-1": (1, []),
    "flip-1": (1, [{"op": "flip", "q": 0}]),
    "split-1": (1, [S0]),
    "split-twist-half-1": (1, [S0, {"op": "twist", "q": 0, "turns": 0.5}]),
    "interference-cancel-1": (1, [S0, S0]),
    "interference-flip-1": (1, [S0, {"op": "twist", "q": 0, "turns": 0.5}, S0]),
    "interference-quarter-1": (1, [S0, {"op": "twist", "q": 0, "turns": 0.25}, S0]),
    "interference-odd-1": (1, [S0, {"op": "twist", "q": 0, "turns": 0.13}, S0]),
    "flip-q1-2": (2, [{"op": "flip", "q": 1}]),
    "bell-2": (2, [S0, L01]),
    "bell-reversed-2": (2, [S1, L10]),
    "phase-bell-2": (2, [S0, {"op": "twist", "q": 0, "turns": 0.25}, L01, S1]),
    "both-split-2": (2, [S0, S1]),
    "noisy-garden-padded-2": (2, [S0, S1, S1, L01, L01, L01]),
    "three-ghz-3": (3, [S0, L01, {"op": "link", "control": 1, "target": 2}]),
    "twist-chain-3": (3, [S0, {"op": "twist", "q": 0, "turns": -0.25}, L01, {"op": "flip", "q": 2}, S0]),
}


def test_write_parity_fixture():
    out = {}
    for name, (n, ops) in CASES.items():
        ideal = C.ideal(n, ops)
        out[name] = {
            "n_qubits": n,
            "ops": ops,
            "probabilities": ideal["probabilities"],
            "amplitudes": ideal["amplitudes"],
            "qiskit_code": C.qiskit_code(n, ops, shots=256),
        }
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(json.dumps(out, indent=1, sort_keys=True) + "\n")
    assert FIXTURE.exists() and len(out) == len(CASES)
