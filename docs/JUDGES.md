# For judges

**Quantum Beats Studio** (repository: quantum-sound-garden) teaches superposition, entanglement, interference and noise by ear, to people with no
music and no quantum background, through natural sounds rendered from real Qiskit circuits. Theme: Quantum
Playground. _This effort is supported by Qollab & IonQ._

## The 90-second path (what a judge should press)
Run → Start → on the first page press "Learn the moves", then on each page press Try it once: a car becomes rain (Swap),
a coin toss (Shuffle), the dial that sets the odds (Turn, tap ½ ¼ ⅛), and the pair that always agrees (Sync). Then
"Start the puzzles" and solve puzzle 2 with Shuffle and Sync; press Why? and "Classical twins, sideways" to hear the
entanglement witness. The front door also has "Jump to the puzzles" and "Open the studio" for anyone who wants the
point first. The Circuit button shows the gates, the bits and the Qiskit code at any moment.

## How it plays
A sound board, not a dashboard: the picture, four big moves (Swap, Shuffle, Turn, Sync), Play, and the mix as beads,
which is the circuit. No quantum words on the first-run path. First a five-page tutorial you can hear (including the
two rules dice can never follow: two Shuffles cancel, and a Turn is silent until the next Shuffle), then four puzzles
solved with any mix that meets the goal, each with a goal panel (the goal, when it is done, and a live closeness word:
far, warmer, closer, almost, there, read aloud by screen readers), then an open studio. The **Circuit** toggle shows gate names, bits, percentages and the
Qiskit code for whatever mix is on screen; the **Why?** reveal names the gate and the physics after each puzzle.

## Why quantum is essential, not decorative
- The sounds are shaped by state preparation, not by a random number: a Turn changes nothing you hear until a
  second Shuffle makes the paths interfere (puzzle 3), and a dephased twin of the same circuit cannot cancel the
  footsteps.
- Entanglement is made audible as agreement that survives a complementary question: a Bell pair plays
  together-or-neither in both the Z and the X basis; classical twins fall apart sideways (puzzle 2, Why → Go deeper).
- Measurement is the Play: definite outcomes drawn from the prepared state, predicted bars beside measured bars
  (Circuit view), and an explanation of why repeated Plays differ.

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
