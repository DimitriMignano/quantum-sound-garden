# WORKLOG — Quantum Sound Garden (hackathon build, 2026-10-10 → 10-11)

Deadline: **2026-10-11 19:00 ET** (Qollab + IonQ Quantum Hackathon, theme: Quantum Playground).

## Checklist
- [x] Read hackathon rules + Qollab runtime docs; architecture decided (see CLAUDE.md §3, docs/ARCHITECTURE.md)
- [x] Python `qsg.circuit` pure module (ops → QuantumCircuit, ideal probabilities, Qiskit code, X-basis) + pytest
- [x] Python backends: local Aer ideal, Aer noisy (IonQ-inspired + teaching, one stochastic Pauli model), IonQ via
      qiskit-ionq, graceful labeled fallback, real per-shot order from Aer
- [x] FastAPI dev/standalone server (+ tests)
- [x] TS engine interface + browser statevector (parity-tested vs Qiskit, 19 fixtures) + server engine + Qollab engine
- [x] Procedural Web Audio sound library (12 sounds) + mixer (hear the odds · bloom playback) + captions
- [x] Canvas garden renderer (reduced-motion aware; phase ring only for separable qubits)
- [x] Challenge 1 vertical slice: Make It Rain (UI → Qiskit → sound) — live-tested in Chrome
- [x] Challenges 2–4 (2 and 3 carry the quantum-vs-classical "Go deeper" A/B) — 2 live-tested, 3–4 static + unit
- [x] Creator mode (sounds per outcome, shots, noise, backend choice, replay/regenerate, code, why-shots-vary, reset)
- [x] Qollab bundle build (`qollab/` + zip, fresh staging, allowlist) + built-bundle smoke test in a Qollab-shaped page
- [x] Docs: README, ARCHITECTURE, QUANTUM_TO_AUDIO, IONQ_SETUP, LIMITATIONS, DEMO_SCRIPT, JUDGES, ATTRIBUTIONS, QOLLAB_PAGE, LICENSE
- [x] Second-opinion review 1 (architecture + slice): 30 findings triaged, the substantive ones fixed (see context log)
- [ ] Second-opinion review 2 (final) and fixes
- [ ] Live test of challenges 3–4 and the creator in Chrome; responsive pass at phone width; keyboard pass

## Needs a human
- IonQ API key in `server/.env` (`IONQ_API_KEY=...`) to prove the standalone IonQ path (the live test skips without it).
- Make the GitHub repository PUBLIC before submitting (the rules require a public repo; it is private now).
- Upload `dist/quantum-sound-garden-qollab.zip` to Qollab (New Project → Upload your own files), run it once on the
  built-in simulator and once on an IonQ simulator (this is the first live test of the Qollab adapter; note the
  backend label the top bar shows on each, because IonQ detection relies on the backend's name containing "ionq"), publish
  under MIT, paste `docs/QOLLAB_PAGE.md` as the project page, record the 2–3 minute video (`docs/DEMO_SCRIPT.md`),
  submit from the registration page before 2026-10-11 19:00 ET.

## Log
- 10-10 11:50 scaffolded repo; 12:05 architecture locked after reading Qollab runtime docs.
- 10-10 12:40 vertical slice live in Chrome; 12:50 review 1 back; 13:30 review-1 fixes: odds hidden until prediction, no-audio completion, Qollab one-job redesign, exclusive predictions, one Pauli noise model, X-basis blooms + classical twins + dephased twin, legend, remove affordance, docs.
- 10-10 14:30 review 2 back: all 8 round-1 fixes verified; fixed the IonQ-path noise routing bug, prediction lock + Reconsider, native radios, feedback copy by result kind, entanglement-witness wording, dephased twin built from the learner's garden, explicit noise rates, #scene deep links for demos.
