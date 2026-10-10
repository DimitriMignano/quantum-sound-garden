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
None. Every sound is synthesized at runtime with the Web Audio API (`web/src/audio/sounds.ts`): filtered noise for
rain, wind, waves and thunder; scheduled oscillators for birds, bells, heartbeat, crickets, footsteps and glitch.
No recordings, no samples, no third-party audio.

## Fonts and visuals
System fonts only. The garden is drawn procedurally on a canvas; no stock images or icons.

## License
MIT (`LICENSE`).
