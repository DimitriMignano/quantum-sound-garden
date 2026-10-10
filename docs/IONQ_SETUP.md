# IonQ simulator setup

## On Qollab (no key needed)
Run Project → Run → Select QPU → "Remotely run simulators" → IonQ Forte 1 (or Forte Enterprise 1, Aria 1/2). Qollab
provides the access. Each Run allows one `backend.run` job on IonQ backends, so the garden gives one Bloom per Run
and says so; press Run again for another Bloom, or use the built-in simulator for unlimited Blooms. IonQ's remote
simulators apply the noise model of that QPU and simulate shot by shot, so keep shots modest (16–64).

## Standalone app (qiskit-ionq)
1. Create an API key at https://cloud.ionq.com (Settings → API keys).
2. `cp server/.env.example server/.env` and set `IONQ_API_KEY=...` (gitignored). qiskit-ionq reads this variable.
3. `npm run dev`. The creator's Backend menu lists "IonQ cloud simulator (ideal)" and "IonQ cloud simulator,
   forte-1 noise model". `IONQ_NOISE_MODEL` changes the noise model (`aria-1`, `forte-1`, …); `IONQ_TIMEOUT_SECONDS`
   bounds the wait (default 90).
4. The live test: `cd server && .venv/bin/python -m pytest tests/test_backends.py -k ionq_ideal_simulator_live`
   (skipped when the key is absent).

## Behavior without a key
`GET /api/backends` marks both IonQ backends unavailable with the reason. A run requested on them falls back to the
local Aer simulator and the result carries `fallback_from` + `fallback_reason`; the UI prints it under the result.
Local output is never labeled as IonQ output.

## Notes
- The ideal IonQ simulator returns exact probabilities rather than sampled counts (qiskit-ionq: max shots 1 for the
  ideal statevector path). `normalize_counts` scales them to the requested shots and marks `counts_kind =
  "probabilities"`; the UI says the distribution carries no shot noise.
- Only standard gates are used (x, h, p, cx), all in IonQ's `qis` gate set.
