#!/usr/bin/env node
// Builds the Qollab JS/Qiskit project into ./qollab and zips it into ./dist. Idempotent; asserts every file it needs.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const final = resolve(root, 'qollab');
const q = resolve(root, 'qollab.staging');

// Build into a fresh staging folder so nothing stale can ride along, then replace qollab/ atomically.
rmSync(q, { recursive: true, force: true });
mkdirSync(q, { recursive: true });
execSync('npx vite build', { cwd: resolve(root, 'web'), stdio: 'inherit', env: { ...process.env, QOLLAB: '1', QOLLAB_OUT: q } });

// The Python module Qollab imports as `qsg.circuit` — the exact file the server tests validated.
mkdirSync(resolve(q, 'qsg'), { recursive: true });
cpSync(resolve(root, 'server/qsg/circuit.py'), resolve(q, 'qsg/circuit.py'));
writeFileSync(resolve(q, 'qsg/__init__.py'), '"""Quantum Sound Garden: pure Qiskit circuit model (see circuit.py)."""\n');
writeFileSync(resolve(q, 'requirements.txt'), 'qiskit>=2.5.2,<3.0.0\n');

// index.html for Qollab: body content only, no <script> (Qollab runs main.js itself).
const devHtml = readFileSync(resolve(root, 'web/index.html'), 'utf8');
const body = devHtml.match(/<div id="qsg-root"[\s\S]*?<\/div>/)?.[0];
if (!body) throw new Error('web/index.html: could not find the #qsg-root block');
writeFileSync(resolve(q, 'index.html'), body + '\n');

// The project write-up Qollab shows (README.md at the top level becomes the page).
cpSync(resolve(root, 'docs/QOLLAB_PAGE.md'), resolve(q, 'README.md'));
cpSync(resolve(root, 'LICENSE'), resolve(q, 'LICENSE'));

// Assert, then zip.
const required = ['index.html', 'main.js', 'main.css', 'qsg/circuit.py', 'qsg/__init__.py', 'requirements.txt', 'README.md', 'LICENSE'];
for (const f of required) {
  const p = resolve(q, f);
  if (!existsSync(p)) throw new Error(`qollab bundle missing ${f}`);
  if (statSync(p).size > 2 * 1024 * 1024) throw new Error(`${f} exceeds Qollab's 2 MB per-file limit`);
}
const mainJs = readFileSync(resolve(q, 'main.js'), 'utf8');
if (!/from\s*["']qsg\.circuit["']/.test(mainJs)) throw new Error('main.js lost its `qsg.circuit` import (must stay external)');
if (/<script/i.test(readFileSync(resolve(q, 'index.html'), 'utf8'))) throw new Error('qollab/index.html must not contain <script>');
const extra = readdirSync(q, { recursive: true }).map(String).filter((f) => !statSync(resolve(q, f)).isDirectory() && !required.includes(f));
if (extra.length) throw new Error(`unexpected files in the Qollab bundle: ${extra.join(', ')}`);
rmSync(final, { recursive: true, force: true });
renameSync(q, final);
mkdirSync(resolve(root, 'dist'), { recursive: true });
const zip = resolve(root, 'dist/quantum-sound-garden-qollab.zip');
if (existsSync(zip)) rmSync(zip);
execSync(`zip -q -r ${JSON.stringify(zip)} . -x '.DS_Store'`, { cwd: final, stdio: 'inherit' });
const kb = (statSync(resolve(final, 'main.js')).size / 1024).toFixed(0);
console.log(`qollab bundle ok: ${required.length} files, main.js ${kb} KB -> ${zip}`);
