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

### 2026-10-10 17:45 — Quantum Beats Studio: audio-first reframe after the founder's second look
- Branch / worktree: `main`
- Task: the founder opened the app and still did not know what was going on. Asked for: a front door that says what it
  is and excites; then a real tutorial, one page per move; no quantum language (no 0s and 1s) at first; moves that make
  sense in a musical context; "Hear it" must audibly do something; and the edge, "you could play ours with your eyes
  closed… hear that you're getting closer".
- Files changed: `web/src/content/content.ts` (studio vocabulary, Track base/hit model, LESSONS, puzzle targets),
  `web/src/app/{Welcome,TutorialScene,StudioScene}.tsx` (new; MovesScene and CreatorScene removed),
  `web/src/app/{App,TopBar,ChallengeScene,GardenView,Board,PathView,DeeperPanel}.tsx`, `web/src/audio/mixer.ts`
  (GoalHum: closeness 0..1 → tritone/beating to octave), `web/src/audio/engine.ts` (analyser + level()),
  `web/src/main.tsx` (dev-only `window.__QSG_AUDIO__`), `web/src/engine/code.ts` + `server/qsg/circuit.py` +
  `server/tests/test_circuit.py` (gate comments in studio words, parity kept), `web/src/styles.css`,
  `web/src/test/qollab-bundle.test.ts`, `qollab/` (rebuilt), `docs/{DEMO_SCRIPT,JUDGES,QOLLAB_PAGE}.md`, `README.md`,
  `CLAUDE.md` (thesis), `WORKLOG.md`
- Verification run: pytest 27 passed + 1 skipped (fixture regenerated with the new comments); tsc clean; full gate in
  the commit chain. Live in Chrome (local server) with the audio meter: AudioContext running after Start; idle odds
  hum RMS ≈ 0.05; during "Try it" on lesson 1 RMS rose to ≈ 0.10 and the caption walked "3 of 6: crickets… and wind…"
  → "Crickets on every beat…"; lesson 2 shows only Swap; puzzle 1 caption "The hum says: far" → after Swap "there" →
  Play → "Solved. You heard Rain every time." Not live-tested: puzzles 2–4 and the studio in this build (same scene
  code as before; smoke-tested), phone width, keyboard-only, the real Qollab runtime, IonQ.
