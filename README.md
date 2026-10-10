# Quantum Sound Garden

**Quantum Beats Studio — make beats with the rules of quantum physics.** Learn four moves by ear → solve four
puzzles → build your own → read the Qiskit code. Eyes closed works.

An audio-first learning and creation experience for people who have never played an instrument or touched a qubit.
Each track is a qubit that plays one of two sounds. You **Swap** (X), **Shuffle** (Hadamard), **Turn** (phase) and
**Sync** (CNOT) the tracks, then **Play** (measure): each Play is one measurement of a real Qiskit circuit, and the
studio plays a car, rain, a bell or thunder for what was read. A nine-page tutorial teaches each move by ear (Swap = X, Shuffle = H, Turn =
phase, Sync = CX, Play = measure); four puzzles make you use them (superposition, entanglement, interference, noise)
with a closeness hum as the eyes-closed progress bar; a two-track studio with four sound pads then lets you build any
mix and hear what it lands on. The **Circuit** button shows gate names, bits, percentages and the Qiskit code behind any mix.

Entry for the Qollab + IonQ Quantum Hackathon (theme: Quantum Playground). _This effort is supported by Qollab & IonQ._

> You are not hearing a quantum state. The sound is ordinary audio driven by the probabilities and the measured
> shots of a real Qiskit circuit. Every result in the app names the engine that produced it.

## Run it

**On Qollab (the judged path).** Upload `dist/quantum-sound-garden-qollab.zip` (or the `qollab/` folder) as a new
project ("Upload your own files"), press Run Project → Run, pick a backend in Select QPU, then press *Start*. See `docs/QOLLAB_PAGE.md` for the project page text.

**Locally (one command).**
```bash
# once
python3.12 -m venv server/.venv && server/.venv/bin/pip install -r server/requirements.txt
npm install && (cd web && npm install)
cp server/.env.example server/.env            # optional: add IONQ_API_KEY for the IonQ simulator
# every time
npm run dev                                   # FastAPI + Qiskit on :8765, the app on http://localhost:5173
```
Without the Python server the app still runs on a clearly labeled in-browser fallback ("Browser math, not Qiskit").

**Gate.** `npm run check` runs pytest (circuit model, backends, API, parity fixtures), `tsc`, vitest (browser
statevector vs Qiskit parity, the taught behaviors, sampling, noise) and the Qollab bundle build.

## What is quantum about it
| Behavior | Where you hear it | Where it is verified |
|---|---|---|
| Hadamard creates alternative outcomes | Tutorial "Shuffle", puzzles 1 and 2: Shuffle makes a 50/50 mix | `server/tests/test_circuit.py::test_split_is_balanced`, `test_backends.py::test_hadamard_shots_are_approximately_balanced` |
| Phase alone leaves probabilities unchanged | Tutorial "Turn", puzzle 3: Turn, Play, nothing changes | `test_twist_alone_leaves_probabilities_unchanged` |
| Phase matters when branches recombine; constructive and destructive interference | Tutorial "Turn, then Shuffle", puzzle 3: Turn then Shuffle silences the footsteps (or makes them certain) | `test_phase_then_recombination_changes_the_outcome`, `test_phase_then_recombination_changes_sampled_distribution` |
| Controlled gates create measurable correlations | Tutorial "Sync a shuffled track", puzzle 2: thunder only with rain (Bell pair, 01 and 10 never appear) | `test_bell_state_correlations`, `test_bell_shots_are_correlated` |
| Measurement draws classical outcomes from the prepared state | Every Play; predicted vs measured bars (Circuit view) | `test_deterministic_basis_state_preparation`, `test_deterministic_preparation_samples_one_outcome` |
| Noise adds unintended outcomes; shorter circuits are more robust | Puzzle 4 | `test_teaching_noise_produces_unintended_outcomes_and_rewards_shorter_circuits` (Aer) and the vitest twin (in-app model) |
| The audio system interprets normalized results consistently | everywhere | `test_normalize_counts_shapes`, `statevector.test.ts` ("sampling and result interpretation") |

## Layout
```
qollab/      the Qollab JS/Qiskit project (built; upload this)      docs/        architecture, mapping, IonQ, limits, demo, judges
web/         Vite + React + TypeScript app (the source of qollab/)   server/      Python: qsg.circuit (pure Qiskit), backends, FastAPI, tests
scripts/     build-qollab.mjs                                        WORKLOG.md   progress and what still needs a human
```

## Docs
`docs/ARCHITECTURE.md` · `docs/QUANTUM_TO_AUDIO.md` · `docs/IONQ_SETUP.md` · `docs/LIMITATIONS.md` ·
`docs/DEMO_SCRIPT.md` · `docs/JUDGES.md` · `docs/ATTRIBUTIONS.md` · `docs/QOLLAB_PAGE.md`

## License
MIT (see `LICENSE`). Sounds are procedural Web Audio: no recordings, no third-party assets.

## If Start does nothing, or Play is silent (Chrome on macOS)
Chrome's audio service can hang: a new AudioContext then never leaves "suspended", and the app's Start button waits on
it on purpose (it never pretends to have sound). The welcome screen says so after 2.5 s. Fix: quit Chrome completely
(Cmd+Q) and reopen it. If it keeps happening, the macOS audio daemon is slow to open streams; `sudo killall coreaudiod`
in a terminal restarts it (macOS relaunches it at once), or restart the Mac. Seen 2026-10-10 on the founder's machine.
