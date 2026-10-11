# CLAUDE.md — Quantum Sound Garden

> Working rules for anyone (human or Claude) building in this repo. Hackathon entry for the Qollab + IonQ Quantum
> Hackathon (theme: Quantum Playground). Submissions close **2026-10-11 19:00 ET**.

## 1. Thesis
Quantum Beats Studio (repository: quantum-sound-garden; the in-app title is one constant, `APP.title`) is for
people who have never touched an instrument or a qubit, and it is audio-first: you can play it with your eyes
closed. Each track is a qubit that plays one of two sounds; the person Swaps (X), Shuffles (H), Turns (phase) and
Syncs (CX) the tracks and Plays (measures) them, and hears a car, rain, a bell or thunder for what
a real Qiskit circuit read on each Play (one Play, one sound). A five-page tutorial teaches each move by ear with no quantum words; four
puzzles make the moves necessary, with a closeness hum as the progress bar; a two-track studio lets them build any
mix; the Circuit toggle and the Why? reveals carry the gates, the bits and the Qiskit code. It deliberately is not
a synthesizer, a DAW or a step sequencer, and it never claims the person is "hearing a quantum state": the sound is
classical audio driven by probabilities and shots.

## 2. Non-negotiables
- Scientific honesty: every result names the engine that produced it (Qollab backend name · local Qiskit Aer ·
  IonQ simulator via qiskit-ionq · browser math fallback). A fallback is never labeled as IonQ or as Qiskit.
- Never fabricate data presented as real; unknown is shown as unknown.
- Audio starts only after a user gesture; never above the master ceiling; never an endless loop without a stop.
- Secrets never enter git or a bundle. `IONQ_API_KEY` lives in `server/.env` (gitignored); `server/.env.example`
  documents it. Never print a credential.
- Hackathon rules: MIT license, the attribution line "This effort is supported by Qollab & IonQ", every template,
  library, AI assistance and asset disclosed on the project page. Submitting is a human's act.
- Every user-visible word is American English. Every color is a CSS token. Reduced motion is respected.

## 3. Stack (decided 2026-10-10, reasons in `memory/context-log.md`)
- **Qollab target (the judged artifact):** a Qollab *JS/Qiskit project* — `qollab/index.html` (body-only markup),
  `qollab/main.js` + `main.css` (built by Vite in library mode from `web/src`), `qollab/qsg/*.py` (pure Qiskit
  module called from JS via `.callPromising`), the pre-created `backend` global for runs. Pyodide in the browser.
- **Web app source:** Vite 8 · React 19 · TypeScript 6 · vitest. plain React tiles for the picture (two sounds and an odds bar per track), Web Audio for sound.
- **Standalone/dev server:** Python 3.12 venv in `server/.venv` · Qiskit 2.5 · qiskit-aer 0.17 · qiskit-ionq 1.1 ·
  FastAPI. Gives local ideal + noisy Aer runs and the IonQ simulator path with `IONQ_API_KEY`.
- **Browser fallback:** a TypeScript statevector + sampler (`web/src/engine/statevector.ts`), parity-tested against Qiskit.

## 4. Setup
```bash
# Python (3.12 recommended; 3.11–3.13 work)
python3.12 -m venv server/.venv && server/.venv/bin/pip install -r server/requirements.txt
cp server/.env.example server/.env        # add IONQ_API_KEY to use the IonQ simulator from the standalone app
# Web
npm install && (cd web && npm install)
```

## 5. Commands — real ones only
- **Gate** (run before every commit): `npm run check` → pytest · tsc · vitest · Qollab bundle build
- **Dev**: `npm run dev` → FastAPI on http://localhost:8765 + Vite on http://localhost:5173
- **Delivery**: `npm run build:qollab` → `qollab/` (committed) and `dist/quantum-sound-garden-qollab.zip`; a human
  uploads it to Qollab (New Project → Upload your own files) and publishes under MIT.

## 6. How work runs here
- Work on a branch; open a PR against `main`. Read `git diff --cached --stat` before every commit.
- Each work session appends an entry to `memory/context-log.md` (append-only) and ticks `WORKLOG.md`.
- A UI, audio or motion change cannot be proven by the static gate: say "Static only — live test still required".
- If a seam a feature needs is missing (a Qollab API, a backend), report it; never invent behavior around it.
- Only files inside this repo are committed; nothing else is pushed anywhere.

## 7. Canonical facts
- Qubit 0 is the rightmost bit in every Qiskit bitstring (`'10'` = q1 is 1, q0 is 0). The UI maps outcome labels in
  one place (`web/src/engine/outcomes.ts`) and nowhere else.
- Qollab allows ONE `backend.run` job per Run on IonQ backends; local simulators allow many. The UI must work in both.
- Qollab's runtime allows only GET/OPTIONS network calls, no storage, no `<script>` in `index.html`; `main.js` runs in
  the page and may import Python modules by dotted name.

## 8. Lessons paid for in this project (the mistake · the cheap check · the date)
- Read the platform runtime docs BEFORE choosing a stack: the first plan (FastAPI + SPA) could not have run on Qollab at
  all · check: the submission platform's "runtime environment" page · 2026-10-10
- Never `git add -A` in a repo that holds a venv or build output: the first commit here staged 9,011 venv files ·
  check: `git diff --cached --stat | tail -1` before every commit, and `.venv/` in .gitignore on day one · 2026-10-10
- A gate joined to its commit with `;` is not a gate: a red `npm run check` still committed and pushed once here ·
  check: `npm run check && git commit … && git push`, never `;` · 2026-10-10
