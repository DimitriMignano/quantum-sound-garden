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
- [x] Redesign after the founder's first look (10-10 16:00): a sound board instead of a dashboard — rulebook of nine
      playable rules → puzzles where Bloom asks for the guess → creator with four sound pads; jargon behind a Circuit toggle
- [ ] Live test at phone width after the redesign (the Chrome resize did not take; earlier 390px check predates it); keyboard pass

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
- 10-10 16:00 founder opened it: "I kinda have no idea what's going on"; asked for rules-first, then freedom, and a sound board with
  fewer buttons and less reading. 16:45 rebuilt the app layer: welcome = one line + one button; Moves scene (nine one-line rules,
  each with Hear it in a live garden, plus free play); puzzles = garden + caption + board, Bloom asks "what will you hear?" as big
  choices, result in one sentence, Why? opens the physics/code/deeper; creator = four pads with seed lamps + board; buds carry
  sound names; bits, percentages, outcome cards, code and backend select live behind the Circuit toggle. Live in Chrome: rulebook
  Hear it, puzzle 1 end to end, Why?, creator pads. Gate green.
- 10-10 17:40 founder's second look ("how did we get the idea of a garden… way too much text… I still don't know what flip twist
  split and link do in a musical context… 'hear it' nothing happens… the edge is you could play ours with your eyes closed"). Reframed
  as **Quantum Beats Studio**: tracks that play one of two sounds, moves Swap/Shuffle/Turn/Sync, Play; no quantum words on the first-run
  path; a front door with a visible beat (rings + drifting notes) and one button; a nine-page tutorial (one idea per page, only that
  page's moves on the board, Try it + Play); puzzles with a closeness hum (tritone far → octave there) as the eyes-closed progress bar
  and no guess step; studio pads. The first lesson used a near-silent "hush", which is why Hear it felt like nothing: tracks now use
  audible base sounds (crickets, wind). Audio output measured with an analyser on the master bus: RMS 0.05 idle hum, 0.10 during Play.
- 10-10 18:30 founder: "the try it buttons dont play anything or at least i cant hear anything… explain whats going on first".
  Every beat now carries a drum per track (low thump for the first sound, bright snap for the hit, panned left/right by track), the
  textures hit instead of crossfading, default volume 0.85, limiter −6 dB, ceiling 0.9: Play peaks RMS 0.31 at the master (was 0.17).
  Learn opens on a "What's going on" page: five numbered lines of context, then "Learn the moves".
