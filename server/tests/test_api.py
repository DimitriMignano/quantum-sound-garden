from fastapi.testclient import TestClient

from qsg.api import app

client = TestClient(app)


def test_health_and_backends():
    assert client.get("/api/health").json()["ok"] is True
    ids = {b["id"] for b in client.get("/api/backends").json()}
    assert {"local-ideal", "local-noisy-teaching", "ionq-ideal", "ionq-noisy"} <= ids


def test_ideal_endpoint_returns_code_and_probabilities():
    r = client.post("/api/ideal", json={"n_qubits": 2, "ops": [{"op": "split", "q": 0}, {"op": "link", "control": 0, "target": 1}]})
    assert r.status_code == 200
    body = r.json()
    assert abs(body["probabilities"]["11"] - 0.5) < 1e-9 and "qc.cx(0, 1)" in body["qiskit_code"] and "OPENQASM" in body["qasm"]


def test_run_endpoint_and_validation():
    r = client.post("/api/run", json={"n_qubits": 1, "ops": [{"op": "flip", "q": 0}], "shots": 50, "backend_id": "local-ideal", "seed": 1})
    assert r.status_code == 200 and r.json()["counts"]["1"] == 50 and r.json()["backend"]["id"] == "local-ideal"
    bad = client.post("/api/run", json={"n_qubits": 1, "ops": [{"op": "link", "control": 0, "target": 0}]})
    assert bad.status_code == 400 and "itself" in bad.json()["detail"]
    unknown = client.post("/api/run", json={"n_qubits": 1, "ops": [], "backend_id": "nope"})
    assert unknown.status_code == 400
