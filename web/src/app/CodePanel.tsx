import { useEffect, useState } from 'react';

interface Props { load(): Promise<string>; title?: string; }

/** The equivalent Qiskit code, straight from the engine (Python on Qiskit engines, the parity-tested mirror otherwise). */
export function CodePanel({ load, title = 'The same mix, in Qiskit' }: Props) {
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { let on = true; load().then((c) => { if (on) setCode(c); }).catch(() => { if (on) setCode('# code unavailable'); }); return () => { on = false; }; }, [load]);
  return (
    <section className="code" aria-label={title}>
      <header className="code__head">
        <h3>{title}</h3>
        <button type="button" className="ghost" onClick={async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </header>
      <pre tabIndex={0}><code>{code}</code></pre>
    </section>
  );
}
