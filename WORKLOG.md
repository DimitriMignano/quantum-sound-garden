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

## Needs a human (the rules, re-read 2026-10-11 12:15 ET; submissions close 2026-10-11 19:00 ET)
- Make the GitHub repository PUBLIC (the rules: public, runnable without sign-in, MIT, dependencies listed, no secrets).
  `server/.env` is gitignored; `requirements.txt` and `package.json` list the dependencies; LICENSE is MIT.
- Upload `dist/quantum-sound-garden-qollab.zip` to Qollab (New Project → Upload your own files), paste `docs/QOLLAB_PAGE.md`
  as the project page, publish under MIT. Press Run on the built-in simulator AND on the IonQ simulator before submitting
  ("only failed runs affect judging"; the top bar must read an IonQ label on the IonQ run, and the studio's Loop must read
  "Loop: one job, 8 bars" there).
- Record the 2–3 minute video (`docs/DEMO_SCRIPT.md`) and host it at a public link with no sign-in (YouTube, Loom, Vimeo
  or Drive); put the link on the project page.
- Confirm https://beats.quantumnuggets.com answers (it is deployed by a teammate from a clean clone of `main`) before submitting; if it does
  not, remove the hosted line from the Qollab page text, JUDGES.md and README.md so no link is dead.
- Declare the theme at submission: Quantum Playground. The team captain submits before 19:00 ET.
- Optional: an IonQ API key in `server/.env` (`IONQ_API_KEY=...`) proves the standalone IonQ path (the live test skips without it).

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
- 10-10 19:20 founder: "the whole time the website is open its playing a loud crazy high pitched sound -- it should be silent unless
  you play something". The constant sound was the odds bed (crickets at 4.3/4.9 kHz with square-wave chirps, plus wind) and the
  closeness drone. Now: silent by default; a move gives a one-second preview of the odds and, in a puzzle, a short closeness chord; the
  crickets are lower and softer; the hit drum got a body so an all-hits Play lands as hard as an all-thumps one. Measured: arrival 0.000
  on the intro, Tracks, Swap and puzzle pages; cue peak 0.11 then 0.000; puzzle Play peak 0.23 (was 0.07). Also found and worked
  around: Chrome's audio service on this Mac had hung (new AudioContexts never resumed); a full Chrome restart fixed it.
- 10-10 20:30 founder: sounds "don't sound like what they're supposed to represent… rain sounds like cymbals"; Play silent again;
  the rain/traffic + thunder/crowd example; progressive exposure to circuits; free creation at the end. Done: Rain rebuilt as
  pre-rendered droplets over a mid wash; Thunder as crack + rolling rumble; Traffic (road roar, tire hiss, cars, horns) and Crowd
  (six babble voices, murmur, shouts) added; tracks are now Track A = traffic/rain and Track B = crowd/thunder everywhere; each
  puzzle exposes one more layer of the circuit (1 gate names · 2 bits and odds · 3 code on solve · 4 full view); studio tempo.
  The silent Play was Chrome's audio service hung again (new AudioContexts never resume): restarted the helper, added in-app
  detection ("quit and reopen the browser") and a README section. Measured: Try it on Tracks 0.32, on Swap (rain) 0.18.
