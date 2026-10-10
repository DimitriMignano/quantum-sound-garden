# For judges

**Quantum Sound Garden** teaches superposition, entanglement, interference and noise by ear, to people with no
music and no quantum background, through natural sounds rendered from real Qiskit circuits. Theme: Quantum
Playground. _This effort is supported by Qollab & IonQ._

## Why quantum is essential, not decorative
- The sounds are shaped by state preparation, not by a random number: a Twist changes nothing you hear until a
  second Split makes the paths interfere (challenge 3), and a dephased twin of the same circuit cannot cancel the
  footsteps.
- Entanglement is made audible as agreement that survives a complementary question: a Bell pair blooms
  together-or-neither in both the Z and the X basis; classical twins fall apart sideways (challenge 2, Go deeper).
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
