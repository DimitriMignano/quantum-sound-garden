# For judges

**Quantum Sound Garden** teaches superposition, entanglement, interference and noise by ear, to people with no
music and no quantum background, through natural sounds rendered from real Qiskit circuits. Theme: Quantum
Playground. _This effort is supported by Qollab & IonQ._

## How it plays
A sound board, not a dashboard: the garden, four big moves (Flip, Split, Twist, Link), Bloom, and the path of beads
that is the circuit. First a rulebook of nine one-line rules you can hear (including the two that are not classical:
two Splits cancel, and a Twist is silent until the next Split), then four puzzles solved with any garden that meets
the goal, then an open creator. Pressing Bloom in a puzzle asks for a guess first. The **Circuit** toggle shows gate
names, bits, percentages and the Qiskit code for whatever garden is on screen.

## Why quantum is essential, not decorative
- The sounds are shaped by state preparation, not by a random number: a Twist changes nothing you hear until a
  second Split makes the paths interfere (puzzle 3), and a dephased twin of the same circuit cannot cancel the
  footsteps.
- Entanglement is made audible as agreement that survives a complementary question: a Bell pair blooms
  together-or-neither in both the Z and the X basis; classical twins fall apart sideways (puzzle 2, Why → Go deeper).
- Measurement is the bloom: definite outcomes drawn from the prepared state, predicted bars beside measured bars,
  and an explanation of why repeated blooms differ.

## Technical execution
- One React + TypeScript codebase, three engines: Qollab (Qiskit on Pyodide + the chosen backend), a local
  FastAPI + Qiskit server (Aer ideal, Aer noise, IonQ via qiskit-ionq), and a labeled browser fallback.
- The pure circuit module (`qsg/circuit.py`) is the same file on Qollab and on the server; its ideal probabilities,
  amplitudes and generated Qiskit code are the parity oracle for the in-browser statevector (16+ fixture circuits,
  code byte-identical).
- One noise model (stochastic Pauli, same numbers) on Aer and in-app, tested on both sides.
- Honesty is enforced in code: every result names its engine, fallbacks carry the reason, exact-probability results
  are flagged, and the one-job-per-Run rule on IonQ backends is handled, not hidden.

## Where to look
`README.md` (run and the behavior-to-test table) · `docs/ARCHITECTURE.md` · `docs/QUANTUM_TO_AUDIO.md` ·
`docs/LIMITATIONS.md` (careful claims) · `docs/IONQ_SETUP.md` · `server/tests` and `web/src/engine/statevector.test.ts`.