- 10-10 21:15 founder: sounds still unclear ("the 6 pulses sound nothing like thunder… I can only hear a car honk… the murmur is
  impossible to distinguish… pew pew laser noise on Play… hitting play once plays a noise once… the flowers and orbs confuse").
  Done: one Play = one reading = one sound for ~3 s (the engine still takes its readings; the Circuit view shows them all); the
  drums are gone (the "pew" was the hit drum's falling tone); the canvas garden is gone, replaced by one tile per track (its two
  sounds, an odds bar, the one that just played lit); the studio lost its beat and tempo chips; the tutorial copy says "press Play
  a few times" where the point is randomness. Open: the sounds themselves. Procedural rain/thunder/traffic/crowd are not
  recognizable to the founder; proposed CC0 recordings from Wikimedia Commons (needs the founder's go to download ~70 MB of
  sources, trimmed to a few seconds each) or simpler abstract sounds.
- 10-10 21:50 founder: "I like the real recordings idea… but I think we can also combine it with easier sounds to differentiate".
  Pulled three public-domain recordings from Wikimedia Commons (kvgarlic's rain with distant thunder, eguobyte's large crowd,
  cori's Sunday street), cut 5–6 s clips with ffmpeg (loudness-normalized, faded, mono MP3 96k, 61–73 KB each), shipped them
  inside main.js as data URLs (bundle 763 KB). Each Play now opens with a marker note per track: a low note for the first sound,
  a bell for the second, then the recording. Simple sounds (low tone, high tone, ticks) and the synthetic versions stay in the
  studio library. Credits in docs/ATTRIBUTIONS.md; disclosure on the Qollab page and in the footer.
- 10-10 22:20 founder: the marker note "just confuses it"; "easier sounds" meant steadier ones (a bell instead of a crowd, a car
  driving by instead of traffic); and Play always plays both tracks, which needs explaining or fixing. Done: marker removed; new
  one-shot Car (engine note dropping in pitch, tire noise swelling, panned left to right) and Bell (inharmonic partials); tracks are
  Track A = car/rain, Track B = bell/thunder (rain and thunder are the recordings); the tutorial is single-track until Sync, so the
  first six pages have one tile and no track selector; the selector reads "Moves apply to"; the intro and the Sync page say Play
  plays every track at once, one sound each. Events no longer double-trigger (the level's clock fires once; no explicit trigger).
- 10-10 22:50 founder: a page said "rain every time" while the car played (the learner had removed a bead; the caption was the page's
  static text); sounds bleed (a quiet "bed" of the other sounds under every Play, a previous Play's tail, overlapping Plays from
  spamming, and events skipped on a second Play because their repeat clock was still armed); nothing should sound unless Play is
  pressed; and a Duolingo-style "great job" with a ding. Done: bed 0 and a hard cut of other layers at each Play; events struck
  once per Play and clocks wait a full interval; Try it / Play / Next locked while a sound plays; the tutorial caption reports what
  actually played when the board no longer matches the page; the odds preview and the closeness chord are gone (closeness is a
  word on the page); a "Great job!" banner with a two-note ding, Next puzzle or Keep playing. Measured: arrival 0.000 everywhere,
  after a move 0.000, after a Play 0.000, buttons disabled during the sound, ding peak 0.21.
- 10-10 23:10 founder's screenshot: the "Turn, then Shuffle" page said "Turn halfway, then Shuffle: every Play is rain", the learner
  did exactly that on a fresh track and got 50/50. The sentence omitted the first Shuffle (a Turn on a steady track does nothing;
  the dial only exists on a shuffled track). Fixed the copy on the Turn pages (all three moves named, the rule stated), renamed the
  page "Shuffle, Turn, Shuffle", and the Turn button now reads "no effect: track is steady" whenever the selected track's odds are
  0 or 1. Verified by hand in Chrome: Turn on a fresh track keeps "always Car"; Shuffle, Turn, Shuffle gives "always Rain".
- 10-10 23:30 founder: "are we basically just saying Turn is useless?" Not in the physics, but in the demos: nothing showed it. Added
  "The dial sets the odds": Shuffle, Turn, Shuffle on the board and the Turn amount chips now turn the existing Turn live (½ → always
  rain, ¼ → coin toss, ⅛ → rain about one in seven), with the odds bar moving as you tap. The chips act as a live dial everywhere a
  Turn already exists on the selected track. The Turn page foreshadows it ("silent now, decisive on the next two pages").
- 10-10 23:55 founder bought quantumnuggets.com and wants the full app there (real Qiskit, correct math, easy for judges and
  teammates, and a home after the hackathon). Prepared: a two-stage Dockerfile (Vite build → python:3.12-slim with Qiskit, Aer,
  qiskit-ionq, FastAPI serving /api and the built app at /, $PORT, non-root), .dockerignore, docs/DEPLOY.md (Railway steps, DNS,
  variables, other hosts), host-neutral labels ("Qiskit simulator (Aer, ideal)", "Qiskit server… on the server"). Built the image
  locally (651 MB) and ran it: /api/health ok, the site served, two real Aer runs returned the right counts. Needs a human:
  `railway login`, then `railway init` + `railway up`, the custom domain, and the DNS records at the registrar.
- 10-11 00:20 feedback via the founder: "it feels like it takes a long time to get to the point". Criteria research (qollab.xyz
  how-it-works): four traits (novelty & creativity, technical execution, impact potential, documentation quality), no usability
  score; "judges open the project page, read the description and the code, and press Run on a free simulator"; the Playground bar
  is that superposition, interference, entanglement or measurement is essential. Decision: the entangled pair must be reachable in
  under two minutes. Tutorial cut from ten pages to five (intro · a track and Swap · Shuffle, with the second Shuffle · Turn: the
  dial · Sync, which loads the pair); the front door gained "Jump to the puzzles" and "Open the studio"; JUDGES.md has a 90-second
  path; the demo script follows the new pages.
- 10-10 21:15 founder's screenshot of puzzle 2: "the goal on this page is a lot less clear"; hints, design and buttons liked;
  "the turn degrees for the turn button should be inside the button not out". Cause: the puzzle header showed only the story;
  the goal lived in the pre-Play caption and vanished after the first Play. Now every puzzle has a goal panel under its title:
  Goal (the biggest text on the page), Done when (what you will see and hear), and a live closeness chip (far, warmer, closer,
  almost, there; Solved after the Play). Each puzzle's goal, done-when and story were rewritten in plain words; what the puzzle
  newly exposes of the circuit is one faint line under the panel. The Turn card now holds its amounts inside the card (the move
  on top, ½ ¼ ⅛ chips below, one lit; the studio's −¼ too). Closeness moved into the content module with a per-puzzle hook: the
  pair puzzle measures the weaker of its two halves (agreement, and each track a coin toss) so the hinted path reads far,
  warmer, there instead of warmer, far, there. Four new tests pin the ladder. Docs no longer claim a closeness hum (it was
  removed on 10-10; the word in the goal panel is the readout). Live in Chrome on puzzle 2: far → Shuffle A: warmer → Sync:
  there → Play: panel turns green, "Solved", the Great job! banner. Turn amounts render inside the card on the puzzle (2),
  the tutorial's Turn page (3) and the studio (4, one row at desktop width with Circuit on).
- 10-10 22:10 founder's screenshot of the Turn page: "i think the bar is backwards now". The odds fill (the hit sound's share,
  amber) was anchored at the left end, under the base sound's chip, so 85% · 15% showed a short amber bar under Car. The fill
  now sits at the right end, under the hit chip; the dark remainder on the left is the base share. The spoken label reads in
  the same order as the visible one (base, then hit). Verified live on the Turn page with Shuffle, Turn ⅛, Shuffle.
- 10-10 22:20 founder, after solving puzzle 2: goal, hints and solution were not aligned; the studio is not what was
  envisioned ("create new things… a layer of repetition"); "it never gets around to teaching the quantum"; far too many
  words; every mix that works must count; nobody may get stuck ("a see solution button"). Done, all five:
  · Every puzzle now has `solution` (the mix Show solution loads, said in words in the caption: "Shuffle Track A, then
    Sync Track A to Track B. Press Play."), hints that are the steps of that solution in order (the Sync hint names the
    selected track and what the button reads), `done` that states exactly what the check reads, and a test that the
    solution passes the check, reads "there", that the start board never passes, and that other correct mixes pass too
    (H·P(π)·H for rain; the pair built from Track B; Shuffle then Swap for the footsteps). Show solution appears after any
    missed Play. Hints disappear once the goal is met. Bug found live and fixed: after Show solution the page read Solved
    before the Play (the result phase of the missed Play met the new odds); a result now counts only for the mix it measured.
  · The quantum is taught explicitly: when a puzzle is solved, "In quantum terms" names the concept (a qubit and X;
    superposition and entanglement; interference; noise and depth) in three lines, with Go deeper for the circuit, the
    code and the sideways experiments. A recap page after puzzle 4 ("The quantum you used", nav: Quantum) maps Track,
    Swap, Shuffle, Turn, Sync, Play to qubit, X, H, P(θ), CX, measure, lists the five ideas with where they were met, and
    shows the Perfect Pair in Qiskit. Then "Make a beat".
  · The studio is a beat machine: Loop reads the mix eight times per bar and plays the readings as beats (tempo Slow,
    Medium, Fast), a fresh bar each time until Stop; the mix can change while it runs and the next bar follows. Play
    once remains. Live: Bar 1 "5 of 8: a car driving by", level 0.089; bars keep coming; Stop gives level 0.000.
  · Copy cut everywhere: the intro is three lines, each tutorial page one or two sentences, each puzzle one goal
    sentence, one done-when sentence, at most one story sentence, hints of one sentence; the welcome lead and the moves'
    descriptions shortened; Great job! is now Solved; "The same garden" is gone.
  · Docs rewritten for the flow: README, JUDGES.md (90-second path), QOLLAB_PAGE.md, DEMO_SCRIPT.md, the thesis.
- 10-10 22:55 founder: the recap page is great but not the point; keep the interactivity and let the sounds become the
  quantum picture, so people get used to playing with quantum because they remember playing with sounds. Built: the
  same four puzzles again as qubits. A vocabulary layer ("lingo", a React context every component reads) relabels the
  whole board without touching the mechanics: tracks become qubit 0 and qubit 1, the sounds become |0⟩ and |1⟩, the
  moves become X, H, P(θ) and CX, Play becomes Measure, the beads read H and CX, the Sync chip reads "CX: qubit 0 →
  qubit 1", and a state line draws the ket (|0⟩, (|0⟩ + |1⟩)/√2, (|0⟩ − |1⟩)/√2, (|0⟩ + e^{iπ/4}|1⟩)/√2,
  (|00⟩ + |11⟩)/√2, 0.92|0⟩ − 0.38i|1⟩), which is where the phase a Turn sets becomes visible. The first two qubit
  puzzles keep the sound names under the gate names and in the caption ("Measured qubit 0 → 1, qubit 1 → 1 (Rain +
  Thunder)"); the last two drop them. The recap page is now the door: the mapping table, "Play them as qubits", and the
  four qubit puzzles unlocked in order; the nav entry is Qubits. The tests cover all eight puzzles and the ket formatter.
  Live on puzzle 2 as qubits: the state line moved |00⟩ → (|00⟩ + |01⟩)/√2 → (|00⟩ + |11⟩)/√2 as H and CX were pressed;
  Measure solved it with "Measured qubit 0 → 1, qubit 1 → 1 (Rain + Thunder)" and "What you did: A Bell state".
- 10-11 12:10 founder: the qubits page should reveal what they learned and say that the help thins out; make it clear
  this is a real way of learning quantum, not a game; bridge to the studio (what are they doing when they make beats);
  the beats must be real circuits so everything they create is represented correctly; pull the competition guidelines
  and check where we stand. Rules re-read (qollab.xyz how-it-works): four traits (novelty & creativity, technical
  execution, impact potential, documentation quality), judges press Run on a free simulator, a Qiskit project runnable
  on Qollab's simulators including IonQ's, MIT, a project page, a public repo without secrets, a 2–3 minute video at a
  public link, "only failed runs affect judging: press Run on the IonQ simulator before you submit", IonQ backends take
  one job per Run, Playground bar: superposition, interference, entanglement or measurement essential. Done: the door
  page now reads "You already know the gates" (every move was a gate; the help thins out: sound names for two puzzles,
  then gone); each qubit puzzle opens with one line of context (what they did before, what to watch now); the welcome
  lead names the whole arc; the studio opens with "This is the real thing": every bar compiles the mix to a Qiskit
  circuit and runs it on the backend shown, and the circuit, the four readings, the backend select and "Your beat, in
  Qiskit" are always on the page; on one-job backends (IonQ on Qollab) Loop reads 64 shots in ONE job and plays them as
  eight bars (a bundle test proves exactly one job of 64 shots is spent); the live caption counts "Bar b · beat i of 8".
  The human checklist above is rewritten from the rules.
- 10-11 13:10 founder: creative liberty to bridge the gaps once the deploy is done; the impact must be seen in the
  language, and the goals (teaching, helping, accessibility) must feel met. Built on branch `impact` (merged to main
  once the teammate's deploy is confirmed): the front door now says who it is for and what they will have done ("For
  anyone who has never touched an instrument or a qubit. By the end you will have prepared, measured and shortened real
  quantum circuits."), shows the arc as three cards (Hear it · Name it · Build it) and an accessibility line (written as
  well as heard, keyboard, motion off); the tutorial intro names the end of the arc; after the last qubit puzzle a
  closing page, "You ran real quantum circuits", lists the four things they did in plain words next to the two-gate
  circuit's Qiskit code, then "Make a beat"; the last qubit puzzle's Next reads "See what you can do now". The project
  page, README, judges page (a new Impact section: who it is for, what they can do after fifteen minutes, accessible by
  design) and the demo script open with the same language. Keyboard pass, live: fourteen Tabs from the top of puzzle 2
  land on Swap with a visible outline, Enter adds the move, six more Tabs land on Play, Enter plays.
  Two bugs the keyboard pass surfaced, fixed in the same change: Play was `disabled` while a sound played, which threw
  keyboard focus off it (now inert: aria-disabled, ignores presses, keeps focus); and a second Play of an unchanged mix
  flipped the page to its result at once, because the "playback finished" check saw the previous playback before the
  new one existed (Play now clears the old playback first). Live: the replay reads "Playing…", keeps focus, and a press
  during playback does nothing.
- 10-11 13:50 founder: keep building the project out per the plan (the deploy is the other session's). Two gaps closed:
  the studio now offers starting points under "Start from" (Coin toss, Bell pair, One in seven, All four, Opposites),
  each a circuit the puzzles taught, named by what it does to a beat, loaded with one tap; and the first phone-width
  pass (the app root constrained to 390 px, which drives the same container queries as a phone): the top bar overflowed
  by 8–10 px on every scene (now wraps, with smaller buttons under 600 px); nothing else overflowed; the board stacks
  two moves per row with Play on its own row; the studio's pads and readings sit two per row.
- 10-11 15:00 the first real Runs on qollab.xyz (project created under the founder's account from the bundle; the
  cookie banner declined; nothing published). Built-in simulator: boots, the top bar reads "Qollab simulator
  (basic_simulator)", Qollab's console "Done" in 3.1 s. IonQ Aria 1: boots, defaults to the statevector as designed; the
  studio's Bell-pair loop ran 19 bars on the statevector path with 00/11 only. Choosing "IonQ via Qollab" and pressing
  Loop produced a wall of red: the Python-side `backend.run` POSTs from the sandbox and Qollab blocks every method but
  GET. A two-file probe project settled the mechanism: from JavaScript, `await backend.run(qc, { shots })` then
  `await job.result()` returned a real IonQ Aria 1 job in 709 ms (counts 00: 5, 11: 3), and Qollab even drew it; the
  same call inside Python failed. Fixed: the engine submits from JavaScript (`build_circuit_for_run` →
  `backend.run` → `normalize_counts_json`), keeps the Python path for local simulators, and if a remote job still fails it
  answers from the statevector with a one-line note naming what was requested and why, never a traceback; the one-job
  guard is released when no job reached IonQ. Tests: engine unit tests, the bundle tests rewritten for the JavaScript
  path, a pytest for the two entry points. The new bundle was uploaded into the existing Qollab project. Two probe
  drafts ("qsg probe (delete me)", "qsg probe 2 (delete me)") sit in the account and should be deleted by a human.
