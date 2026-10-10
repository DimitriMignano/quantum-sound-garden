# Quantum Sound Garden

**Hear quantum behavior → predict it → shape it on purpose → create with it → read the Qiskit circuit.**

A living night garden holds glowing sound seeds. Each seed is a qubit. You **Split** (Hadamard), **Twist** (phase),
**Link** (CNOT) and **Bloom** (measure) them, and the garden plays rain, thunder, footsteps and birds drawn from the
measured shots of a real Qiskit circuit. Four short challenges teach superposition, entanglement, interference and
noise by ear; a two-qubit creator mode then makes a 20-second soundscape and shows the equivalent Qiskit code.

_This effort is supported by Qollab & IonQ._

## How to run it here
1. Press **Run Project**, then **Run**, and pick a backend in **Select QPU**. The built-in simulator gives unlimited
   Blooms on the device itself. With an IonQ cloud simulator, Qollab allows **one job per Run**, so the challenges
   bloom on Qiskit's Statevector (computed in your browser, shots sampled locally) and the creator offers the single
   IonQ job (with IonQ's noise model of a real QPU) when you choose it; press Run again for another.
2. Press **Enter the garden**. Sound starts only after that press (browser autoplay rules). Headphones help.
3. Follow the four challenges, then open **Creator**.

Use Chrome, Edge, Brave, Opera or Firefox; Qollab does not run projects in Safari yet.

## What is quantum about it (and what is not)
- You are **not** hearing a quantum state. Audio is classical sound rendered from the ideal probabilities and the
  measured counts of a Qiskit `QuantumCircuit`.
- Split creates alternative outcomes; a Twist alone leaves every probability unchanged; the Twist matters only when
  paths recombine (a second Split), where branches add or cancel; Link makes measurable correlations (a Bell pair:
  each seed is a fair coin, yet 01 and 10 never appear); Bloom draws definite outcomes from the prepared state;
  noise (a simple stochastic Pauli model, exaggerated on purpose) adds unintended outcomes, and a shorter circuit
  with the same meaning measures closer to the intention.
- The live preview uses a small in-browser statevector; the circuit, its ideal probabilities, the code and every
  Bloom come from Qiskit (`qsg/circuit.py`, called from `main.js` through Pyodide). The two are parity-tested.

## Project files
- `index.html`, `main.js`, `main.css` — the app (React + TypeScript, built with Vite from the public repository).
- `qsg/circuit.py` — the pure Qiskit module: garden actions → `QuantumCircuit` → `Statevector` probabilities,
  readable Qiskit code, and `run_json(backend, …)` which runs on the backend Qollab selected.

## Source, docs and tests
Full source, architecture notes, the quantum-to-audio mapping, limitations and the test suite (pytest + vitest,
including Qiskit-vs-browser parity fixtures): https://github.com/DimitriMignano/quantum-sound-garden
(`README.md`, `docs/`). Which engine produced what: challenges 1–3 and the creator bloom on the chosen backend (or on
Qiskit's Statevector with local sampling when the one-job-per-Run limit applies); challenge 4's noise is simulated
in-app by a stochastic Pauli sampler (not a Qiskit job) unless you picked a noise-model backend, in which case the
provider's noise applies. Each result names its engine.

## Disclosure
Built during the hackathon window (2026-10-10 → 10-11) with AI assistance (Claude Code by Anthropic wrote code and
docs under human direction; a second model reviewed drafts). Libraries: Qiskit, qiskit-aer, qiskit-ionq, FastAPI
(standalone server only), React, Vite, vitest. No templates. All sounds are procedural Web Audio (no recordings,
no third-party assets). License: MIT.
