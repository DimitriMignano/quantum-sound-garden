# Attributions and disclosures

_This effort is supported by Qollab & IonQ._

## Built during the hackathon window
All code, copy and documentation in this repository were created on 2026-10-10 and 2026-10-11, inside the build
window. There was no pre-existing project, template or fork. The repository was scaffolded from an empty
`CLAUDE.md` + `.gitignore` commit.

## AI assistance
Claude Code (Anthropic) wrote code, tests and documentation under human direction; its sessions were reviewed by a
second model (OpenAI Codex CLI) whose findings were triaged and applied by hand where confirmed. The humans decided
the product, the science claims and what shipped.

## Libraries
- Qiskit 2.5 (Apache-2.0), qiskit-aer 0.17 (Apache-2.0), qiskit-ionq 1.1 (Apache-2.0)
- FastAPI, uvicorn, pydantic, python-dotenv, pytest, httpx (MIT/BSD)
- React 19 (MIT), Vite 8 (MIT), TypeScript (Apache-2.0), vitest (MIT), concurrently (MIT)

## Sound assets
Four short cuts (5–6 s, mono MP3, loudness-normalized, fades added) of public-domain field recordings, taken from
Wikimedia Commons on 2026-10-10 and shipped inside the bundle (`web/src/audio/samples/`):

| In the app | Source file (Wikimedia Commons) | Author | License |
|---|---|---|---|
| Rain (0:55–1:01) and Thunder (1:17.8–1:22.8) | "Light Rain Distant Thunder July 5th 2016.wav" | kvgarlic (freesound.org/people/kvgarlic/sounds/349454) | CC0 1.0 |
| Crowd (0:46–0:52) | "360703 eguobyte large-crowd-medium-distance-stereo.wav" | eguobyte (freesound.org/people/eguobyte/sounds/360703) | CC0 1.0 |
| Traffic (3:09–3:15) | "Sunday in the city street noise1.ogg" | cori (pdsounds.org, sunday-afternoon1) | Public domain |

Every other sound (wind, waves, birds, footsteps, heartbeat, bells, crickets, glitch, the low and high tones, ticks,
the "(synth)" versions of rain, thunder, traffic and crowd, the marker notes and the closeness chord) is synthesized
at runtime with the Web Audio API (`web/src/audio/sounds.ts`, `web/src/audio/mixer.ts`).

## Fonts and visuals
System fonts only. The track tiles are plain HTML and CSS; the welcome animation is drawn on a canvas; no stock images or icons.

## License
MIT (`LICENSE`).
