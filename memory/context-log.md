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
