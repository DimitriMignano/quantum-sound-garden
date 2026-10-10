# Context Log — quantum-sound-garden — APPEND ONLY

Every work session appends one entry below (CLAUDE.md §6). **Never edit or delete past entries** —
corrections go in a new entry. Newest at the bottom. Fill every field (`n/a` if truly none).

## Entry template
```
### YYYY-MM-DD HH:MM — <short title>
- Branch / worktree:
- Task:
- Files changed:
- Verification run:
- Commit hash:
- Seams (§22): data · seam · surface · console · hosted · delivery — each LIVE, PARTIAL (what is missing) or n/a
- Decisions:
- Deferred work:
- Risks:
```

---

### 2026-10-10 — Scaffolded
- Branch / worktree: `main`
- Task: create the repo (CLAUDE.md, this log, .gitignore, secret scanner).
- Files changed: `CLAUDE.md`, `memory/context-log.md`, `.gitignore`
- Verification run: n/a (no code yet)
- Commit hash: the scaffold commit
- Seams (§22): n/a
- Decisions: none yet — the thesis and the stack are owed before the first line of product code.
- Deferred work: fill CLAUDE.md §1, §3, §7.
- Risks: n/a

### 2026-10-10 12:05 — Thesis, stack decision, Qollab runtime constraints
- Branch / worktree: `main`
- Task: read the hackathon rules and Qollab runtime docs; decide the architecture; scaffold web + server.
- Files changed: `CLAUDE.md`, `web/` (Vite react-ts scaffold + vitest + jsdom), `server/.venv` (untracked)
- Verification run: none yet (no product code)
- Commit hash: pending
- Seams (§22): n/a
- Decisions:
  - Qollab runs projects in-browser on Pyodide; a JS project = `index.html` + `main.js` (+ `main.css`), Python modules
    callable from JS, `backend` global chosen in the Select QPU dialog. So the judged artifact is a Qollab JS/Qiskit
    project, built by Vite (library mode) from one React + TypeScript codebase; the same app runs locally against a
    FastAPI + Qiskit server (local Aer, Aer noise, IonQ via qiskit-ionq) and, with nothing else, on a labeled browser
    fallback. Reason: the rules require "published and runnable on Qollab"; a hosted server alone would fail that.
  - Python 3.12 venv (Aer wheels), qiskit 2.5.2 (Qollab pins `qiskit>=2.5.2,<3`), qiskit-aer 0.17.2, qiskit-ionq 1.1.1,
    fastapi 0.143. Web: Vite 8, React 19, TS 6, vitest 4. Sounds are procedural Web Audio behind a SoundAsset
    interface (no licensing risk, no network, cohesive).
  - Second opinions (the brief's "Astra"): no review script exists yet; use `codex exec` read-only on this repo at
    the brief's milestones, at most three runs.
- Deferred work: everything below in WORKLOG.md
- Risks: Qollab's exact `backend`/Python-proxy behavior is documented thinly; the bundle is untestable here without a
  Qollab account, so the Qollab engine is written defensively and the first upload is the live test.

### 2026-10-10 15:00 — The whole first draft: quantum core, engines, audio, garden, challenges, creator, docs, two reviews
- Branch / worktree: `main` (origin: github.com/DimitriMignano/quantum-sound-garden, private)
- Task: build the hackathon draft end to end from the brief; make it honest, testable and uploadable to Qollab.
- Files changed: `server/qsg/{circuit,backends,api}.py`, `server/tests/*`, `web/src/**` (engine · audio · garden · app ·
  content · test), `web/vite.config.ts`, `scripts/build-qollab.mjs`, `qollab/` (built artifact, committed), `docs/*`,
  `README.md`, `LICENSE`, `WORKLOG.md`, `package.json`, `CLAUDE.md`
- Verification run: `npm run check` green at 01baee6 — pytest 26 passed + 1 skipped (live IonQ, no key), tsc clean,
  vitest 69 passed (parity vs Qiskit on 19 fixture circuits incl. X basis, code byte-identical; taught behaviors;
  sampling; noise; built-bundle smoke test in a Qollab-shaped jsdom page), Qollab bundle built (8 files, main.js 392 KB).
  Live in Chrome against the local server: challenges 1–4 solved end to end, both "Go deeper" comparisons, skip/replay,
  hidden-odds gating, prediction lock. Not live-tested: the creator scene, phone width, keyboard-only navigation, the
  real Qollab runtime (no account here), the IonQ path (no key).
- Commit hash: 02c40bb → 55137c8 → 5856cff (gate was red; fixed in 1f6ead6) → 01baee6
- Seams (§22): data n/a · seam LIVE (three engines, parity-tested) · surface LIVE (all scenes) · console n/a ·
  hosted PARTIAL (nothing hosted; Qollab upload is a human's act) · delivery PARTIAL (`npm run build:qollab` produces
  the zip; upload + publish + video + submission still owed) — overall PARTIAL until a human publishes on Qollab.
- Decisions: Qollab JS/Qiskit project as the judged artifact (runtime docs); one React codebase for Qollab + standalone;
  procedural Web Audio instead of samples; a TS statevector for instant preview, held to Qiskit by fixtures; one
  stochastic Pauli noise model on both sides; on IonQ-in-Qollab the challenges bloom on Qiskit's Statevector and the
  single job is spent only on request; odds hidden until a prediction is committed; X-basis "Bloom sideways" with
  classical twins and a dephased twin as the quantum-vs-classical payoff; `codex exec` read-only as the second opinion
  (2 runs: 30 + 10 findings, triaged in WORKLOG and here: the P0/P1s fixed, the IonQ-detection heuristic and the
  missing real Qollab integration test accepted and documented, procedural-randomness and creator-always-open rejected).
- Deferred work: human steps in WORKLOG.md (IonQ key, public repo, Qollab upload + first live run, video, submission);
  per-shot order from IonQ; CHSH game; custom sounds/export.
- Risks: the Qollab adapter is only smoke-tested against a fake module and backend — the first upload is the real test;
  IonQ detection keys on the backend name containing "ionq"; the repo is private while the rules require public.

### 2026-10-10 16:45 — Sound board redesign: rulebook first, then puzzles, then freedom
- Branch / worktree: `main`
- Task: the founder's first look ("a kid should know exactly what to do and why"; "rules first, then freedom"; "a sound
  board, fewer buttons, less reading"). Rebuild the app layer around one board: the garden, four big moves, Bloom, the path.
- Files changed: `web/src/app/{App,TopBar,Board,MovesScene,ChallengeScene,CreatorScene,GardenView}.tsx` (ActionBar.tsx
  removed), `web/src/content/content.ts` (kid-level ACTIONS, RULES), `web/src/audio/mixer.ts` (nameFor),
  `web/src/garden/renderer.ts` (buds show sound names), `web/src/engine/server.ts` (no env-var name in UI copy),
  `web/src/styles.css`, `web/src/test/qollab-bundle.test.ts` (new flow), `qollab/` (rebuilt), `docs/{DEMO_SCRIPT,JUDGES,QOLLAB_PAGE}.md`, `README.md`, `WORKLOG.md`
- Verification run: `npm run check` green before the unlock-on-solve patch (pytest 27 passed + 1 skipped, tsc clean,
  vitest 69 passed incl. the bundle smoke test on the new flow, bundle built); rerun in the commit chain. Live in Chrome
  (local server): welcome → Moves → "Hear it" on Twist-then-Split (plays, caption shows the rule's explanation, ✓) →
  Start the puzzles → Flip → Bloom → choices → "Always rain" → "Solved. You heard Rain every time. Your guess was right."
  → Why? (X gate, code) → Creator pads and board. Not live-tested: phone width after the redesign (Chrome resize did not
  apply), keyboard-only, puzzles 2–4 in the new layout (logic unchanged; smoke-tested), the real Qollab runtime, IonQ.
- Commit hash: this commit (parent 6097462)
- Seams (§22): surface LIVE (redesigned) · hosted/delivery PARTIAL as before (Qollab upload is a human's act)
- Decisions: rules are stated as rules including the non-classical ones ("two Splits cancel", "a Twist is silent until the
  next Split", "a linked split pair always agrees") so freedom does not lose the quantum core; the path of beads is the
  always-visible circuit and the Circuit toggle is the quantum representation for judges; Bloom asks for the guess (no
  separate prediction panel); twist amounts ½ and ¼ in puzzles, all four in the creator; puzzle N+1 unlocks on solve.
- Deferred work: a phone-width pass; keyboard pass; three-seed gardens for more creator freedom (after the deadline).
- Risks: the redesign is live-tested only on puzzle 1 and the rulebook; puzzles 2–4 share the same scene code.
