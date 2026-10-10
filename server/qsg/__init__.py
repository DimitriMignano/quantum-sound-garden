"""Quantum Sound Garden — the quantum side.

`qsg.circuit` is pure Qiskit (no Aer, no network) so it also runs inside Qollab's Pyodide runtime, where
`main.js` calls it. `qsg.backends` and `qsg.api` are server-only (Aer, qiskit-ionq, FastAPI).
"""
