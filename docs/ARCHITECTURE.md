# Architecture

One React + TypeScript app, three ways to reach Qiskit, one honest label on every result.

```
                 web/src (React + TS)                              who runs the circuit
 ┌───────────────────────────────────────────────┐
 │ app/        scenes: welcome · 4 challenges ·  │     ┌────────────────────────────────────────┐
 │             creator (useGarden hook)          │     │ Qollab (judged):  qsg/circuit.py in     │
 │ garden/     canvas renderer (decorative)      │ ──► │   Pyodide + the `backend` Qollab picked │
 │ audio/      Web Audio engine · procedural     │     ├────────────────────────────────────────┤
 │             sounds · mixer (blend / bloom)    │ ──► │ Local server: FastAPI + qsg.backends    │
 │ engine/     QuantumEngine interface:          │     │   Aer ideal · Aer noisy · IonQ (qiskit- │
 │   qollab.ts · server.ts · browser.ts          │     │   ionq, IONQ_API_KEY)                   │
 │   statevector.ts (preview + parity-tested)    │ ──► │ Browser math (labeled "not Qiskit")     │
 │ content/    every word + challenge definitions│     └────────────────────────────────────────┘
 └───────────────────────────────────────────────┘
```

## The circuit model (`server/qsg/circuit.py`)
A garden is `n_qubits` (1–4) and a list of ops in garden words: `flip` (X), `split` (H), `twist` (P(θ), θ = turns·2π),
`link` (CX control→target). `build_circuit` makes the `QuantumCircuit`; `ideal` returns probabilities and amplitudes
from `qiskit.quantum_info.Statevector`; `qiskit_code` renders readable Qiskit source with the gate names and what each
does; `normalize_counts` turns any provider's `get_counts()` into `{bitstring: int}` over every outcome (hex keys,
spaced registers and probability-valued counts from IonQ's ideal simulator included, and it says which it got).
The file has no Aer and no network so the identical file ships in the Qollab bundle.

**Bit order**: Qiskit's. In `'10'` qubit 0 is the rightmost bit. `web/src/engine/outcomes.ts` is the only place the UI
reads bits.

## Engines (`web/src/engine`)
`QuantumEngine { info, ideal, qiskitCode, run }`. `createEngine()` picks, in order:
1. **QollabEngine** when `window.__QSG_QOLLAB__` exists (set by `qollab-entry.ts`, which imports `qsg.circuit` and
   captures the `backend` global). Calls cross as JSON strings through `.callPromising`. It labels the backend from
   `describe_backend_json` (IonQ vs local vs IBM noise model) and enforces Qollab's one-job-per-Run rule on IonQ.
2. **ServerEngine** when `GET /api/health` answers (local FastAPI).
3. **BrowserEngine** otherwise: `statevector.ts`, labeled "Browser math (not Qiskit)".

The **live preview** always uses `statevector.ts` so the garden reacts instantly; when a Qiskit engine is present the
UI also fetches Qiskit's ideal and shows "Qiskit agrees ✓" (or a loud disagreement). `pytest` writes
`web/src/engine/__fixtures__/parity.json` from Qiskit; `vitest` holds the TypeScript simulator and the TypeScript
code generator to it, byte for byte for the code.

## Noise
- Server: Aer `NoiseModel` with depolarizing errors on 1- and 2-qubit gates plus readout flips. Two presets:
  `ionq-inspired` (from IonQ's published Aria-class fidelities; ours, not official) and `teaching` (exaggerated).
- In-app: `sampleNoisy` in `statevector.ts`, a Monte Carlo stochastic Pauli channel with the same `teaching` numbers,
  so challenge 4 works on Qollab's ideal built-in simulator and in the browser fallback. Results carry
  `simulatedNoise` and the UI prints it.
- On Qollab, choosing an IBM or IonQ noise-model backend gives real provider noise on every Bloom.

## Audio (`web/src/audio`)
`engine.ts`: one `AudioContext` created on the first gesture, a master ceiling (0.8) and a limiter. `sounds.ts`: a
`SoundAsset` interface and twelve procedural sounds (noise-based textures, scheduled events). `mixer.ts`:
`blend()` = hear the odds (each sound's level is the probability mass of the outcomes that include it, scaled under
a bloom), `playSequence()` = a Bloom (one moment per shot, the outcome's sounds swell and its events fire, the rest
sink to a bed, captions per moment). Backends return counts, not order, so the play order is a seeded shuffle of the
counts (`shotSequence`), identical on Replay.

## Build targets (`web/vite.config.ts`, `scripts/build-qollab.mjs`)
- `vite build` → `web/dist` (standalone; FastAPI serves it when present).
- `QOLLAB=1 vite build` → library mode, `qollab/main.js` + `main.css`, entry `src/qollab-entry.ts`, with `qsg.circuit`
  left external (Qollab resolves it to `qollab/qsg/circuit.py`). The build script copies the Python module, writes
  `requirements.txt`, derives `qollab/index.html` (body only, no `<script>`) from `web/index.html`, copies the project
  page and license, asserts every file and the 2 MB limit, and zips to `dist/`.

## How a job is submitted on Qollab (measured 2026-10-11)
Qollab's runtime proxies a remote (IonQ) job only when JavaScript calls `await backend.run(qc, { shots })` and then
`await job.result()`; the same `backend.run` made inside a Python function tries to POST from the sandbox and is
blocked (project code may only GET). So on Qollab the engine asks Python for the measured circuit object
(`build_circuit_for_run`), submits it from JavaScript, and hands the counts back to Python to normalize
(`normalize_counts_json`). A local simulator also accepts the Python path (`run_json`), kept as the second try. If a
remote job still fails, the result comes from Qiskit's statevector with a note that names what was requested and why,
and the one-job guard is released because no job reached IonQ. Probe: a two-file project on qollab.xyz returned an
IonQ Aria 1 simulator job in 709 ms with counts {00: 5, 11: 3}; the Python-side call in the same run failed.
