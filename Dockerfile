# Quantum Beats Studio — one container: the built web app served by the FastAPI + Qiskit server.
# Build:  docker build -t quantum-beats .      Run:  docker run -p 8080:8080 quantum-beats
# The platform sets PORT (Railway, Fly, Cloud Run all do); it defaults to 8080.

# ---- 1. build the web app -------------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json* ./
COPY web/package.json web/package-lock.json* ./web/
RUN npm ci --no-audit --no-fund && cd web && npm ci --no-audit --no-fund
COPY web ./web
RUN cd web && npx vite build

# ---- 2. the server, with the built app next to it --------------------------------------------------------------
FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PORT=8080
WORKDIR /srv
COPY server/requirements.txt ./server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt
COPY server ./server
COPY --from=web /app/web/dist ./web/dist
WORKDIR /srv/server
EXPOSE 8080
# a non-root user: nothing here needs privileges
RUN useradd -r -u 10001 studio && chown -R studio:studio /srv
USER studio
CMD ["sh", "-c", "python -m uvicorn qsg.api:app --host 0.0.0.0 --port ${PORT}"]
