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
/** main.js returned, so Qollab would end the Run (qollab-entry.ts holds it open on IonQ until the one job is back) */
let runEnded = false;
const waitFor = async (ok: () => boolean) => { for (let i = 0; i < 50 && !ok(); i++) await new Promise((r) => setTimeout(r, 50)); };

async function boot(backendName: string) {
  document.body.innerHTML = readFileSync(html, 'utf8');
  (globalThis as { backend?: unknown }).backend = fake.makeFakeBackend(backendName);
  delete (window as { __QSG_QOLLAB__?: unknown }).__QSG_QOLLAB__;
  // ES modules run once per URL, and each test needs a fresh boot: import a fresh copy of the bundle.
  mkdirSync(cache, { recursive: true });
  const copy = resolve(cache, `main-${process.pid}-${boots++}.js`);
  copyFileSync(bundle, copy);
  runEnded = false;
  let bootError: unknown = null;
  // not awaited: on IonQ the module stays pending until the one job, exactly as the Run does on Qollab
  void import(/* @vite-ignore */ copy).then(() => { runEnded = true; }, (e) => { bootError = e; });
  await waitFor(() => !!document.querySelector('.welcome') || bootError !== null);
  if (bootError) throw bootError;
  await waitFor(() => fake.calls.some((c) => c.fn === 'describe_backend_json.callPromising'));
  await new Promise((r) => setTimeout(r, 100)); // the top bar renders the backend label it described
}

/** The gesture, then the tutorial, then puzzle 1 (the tutorial shows a board too, so wait for the puzzle's own scene). */
async function openPuzzleOne() {
  (document.querySelector('.primary--big') as HTMLButtonElement).click();
  for (let i = 0; i < 50 && !document.querySelector('.learn__go'); i++) await new Promise((r) => setTimeout(r, 50));
  (document.querySelector('.learn__go') as HTMLButtonElement).click();
  for (let i = 0; i < 50 && !document.querySelector('.scene--puzzle .move--flip'); i++) await new Promise((r) => setTimeout(r, 50));
}

// each test boots the built bundle in jsdom; under machine load that took more than vitest's 5 s default (2026-10-10)
describe('the built Qollab bundle', { timeout: 20000 }, () => {
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
    await waitFor(() => runEnded);
    expect(runEnded, 'on a local simulator main.js returns and the Run ends').toBe(true);
  });

  it('asks Python for ideals and runs a Play through backend.run with JSON ops', async () => {
    await boot('basic_simulator');
    await openPuzzleOne();
    (document.querySelector('.move--flip') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 300));
    const idealCall = fake.calls.filter((c) => c.fn === 'ideal_json.callPromising').at(-1);
    expect(idealCall?.args[0]).toBe(1);
    expect(JSON.parse(idealCall?.args[1] as string)).toEqual([{ op: 'flip', q: 0 }]);
    (document.querySelector('.bloom') as HTMLButtonElement).click(); // Play
    for (let i = 0; i < 50 && !fake.calls.some((c) => c.fn === 'normalize_counts_json.callPromising'); i++) await new Promise((r) => setTimeout(r, 50));
    // the job is submitted from JavaScript: the circuit object comes from Python, backend.run gets it with { shots }
    const built = fake.calls.find((c) => c.fn === 'build_circuit_for_run.callPromising');
    expect(built).toBeTruthy();
    expect(built?.args[0]).toBe(1);
    expect(JSON.parse(built?.args[1] as string)).toEqual([{ op: 'flip', q: 0 }]);
    expect(built?.args[2]).toBe('z');
    const normalized = fake.calls.find((c) => c.fn === 'normalize_counts_json.callPromising');
    expect(normalized?.args[2]).toBe(12);
    expect(fake.calls.some((c) => c.fn === 'run_json.callPromising')).toBe(false);
    expect(((globalThis as { backend?: { jobs: number } }).backend as { jobs: number }).jobs).toBe(1);
  });

  it('on an IonQ backend the puzzles play on the statevector and never spend the one job', async () => {
    fake.calls.length = 0;
    await boot('ionq_simulator');
    const pill = document.querySelector('.topbar .pill')?.textContent ?? '';
    expect(pill).toContain('Qiskit Statevector');
    await openPuzzleOne();
    (document.querySelector('.move--flip') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 300));
    (document.querySelector('.bloom') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 500));
    expect(fake.calls.some((c) => c.fn === 'run_json.callPromising' || c.fn === 'build_circuit_for_run.callPromising')).toBe(false);
    expect(((globalThis as { backend?: { jobs: number } }).backend as { jobs: number }).jobs).toBe(0);
    expect(document.querySelector('.resultnote')?.textContent ?? document.body.textContent).toContain('Qiskit Statevector');
    expect(runEnded, 'the Run stays open while the one IonQ job is unspent').toBe(false);
  });

  it('on an IonQ backend the studio’s Loop spends exactly one job, of 64 shots, and plays it as eight bars', async () => {
    fake.calls.length = 0;
    await boot('ionq_simulator');
    (document.querySelector('.primary--big') as HTMLButtonElement).click();
    const studioNav = () => [...document.querySelectorAll('.navbtn')].find((b) => b.textContent?.trim() === 'Studio') as HTMLButtonElement | undefined;
    for (let i = 0; i < 50 && (!studioNav() || studioNav()!.disabled); i++) await new Promise((r) => setTimeout(r, 50)); // the nav wakes after the gesture
    studioNav()!.click();
    for (let i = 0; i < 50 && !document.querySelector('.scene--studio select'); i++) await new Promise((r) => setTimeout(r, 50));
    const select = [...document.querySelectorAll('.scene--studio select')].find((s) => [...s.querySelectorAll('option')].some((o) => o.value === 'qollab')) as HTMLSelectElement;
    expect(select, 'the backend select with the IonQ device').toBeTruthy();
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    setter.call(select, 'qollab');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 100));
    expect((document.querySelector('.bloom') as HTMLButtonElement).textContent).toContain('one job');
    expect(runEnded).toBe(false);
    (document.querySelector('.bloom') as HTMLButtonElement).click();
    for (let i = 0; i < 50 && !fake.calls.some((c) => c.fn === 'normalize_counts_json.callPromising'); i++) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, 300));
    const builds = fake.calls.filter((c) => c.fn === 'build_circuit_for_run.callPromising');
    expect(builds.length).toBe(1);
    expect(fake.calls.find((c) => c.fn === 'normalize_counts_json.callPromising')?.args[2]).toBe(64);
    expect(((globalThis as { backend?: { jobs: number } }).backend as { jobs: number }).jobs).toBe(1);
    await waitFor(() => runEnded);
    expect(runEnded, 'the job is back, so main.js returns and the Run ends').toBe(true);
  });
});
