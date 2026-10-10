# WORKLOG — Quantum Sound Garden (hackathon build, 2026-10-10 → 10-11)

Deadline: **2026-10-11 19:00 ET** (Qollab + IonQ Quantum Hackathon, theme: Quantum Playground).

## Checklist
- [x] Read hackathon rules + Qollab runtime docs; architecture decided (see CLAUDE.md §3, docs/ARCHITECTURE.md)
- [ ] Python `qsg.circuit` pure module (ops → QuantumCircuit, ideal probabilities, Qiskit code) + pytest
- [ ] Python backends: local Aer ideal, Aer noisy (IonQ-inspired + teaching), IonQ via qiskit-ionq, graceful fallback
- [ ] FastAPI dev/standalone server
- [ ] TS engine interface + browser statevector (parity-tested vs Qiskit) + server engine + Qollab engine
- [ ] Procedural Web Audio sound library + soundscape renderer + captions
- [ ] Canvas garden renderer (reduced-motion aware)
- [ ] Challenge 1 vertical slice: Make It Rain (UI → Qiskit → sound)
- [ ] Challenges 2–4
- [ ] Creator mode
- [ ] Qollab bundle build (`qollab/` + zip) and dev harness
- [ ] Docs: README, ARCHITECTURE, QUANTUM_TO_AUDIO, IONQ_SETUP, LIMITATIONS, DEMO_SCRIPT, JUDGES, ATTRIBUTIONS, LICENSE
- [ ] Second-opinion reviews (architecture · slice+modes · final) and fixes
- [ ] Accessibility + responsive pass; `npm run check` green

## Needs a human
- IonQ API key in `server/.env` (`IONQ_API_KEY=...`) to prove the standalone IonQ path.
- Upload `dist/quantum-sound-garden-qollab.zip` to Qollab, publish under MIT, add the project page text, record the
  2–3 minute video, submit from the registration page before the deadline.

## Log
- 10-10 11:50 scaffolded repo; 12:05 architecture locked after reading Qollab runtime docs.
