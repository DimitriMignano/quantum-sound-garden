# Deploying the full app (Qiskit included) to beats.quantumnuggets.com

The intended public address is **https://beats.quantumnuggets.com** (not live as of 2026-10-11 16:55 ET: no DNS record yet). The apex, quantumnuggets.com, is the team's landing page
(it links to this app and to a teammate's project), so this app never claims the apex or `www`.

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

## Railway, dashboard route (recommended when the account hosts other projects)
New Project → Deploy from GitHub repo → `DimitriMignano/quantum-sound-garden`. Railway detects the Dockerfile. This creates a
new project with nothing shared with other projects. Then Settings → Networking: a Railway domain to test, then the custom
domain `beats.quantumnuggets.com`; Settings → Resources: 1 GB memory. Deploys on every push to `main`.

## Railway, CLI route (the `railway` CLI is installed on the founder's machine)
Safety: run every command from this repo's folder (it is not linked to any project); `railway init` creates a NEW project;
`railway status` must show that project before `railway up`; `.railwayignore` keeps `server/.env` and the virtualenv out of
every upload. Never run delete, unlink, environment or variable commands against anything else.
1. `railway login` (opens a browser; a human does this once).
2. From the repo root: `railway init` (new project, name it quantum-nuggets), then `railway up` (builds the
   Dockerfile on Railway and deploys). Repeat `railway up` to ship a new commit, or connect the GitHub repo in the
   Railway dashboard for deploys on push.
3. In the service's Settings → Networking: generate a Railway domain to test, then add the custom domain
   `beats.quantumnuggets.com`. Railway shows the DNS record to create.
4. At the registrar for quantumnuggets.com: create the CNAME for `beats` that Railway shows. The apex and `www` belong
   to the landing page; do not touch their records. TLS is automatic once DNS resolves; propagation is usually
   minutes, sometimes an hour.
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
- The URL is already on the Qollab project page text, in `docs/JUDGES.md` and in `README.md`; if the site is not
  answering at submission time, remove those lines rather than ship a dead link.
- The container never needs the IonQ key to be correct: every result on the site is a real Qiskit Aer run.
