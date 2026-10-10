# Deploying the full app (Qiskit included) to quantumnuggets.com

The Qollab upload stays the judged artifact. This is the public site for judges, teammates and anyone after the
hackathon: the same app, every result from a real Qiskit run on the server. One container serves the built web
app and the API together (`Dockerfile`), so there is nothing to wire between a front end and a back end.

## What the container is
- Stage 1 builds `web/` with Vite into `web/dist`.
- Stage 2 is `python:3.12-slim` with `server/requirements.txt` (Qiskit 2.5, qiskit-aer, qiskit-ionq, FastAPI) and
  the built app next to it; `qsg.api` serves `/api/*` and the static app at `/`.
- Listens on `$PORT` (default 8080). Runs as a non-root user. Image is about 1 GB because of Qiskit and Aer.

Local check: `docker build -t quantum-beats . && docker run --rm -p 8080:8080 quantum-beats`, then open
http://localhost:8080 and confirm the top bar says "Qiskit simulator (Aer, ideal)" and `/api/health` returns ok.

## Railway (the `railway` CLI is installed on the founder's machine)
1. `railway login` (opens a browser; a human does this once).
2. From the repo root: `railway init` (new project, name it quantum-nuggets), then `railway up` (builds the
   Dockerfile on Railway and deploys). Repeat `railway up` to ship a new commit, or connect the GitHub repo in the
   Railway dashboard for deploys on push.
3. In the service's Settings → Networking: generate a Railway domain to test, then add the custom domain
   `quantumnuggets.com` (and `www.quantumnuggets.com`). Railway shows the DNS records to create.
4. At the registrar for quantumnuggets.com: create the records Railway shows (a CNAME for `www`; for the apex either
   an ALIAS/ANAME record if the registrar supports it, or the A records Railway lists). TLS is automatic once DNS
   resolves; propagation is usually minutes, sometimes an hour.
5. Variables (Settings → Variables): none are required. Optional: `IONQ_API_KEY` to offer the IonQ simulator to
   everyone (it spends IonQ credits on every IonQ run; leave unset for a public site unless that is intended),
   `IONQ_NOISE_MODEL` (default forte-1), `IONQ_TIMEOUT_SECONDS` (default 90).

Cost: a small always-on service; Railway bills by usage, on the order of a few dollars a month for this. Aer needs
about 512 MB of RAM at rest; give the service 1 GB.

## Any other Docker host
Fly.io (`fly launch` reads the Dockerfile; set `internal_port = 8080`), Google Cloud Run (`gcloud run deploy
--source .`; set min instances to 1 to avoid the Qiskit cold start of several seconds), Render (Docker web service;
the free tier sleeps and cold-starts slowly, so use a paid instance for judging week). All of them map `$PORT`.

## After it is live
- Smoke test: open the site, press Start, finish puzzle 1; the result line under the board must name
  "Qiskit simulator (Aer, ideal)". Open `/api/backends` and confirm the IonQ entries say unavailable unless a key
  was set on purpose.
- Put the URL on the Qollab project page and in `docs/JUDGES.md`.
- The container never needs the IonQ key to be correct: every result on the site is a real Qiskit Aer run.