- Commit hash: this commit (parent 3be7309)
- Seams (§22): surface LIVE (reframed) · hosted/delivery PARTIAL as before (Qollab upload is a human's act)
- Decisions: in-app title "Quantum Beats Studio" (the founder's phrase; one constant, `APP.title`), repository name
  unchanged; moves renamed Swap/Shuffle/Turn/Sync/Play with gate names only in Circuit view and Why?; every track
  always plays one of two sounds (base/hit) so nothing is ever silent by accident; the guess step is gone, the closeness
  hum replaces it as the feedback loop; puzzle 4's closeness also counts extra moves; the tutorial board shows only the
  moves the page is about.
- Deferred work: phone-width pass; keyboard pass; a louder/clearer hum option; three-track studio.
- Risks: the hum is a design guess until a human listens (tritone→octave mapping, levels); puzzles 2–4 not replayed live.

### 2026-10-10 18:30 — Beats you can feel, and context first
- Branch / worktree: `main`
- Task: the founder could not hear "Try it" and asked for context before the first page.
- Files changed: `web/src/audio/mixer.ts` (Pulse: one drum per track per beat, thump vs snap, stereo by track; hit
  envelope on textures; blend 0.7), `web/src/audio/engine.ts` (volume 0.85, limiter −6 dB, ceiling 0.9),
  `web/src/content/content.ts` (intro lesson; lesson 1–2 copy names the thump and the snap), `web/src/app/TutorialScene.tsx`
  (intro page), `web/src/styles.css`, `qollab/` (rebuilt), `WORKLOG.md`
- Verification run: tsc clean; full gate in the commit chain. Live in Chrome with the master-bus meter: idle hum RMS ≤ 0.12;
  "Try it" on lesson 1 peaks RMS 0.311 (mean 0.10 over 1.8 s) versus 0.166 before the drums and the louder chain. The intro
  page renders with five numbered lines and "Learn the moves" leads to "Tracks".
- Commit hash: this commit (parent 7884b08)
- Seams (§22): unchanged (surface LIVE; hosted/delivery PARTIAL until a human publishes on Qollab)
- Decisions: the beat is a drum, not a crossfade: textures alone cannot carry a beat on laptop speakers; the drum encodes
  the reading (thump = first sound, snap = hit) so the eyes-closed promise holds for any sound choice; the limiter stays
  as the safety net, just later (−6 dB).
- Deferred work: a human listening pass on levels and the hum; phone width; keyboard.
- Risks: loudness judged by a meter, not by an ear; the drum timbres are a first guess.

### 2026-10-10 19:20 — Silent until you play
- Branch / worktree: `main`
- Task: the founder heard a loud high-pitched sound the whole time the page was open. It was the "hearing the odds" bed
  (crickets + wind from the moment the tutorial mounted) plus the closeness drone in puzzles. Requirement: silent unless
  you play something.
- Files changed: `web/src/audio/mixer.ts` (preview(): one second of the odds then fade; GoalHum.set() is a cue that
  fades itself; silence() clears the preview timer; the hit drum gained a highpassed noise burst at 1.4 and a falling
  triangle tone), `web/src/audio/sounds.ts` (crickets 3.1/3.5 kHz, sine chirp, Q 3, weight 0.14), `web/src/app/useGarden.ts`
  (preview only when the odds change by value; no bed on mount or page change; stopPlayback no longer re-blends),
  `web/src/app/ChallengeScene.tsx` (closeness cue after a move, compared by value, never on arrival),
  `web/src/content/content.ts` (intro and "The cue" copy), `qollab/` (rebuilt), `WORKLOG.md`
- Verification run: tsc clean; `npm run check` green (pytest 27 passed + 1 skipped, vitest 69 passed, bundle 403 KB).
  Live in Chrome with the master-bus meter (RMS): intro 0.000 · Tracks page 0.000 · Swap page 0.000 · puzzle arrival 0.000 ·
  Swap cue peak 0.106, back to 0.001 within 2.4 s, 0.000 after · Play in puzzle 1 peak 0.227 (0.071 before the snap fix).
  A first guard ("skip the first effect run") failed under StrictMode's double effects and on tutorial page changes (reset
  to a new empty array): both measured as non-zero arrival, fixed by comparing the odds by value.
- Commit hash: this commit (parent 0961580)
- Seams (§22): unchanged
- Decisions: nothing sounds on its own; every sound is caused by a press (Play, Try it) or is a one-second cue after a
  move. The closeness feedback survives as a cue, not a drone. Chrome's hung audio service (new contexts never resume)
  is an environment fault, not app code: the app's Start waits on resume() by design so it cannot claim audio it does
  not have.
- Deferred work: a human listening pass; phone width; keyboard.
- Risks: levels judged by a meter; the cue length (1 s) and the crickets timbre are guesses until someone listens.

### 2026-10-10 20:30 — Recognizable sounds, the founder's pairing, progressive circuit exposure
- Branch / worktree: `main`
- Task: the founder: rain sounded like cymbals and nothing else was identifiable; Play was silent again; the example
  "rain and traffic together, thunder and a crowd together… split each, then combine" (which is exactly the Bell pair:
  Shuffle A, Sync A to B); exposure to the real circuit should grow puzzle by puzzle; the end state is free creation.
- Files changed: `web/src/audio/sounds.ts` (Rain: a 6 s pre-rendered droplet buffer, ~150 impacts/s, damped sines plus
  noise, over a 250–1800 Hz wash; Thunder: white-noise crack then a brown rumble with a 2.6–4 Hz roll, 1.5–2.4 s; Traffic
  replaces City: road roar, tire hiss, cars every 1–3 s with a 500→1700→420 Hz sweep, two-tone horns every 4–11 s; Crowd:
  six formant-swept babble voices pulsing at 3–5 Hz, a low murmur, sawtooth shouts), `web/src/content/content.ts`
  (Track A traffic/rain, Track B crowd/thunder in tutorial, puzzles and studio defaults; `exposure` 1–4 per puzzle),
  `web/src/app/ChallengeScene.tsx` (exposure: gate names ≥1, readings ≥2, code on solve ≥3, full view 4),
  `web/src/app/StudioScene.tsx` (tempo), `web/src/audio/engine.ts` + `web/src/app/{App,Welcome}.tsx` (a resume() that
  does not settle in 2.5 s sets `stuck` and the welcome says to quit and reopen the browser), `README.md`,
  `docs/LIMITATIONS.md`, `qollab/` (rebuilt), `WORKLOG.md`
- Verification run: tsc clean; `npm run check` green (pytest 27 + 1 skipped, vitest 69, bundle 409 KB). Live in Chrome
  after restarting Chrome's audio helper: Tracks "Try it" peak 0.323 with caption "traffic going by and a crowd
  murmuring"; Swap "Try it" peak 0.175 with "rain falling and a crowd murmuring"; console shows only Vite refresh notes.
  Not verified: how the new sounds read to a human ear (the whole point); Thunder's new trigger path (not played live);
  puzzles 2–4 and the studio with the new sounds.
- Commit hash: this commit (parent 618c139)
- Seams (§22): unchanged
- Decisions: identifiability over realism: each sound carries one unmistakable cue (droplets, a crack, horns, babble);
  the founder's pairing is the canonical track set because it makes the Bell pair intuitive ("rain with thunder, traffic
  with the crowd, never crossed"); circuit exposure is a per-puzzle number so the curve is one line to tune; the Chrome
  audio hang is treated as an environment fault with detection and documentation, not as app code.
- Deferred work: a human listening pass on all four sounds; three-track studio; saving and sharing beats; a tempo in puzzles.
- Risks: Chrome's audio service on this Mac hangs repeatedly (twice today); a judge's machine may differ, but the README now
  says what to do; the sounds are judged by a meter and by design intent, not by ear.

### 2026-10-10 21:15 — One Play, one sound; tiles instead of flowers; the drums are gone
- Branch / worktree: `main`
- Task: the founder: the sounds are unidentifiable, Play made a "pew pew" laser noise and repeated six times, the flowers
  and orbs confuse. Rules now: Play once = one sound once (longer is fine); nothing repeats; the picture must fit.
- Files changed: `web/src/audio/mixer.ts` (Pulse removed; a single moment swells, holds, fades; multi-moment still works),
  `web/src/app/GardenView.tsx` (canvas gone; one tile per track: two sounds, odds bar, the landed one lit; Sync chips;
  outcome cards only in Circuit view; describeHeard takes the played reading), `web/src/garden/renderer.ts` (deleted),
  `web/src/content/content.ts` (single-Play copy for the intro, lessons, puzzles, actions; LEGEND removed),
  `web/src/app/{TutorialScene,ChallengeScene,StudioScene,App}.tsx` (moments: 1, 3–4 s; "Hear it again"; the studio
  drops beat and tempo chips and derives its tiles from the pads), `web/src/audio/sounds.ts` (rain/traffic/crowd weight
  1.0), `web/src/styles.css` (tiles), `README.md`, `docs/{QOLLAB_PAGE,DEMO_SCRIPT}.md`, `CLAUDE.md`, `qollab/`, `WORKLOG.md`
- Verification run: tsc clean; `npm run check` green before the weight change (pytest 27 + 1 skipped, vitest 69, bundle
  394 KB), rerun in the commit chain. Live in Chrome: Start → Learn → Tracks → Try it plays one sound (caption "Traffic
  going by and a crowd murmuring", tiles "Track A · Traffic | Rain · always Traffic" with Traffic lit, peak RMS 0.135 before
  the weight raise). Chrome's audio hung a third time this evening before this check; the helper restart cleared it.
- Commit hash: this commit (parent 78ce7c2)
- Seams (§22): unchanged
- Decisions: a Play is one measurement you hear, not a sequence; the engine still takes its readings (12–64) so the Circuit
  view keeps predicted-versus-measured bars and puzzle 4 keeps its match score, and the copy says you hear the first reading;
  the picture is the two sounds and a bar, nothing metaphorical; the drums were a crutch for ambient textures and are gone
  because the sounds themselves must carry recognition.
- Deferred work: real recordings (CC0 from Wikimedia Commons, pending the founder's go) or simpler abstract sounds; a human
  listening pass; keyboard; phone width.
- Risks: identifiability of the procedural sounds is the open problem; the single-sound level (RMS ≈ 0.13–0.2) may read as
  quiet on laptop speakers; Chrome's audio service on this Mac keeps hanging.

### 2026-10-10 21:50 — Real recordings, plus a marker note so the ear is never guessing
- Branch / worktree: `main`
- Task: the founder chose real recordings and asked to combine them with easier sounds to differentiate.
- Files changed: `web/src/audio/samples/{rain,thunder,traffic,crowd}.mp3` (new; cut from CC0/public-domain Wikimedia Commons
  recordings with ffmpeg: rain 0:55–1:01 and thunder 1:17.8–1:22.8 of kvgarlic's "Light Rain Distant Thunder July 5th 2016",
  crowd 0:46–0:52 of eguobyte's large crowd, traffic 3:09–3:15 of cori's "Sunday in the city street noise1"; loudnorm −18
  LUFS, thunder −14; fades; mono 44.1 kHz MP3 96k), `web/src/audio/samples/mp3.d.ts`, `web/src/audio/sounds.ts` (Sample
  layer: fetch + decodeAudioData once per context, looping textures, one-shot thunder; Tone and Ticks simple sounds;
  synthetic versions kept as "(synth)"), `web/src/audio/mixer.ts` (Marker: per track, A2 note for the first sound, a bell
  for the second, at the start of each Play), `web/vite.config.ts` (assetsInlineLimit 1.5 MB in both builds so the
  recordings ride inside main.js as data URLs: Qollab serves one bundle, no asset paths to guess), `web/src/content/content.ts`
  (intro and lesson copy name the notes), `web/src/app/App.tsx` (footer), `docs/ATTRIBUTIONS.md`, `docs/QOLLAB_PAGE.md`,
  `qollab/` (rebuilt, 763 KB), `WORKLOG.md`
- Verification run: tsc clean; `npm run check` green (pytest 27 + 1 skipped, vitest 69, bundle 8 files, main.js 763 KB, four
  data:audio/mpeg URLs inside). Live in Chrome with the meter: Tracks "Try it" → "Traffic going by and a crowd murmuring"
  peak 0.287; "Turn, then Shuffle" → "Rain falling and a crowd murmuring" 0.125; "Sync" → "Rain falling and thunder rolling"
  0.156; no console errors. Sources were downloaded with the founder's go ("I like the real recordings idea"), 55 MB in a
  scratch folder, never run, read only by ffmpeg.
- Commit hash: this commit (parent ae71a11)
- Seams (§22): unchanged
- Decisions: recordings inlined as data URLs rather than files next to main.js, because the Qollab runtime's asset path is
  undocumented and a self-contained bundle cannot 404; the marker note is a musical interval (A2 vs a bell on E5), not a
  drum and not a sweep, so it reads as "which one" and never as a laser; the synthetic sounds stay in the studio under
  "(synth)" names so nothing already built is lost.
- Deferred work: a human listening pass (now the thing that matters); keyboard; phone width.
- Risks: a distant thunder cut may still read as rumble rather than a clap; the clips are 5–6 s, so a studio Play (4 s)
  never loops but a longer one would; MP3 decoding in Firefox/Safari was not tested here.

### 2026-10-10 22:20 — Steadier sounds, one track until Sync, "Moves apply to"
- Branch / worktree: `main`
- Task: the founder: the per-track marker note confuses; "easier sounds" = steadier ones (bell instead of crowd, a car driving
  by instead of traffic); Play always plays both tracks, explain or fix.
- Files changed: `web/src/audio/mixer.ts` (Marker removed; no explicit event trigger: the layer's clock fires once when the
  level rises, which also ends the double thunder), `web/src/audio/sounds.ts` (Car and Bell one-shots; clocks at 7 s and 6 s so
  one Play is one pass or one strike), `web/src/content/content.ts` (Track A car/rain, Track B bell/thunder; lesson `tracks`
  count, 1 until Sync; copy says Play plays every track at once), `web/src/app/TutorialScene.tsx` (per-page track count),
  `web/src/app/Board.tsx` ("Moves apply to"), docs, `qollab/`, `WORKLOG.md`
- Verification run: tsc clean; `npm run check` green (pytest 27 + 1 skipped, vitest 69, bundle). Live in Chrome: "A track" page
  shows one tile and no selector, Try it → "A car driving by" peak 0.141; Sync page shows two tiles, selector "Moves apply to",
  Try it → "Rain falling and thunder rolling" peak 0.121; no console errors.
- Commit hash: this commit (parent e2a3cd4)
- Seams (§22): unchanged
- Decisions: Play plays all tracks at once by design (the pair puzzle needs it); the fix is to introduce the second track only
  when Sync needs it and to label the selector by what it does; the car and bell are synthesized because they must be steady
  and short, while rain and thunder stay recordings because textures are what synthesis does worst.
- Deferred work: a human listening pass; keyboard; phone width.
- Risks: the car and bell are judged by design, not by ear; thunder is a distant rumble.
