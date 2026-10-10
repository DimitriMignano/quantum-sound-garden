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
