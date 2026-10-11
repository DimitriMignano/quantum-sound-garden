# For judges

**Quantum Beats Studio** (repository: quantum-sound-garden) teaches superposition, entanglement, interference and noise by ear, to people with no
music and no quantum background, through natural sounds rendered from real Qiskit circuits, then lets them make a beat with the same circuits. Theme:
Quantum Playground. _This effort is supported by Qollab & IonQ._

## The 90-second path (what a judge should press)
Run → Start → "Learn the moves", then Try it on each page: a car becomes rain (Swap), a coin toss (Shuffle), the dial that
sets the odds (Turn: tap ½ ¼ ⅛), the pair that always agrees (Sync). "Start the puzzles": puzzle 1 is one Swap. Puzzle 2:
Shuffle, Sync, Play; the page turns green and says, in quantum terms, what a Bell state is; "Go deeper" plays the pair
and two classical twins sideways (the entanglement witness). After puzzle 4, "Play them as qubits": the same board relabeled (qubit 0, |0⟩, |1⟩, X, H, P(θ), CX, Measure) with a
state line that shows the sign a phase sets. The front door also has "Jump to the puzzles" and "Open the studio". In the studio press Loop: a beat whose every bar is eight fresh readings of the mix, as a real circuit run on the chosen
backend; the circuit, its Qiskit code and the backend are always on the page there, and on IonQ backends (one job per
Run) Loop reads 64 shots in one job and plays them as eight bars. The Circuit button
shows the gates, the bits and the Qiskit code at any moment.

## How it plays
A sound board, not a dashboard: a tile per track, four big moves (Swap, Shuffle, Turn, Sync), Play, and the mix as
beads, which is the circuit. No quantum words on the first-run path. A five-page tutorial you can hear (including the
two rules dice can never follow: two Shuffles cancel, and a Turn is silent until the next Shuffle), then four puzzles,
each with a goal panel (the goal, when it is done, a live closeness word), hints that are the steps of the solution, a
Show solution button so nobody gets stuck, and, once solved, the lesson in quantum words. Then the same four puzzles as qubits, the
sound names fading out over the four, so the learner ends up operating a circuit in its own vocabulary. Then the studio
and its Loop. The **Circuit** toggle shows gate names, bits,
percentages and the Qiskit code for whatever mix is on screen.

## Why quantum is essential, not decorative
- The sounds are shaped by state preparation, not by a random number: a Turn changes nothing you hear until a
  second Shuffle makes the paths interfere (puzzle 3), and a dephased twin of the same circuit cannot cancel the
  footsteps.
- Entanglement is made audible as agreement that survives a complementary question: a Bell pair plays
  together-or-neither in both the Z and the X basis; classical twins fall apart sideways (puzzle 2, Go deeper).
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
Hosted with the full Qiskit server (Aer ideal and noisy, IonQ with a key): https://beats.quantumnuggets.com. The judged artifact is the Qollab
project; the hosted copy is the same code behind a FastAPI server.
`README.md` (run and the behavior-to-test table) · `docs/ARCHITECTURE.md` · `docs/QUANTUM_TO_AUDIO.md` ·
`docs/LIMITATIONS.md` (careful claims) · `docs/IONQ_SETUP.md` · `server/tests` and `web/src/engine/statevector.test.ts`.
