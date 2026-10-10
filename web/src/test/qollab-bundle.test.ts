/**
 * Boots the BUILT Qollab bundle (qollab/main.js) in a Qollab-shaped page: a #qsg-root body fragment, a global
 * `backend`, and `qsg.circuit` resolved to a Pyodide-shaped fake. Proves the artifact we upload starts, picks the
 * Qollab engine, labels the backend, computes ideals through the Python-shaped module and runs a bloom through
 * `backend.run` with the right argument shapes. Run `npm run build:qollab` first (npm run check does).
 */
// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as fake from './fake-qsg-circuit';

const bundle = resolve(__dirname, '../../../qollab/main.js');
const html = resolve(__dirname, '../../../qollab/index.html');
const cache = resolve(__dirname, '../../.bundle-cache');
let boots = 0;

async function boot(backendName: string) {
  document.body.innerHTML = readFileSync(html, 'utf8');
  (globalThis as { backend?: unknown }).backend = fake.makeFakeBackend(backendName);
  delete (window as { __QSG_QOLLAB__?: unknown }).__QSG_QOLLAB__;
  // ES modules run once per URL, and each test needs a fresh boot: import a fresh copy of the bundle.
  mkdirSync(cache, { recursive: true });
  const copy = resolve(cache, `main-${process.pid}-${boots++}.js`);
  copyFileSync(bundle, copy);
  await import(/* @vite-ignore */ copy);
  for (let i = 0; i < 50 && !document.querySelector('.welcome'); i++) await new Promise((r) => setTimeout(r, 50));
}

describe('the built Qollab bundle', () => {
  beforeAll(() => { expect(existsSync(bundle), 'run npm run build:qollab first').toBe(true); });

  it('keeps qsg.circuit external and index.html script-free', () => {
    const js = readFileSync(bundle, 'utf8');
    expect(js).toMatch(/from\s*["']qsg\.circuit["']/);
    expect(readFileSync(html, 'utf8')).not.toMatch(/<script/i);
  });

  it('boots, chooses the Qollab engine and labels the local backend', async () => {
    await boot('basic_simulator');
    const rt = (window as { __QSG_QOLLAB__?: { py: unknown; backend: unknown } }).__QSG_QOLLAB__;
    expect(rt?.py).toBeTruthy();
    expect(rt?.backend).toBe((globalThis as { backend?: unknown }).backend);
    expect(document.querySelector('.welcome')).toBeTruthy();
    expect(fake.calls.some((c) => c.fn === 'describe_backend_json.callPromising')).toBe(true);
    const pill = document.querySelector('.topbar .pill')?.textContent ?? '';
    expect(pill).toContain('Qollab simulator (basic_simulator)');
  });

  it('asks Python for ideals and runs a bloom through backend.run with JSON ops', async () => {
    await boot('basic_simulator');
    (document.querySelector('.primary--big') as HTMLButtonElement).click();
    for (let i = 0; i < 50 && !document.querySelector('.action--flip'); i++) await new Promise((r) => setTimeout(r, 50));
    (document.querySelector('.action--flip') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 300));
    const idealCall = fake.calls.filter((c) => c.fn === 'ideal_json.callPromising').at(-1);
    expect(idealCall?.args[0]).toBe(1);
    expect(JSON.parse(idealCall?.args[1] as string)).toEqual([{ op: 'flip', q: 0 }]);
    (document.querySelectorAll('.predictions [role="radio"]')[1] as HTMLButtonElement).click(); // "Always rain"
    await new Promise((r) => setTimeout(r, 50));
    (document.querySelector('.predictions ~ .row .primary') as HTMLButtonElement).click(); // Bloom
    for (let i = 0; i < 50 && !fake.calls.some((c) => c.fn === 'run_json.callPromising'); i++) await new Promise((r) => setTimeout(r, 50));
    const run = fake.calls.find((c) => c.fn === 'run_json.callPromising');
    expect(run).toBeTruthy();
    expect(run?.args[1]).toBe(1);
    expect(JSON.parse(run?.args[2] as string)).toEqual([{ op: 'flip', q: 0 }]);
    expect(run?.args[3]).toBe(12);
    expect(run?.args[4]).toBe('z');
    expect(((globalThis as { backend?: { jobs: number } }).backend as { jobs: number }).jobs).toBe(1);
  });

  it('on an IonQ backend the challenges bloom on the statevector and never spend the one job', async () => {
    fake.calls.length = 0;
    await boot('ionq_simulator');
    const pill = document.querySelector('.topbar .pill')?.textContent ?? '';
    expect(pill).toContain('Qiskit Statevector');
    (document.querySelector('.primary--big') as HTMLButtonElement).click();
    for (let i = 0; i < 50 && !document.querySelector('.action--flip'); i++) await new Promise((r) => setTimeout(r, 50));
    (document.querySelector('.action--flip') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 300));
    (document.querySelectorAll('.predictions [role="radio"]')[1] as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 50));
    (document.querySelector('.predictions ~ .row .primary') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 500));
    expect(fake.calls.some((c) => c.fn === 'run_json.callPromising')).toBe(false);
    expect(((globalThis as { backend?: { jobs: number } }).backend as { jobs: number }).jobs).toBe(0);
    expect(document.querySelector('.resultnote')?.textContent ?? document.body.textContent).toContain('Qiskit Statevector');
  });
});
