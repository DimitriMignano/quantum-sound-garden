# Quantum Beats Studio

**Make sounds with the rules of quantum physics.** Learn four moves by ear → solve four puzzles → play the same four again as qubits → make a beat.

Each track is a qubit that plays one of two sounds. You **Swap** (X), **Shuffle** (Hadamard), **Turn** (phase) and
**Sync** (CNOT) the tracks, then **Play** (measure): each Play is one measurement of a real Qiskit circuit, and you hear
a car, rain, a bell or thunder for what was read. A five-page tutorial teaches each move by ear with no quantum words,
including the two rules dice can never follow (two Shuffles cancel; a Turn is silent until the next Shuffle). Four
puzzles make you use them (superposition and entanglement, interference, noise); each has a goal panel with a live
closeness word, hints that are the steps of the solution, a Show solution button, and, once solved, the lesson in
quantum terms. Then the same four puzzles again as qubits: qubit 0 and qubit 1, |0⟩ and |1⟩, X, H, P(θ), CX, Measure, with a state line that shows the phase; the sound names stay for two puzzles, then go. The studio's **Loop** is a beat machine: every bar
is eight fresh readings of your mix, a real circuit run on the backend you chose, with the circuit and its Qiskit code on
the page; on an IonQ backend (one job per Run) Loop reads 64 shots in one job and plays them as eight bars. The **Circuit** button shows gate names, bits, percentages and the Qiskit
code behind any mix. (Repository name: quantum-sound-garden.)

_This effort is supported by Qollab & IonQ._

## How to run it here
1. Press **Run Project**, then **Run**, and pick a backend in **Select QPU**. The built-in simulator gives unlimited
   Plays on the device itself. With an IonQ cloud simulator, Qollab allows **one job per Run**, so the tutorial and
   the puzzles play on Qiskit's Statevector (computed in your browser, readings sampled locally) and the studio offers the
   single IonQ job (with IonQ's noise model of a real QPU) when you choose it; press Run again for another.
2. Press **Start**. Sound starts only after that press (browser autoplay rules). Headphones help.
3. Learn the moves, press **Start the puzzles**, solve the four, play them again as qubits, then open **Studio** and press **Loop**.

Use Chrome, Edge, Brave, Opera or Firefox; Qollab does not run projects in Safari yet.

## What is quantum about it (and what is not)
- You are **not** hearing a quantum state. Audio is classical sound rendered from the ideal probabilities and the
  measured counts of a Qiskit `QuantumCircuit`.
- Shuffle creates alternative outcomes; a Turn alone leaves every probability unchanged; the Turn matters only when
  paths recombine (a second Shuffle), where branches add or cancel; Sync makes measurable correlations (a Bell pair:
  each track is a fair coin, yet 01 and 10 never appear); Play draws definite outcomes from the prepared state;
  noise (a simple stochastic Pauli model, exaggerated on purpose) adds unintended outcomes, and a shorter circuit
  with the same meaning measures closer to the intention.
- The live odds and the closeness word use a small in-browser statevector; the circuit, its ideal probabilities,
  the code and every Play come from Qiskit (`qsg/circuit.py`, called from `main.js` through Pyodide). The two are parity-tested.

## Project files
- `index.html`, `main.js`, `main.css` — the app (React + TypeScript, built with Vite from the public repository).
- `qsg/circuit.py` — the pure Qiskit module: moves → `QuantumCircuit` → `Statevector` probabilities,
  readable Qiskit code, and `run_json(backend, …)` which runs on the backend Qollab selected.

## Source, docs and tests
Full source, architecture notes, the quantum-to-audio mapping, limitations and the test suite (pytest + vitest,
including Qiskit-vs-browser parity fixtures): https://github.com/DimitriMignano/quantum-sound-garden
(`README.md`, `docs/`). Which engine produced what: the tutorial, puzzles 1–3 and the studio play on the chosen backend (or on
Qiskit's Statevector with local sampling when the one-job-per-Run limit applies); puzzle 4's noise is simulated
in-app by a stochastic Pauli sampler (not a Qiskit job) unless you picked a noise-model backend, in which case the
provider's noise applies. Each result names its engine.

## Disclosure
Built during the hackathon window (2026-10-10 → 10-11) with AI assistance (Claude Code by Anthropic wrote code and
docs under human direction; a second model reviewed drafts). Libraries: Qiskit, qiskit-aer, qiskit-ionq, FastAPI
(standalone server only), React, Vite, vitest. No templates. Rain, thunder, traffic and crowd are short cuts of public-domain (CC0) field recordings from
Wikimedia Commons, credited in `docs/ATTRIBUTIONS.md`; every other sound is procedural Web Audio. License: MIT.
