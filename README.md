# Quantum Sound Garden

**Four moves. Every garden you grow is a real quantum circuit.** Learn the moves by ear → solve four puzzles →
grow your own sounds → read the Qiskit code.

An audiovisual learning and creation experience for people who have never played an instrument or touched a qubit.
A living night garden holds glowing sound seeds (qubits). You **Split** (Hadamard), **Twist** (phase), **Link**
(CNOT) and **Bloom** (measure) them, and the garden plays rain, thunder, footsteps and birds drawn from the
measured shots of a real Qiskit circuit. A nine-line rulebook you can hear teaches the moves; four puzzles make you
use them (superposition, entanglement, interference, noise); a two-qubit creator with four sound pads then makes a
20-second soundscape. The **Circuit** button shows gate names, bits, percentages and the Qiskit code behind any garden.

Entry for the Qollab + IonQ Quantum Hackathon (theme: Quantum Playground). _This effort is supported by Qollab & IonQ._

> You are not hearing a quantum state. The sound is ordinary audio driven by the probabilities and the measured
> shots of a real Qiskit circuit. Every result in the app names the engine that produced it.

## Run it

**On Qollab (the judged path).** Upload `dist/quantum-sound-garden-qollab.zip` (or the `qollab/` folder) as a new
project ("Upload your own files"), press Run Project → Run, pick a backend in Select QPU, then press *Enter the
garden*. See `docs/QOLLAB_PAGE.md` for the project page text.

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
| Hadamard creates alternative outcomes | Rulebook "Split", puzzles 1 and 2: Split makes a 50/50 garden | `server/tests/test_circuit.py::test_split_is_balanced`, `test_backends.py::test_hadamard_shots_are_approximately_balanced` |
| Phase alone leaves probabilities unchanged | Rulebook "Twist", puzzle 3: Twist, Bloom, nothing changes | `test_twist_alone_leaves_probabilities_unchanged` |
| Phase matters when branches recombine; constructive and destructive interference | Rulebook "Twist, then Split", puzzle 3: Twist then Split silences the footsteps (or makes them certain) | `test_phase_then_recombination_changes_the_outcome`, `test_phase_then_recombination_changes_sampled_distribution` |
| Controlled gates create measurable correlations | Rulebook "Link a split seed", puzzle 2: thunder only with rain (Bell pair, 01 and 10 never appear) | `test_bell_state_correlations`, `test_bell_shots_are_correlated` |
| Measurement draws classical outcomes from the prepared state | Every Bloom; predicted vs measured bars | `test_deterministic_basis_state_preparation`, `test_deterministic_preparation_samples_one_outcome` |
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
