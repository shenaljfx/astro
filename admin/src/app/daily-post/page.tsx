'use client';

import React, { useEffect, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';

type Sign = {
  english: string; sinhala: string; symbol: string;
  quote: string; quoteSi: string; rating: string; score: number;
  chandrashtama: boolean; lucky: { number: number; color: string };
};

const FALLBACK: Sign[] = [];
const FORMATS: Record<string, [number, number]> = { Square: [1080, 1080], Portrait: [1080, 1350], Story: [1080, 1920] };

// Load a File into an HTMLImageElement.
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = r.result as string; };
    r.onerror = reject; r.readAsDataURL(file);
  });
}

export default function DailyPost() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signs, setSigns] = useState<Sign[]>(FALLBACK);
  const [dateLabel, setDateLabel] = useState('');
  const [i, setI] = useState(0);
  const [lang, setLang] = useState<'en' | 'si'>('en');
  const [title, setTitle] = useState('');
  const [quote, setQuote] = useState('Loading real daily calculation…');
  const [bg, setBg] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [format, setFormat] = useState<keyof typeof FORMATS>('Portrait');
  const [textColor, setTextColor] = useState('#ffffff');
  const [accent, setAccent] = useState('#f0b429');
  const [scrim, setScrim] = useState(0.6);
  const [footer, setFooter] = useState('grahachara.com');
  const [showLucky, setShowLucky] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  // Pull the REAL, ephemeris-computed daily quotes (no AI).
  useEffect(() => {
    fetch('/api/astro/api/marketing/rashi-daily')
      .then((r) => r.json())
      .then((d) => {
        if (d?.signs?.length) { setSigns(d.signs); setDateLabel(d.date || ''); }
        else setLoadErr(d?.error || 'No data');
      })
      .catch((e) => setLoadErr(String(e?.message || e)));
  }, []);

  // Fill the editable text from the selected sign + language.
  useEffect(() => {
    const s = signs[i];
    if (!s) return;
    setTitle(lang === 'si' ? s.sinhala : s.english);
    setQuote(lang === 'si' ? s.quoteSi : s.quote);
  }, [i, lang, signs]);

  const [W, H] = FORMATS[format];
  const sign = signs[i];

  useEffect(() => { draw(); /* eslint-disable-next-line */ }, [bg, logo, title, quote, textColor, accent, scrim, format, footer, showLucky, sign]);

  function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
    const r = Math.max(w / img.width, h / img.height);
    const iw = img.width * r, ih = img.height * r;
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }

  function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
    const words = text.split(/\s+/); const lines: string[] = []; let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function draw() {
    const c = canvasRef.current; if (!c) return;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const pad = Math.round(W * 0.085);

    // Background
    if (bg) drawCover(ctx, bg, W, H);
    else { const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1a1140'); g.addColorStop(1, '#070512'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

    // Legibility scrim (stronger toward the bottom)
    const g2 = ctx.createLinearGradient(0, 0, 0, H);
    g2.addColorStop(0, `rgba(5,3,18,${scrim * 0.35})`);
    g2.addColorStop(0.45, `rgba(5,3,18,${scrim * 0.15})`);
    g2.addColorStop(1, `rgba(5,3,18,${Math.min(0.92, scrim * 1.35)})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

    // Top: sign symbol + name + date
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = `600 ${Math.round(W * 0.11)}px Georgia, serif`;
    ctx.fillText(sign?.symbol || '✷', pad, pad + W * 0.09);
    ctx.fillStyle = textColor;
    ctx.font = `700 ${Math.round(W * 0.058)}px Georgia, serif`;
    ctx.fillText(title || '', pad + W * 0.13, pad + W * 0.072);
    if (dateLabel) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = `500 ${Math.round(W * 0.028)}px Arial, sans-serif`;
      ctx.fillText(new Date(dateLabel).toDateString(), pad + W * 0.13, pad + W * 0.115);
    }

    // Quote block (lower area)
    const qSize = Math.round(W * 0.062);
    ctx.font = `600 ${qSize}px Georgia, serif`;
    ctx.fillStyle = textColor;
    const lines = wrap(ctx, quote || '', W - pad * 2);
    const lh = qSize * 1.32;
    let y = H - pad - (showLucky ? W * 0.11 : W * 0.03) - lines.length * lh;
    // accent tick above quote
    ctx.fillStyle = accent; ctx.fillRect(pad, y - qSize * 0.9, W * 0.11, Math.max(4, W * 0.012));
    ctx.fillStyle = textColor;
    for (const ln of lines) { ctx.fillText(ln, pad, y); y += lh; }

    // Lucky strip
    if (showLucky && sign) {
      ctx.font = `600 ${Math.round(W * 0.03)}px Arial, sans-serif`;
      ctx.fillStyle = accent;
      ctx.fillText(`Lucky ${sign.lucky.number} · ${sign.lucky.color}${sign.chandrashtama ? '  ·  ⚠ Chandrashtama' : ''}`, pad, H - pad - W * 0.045);
    }

    // Footer
    ctx.font = `500 ${Math.round(W * 0.028)}px Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(footer, pad, H - pad + W * 0.005);

    // Logo (bottom-right)
    if (logo) {
      const lw = W * 0.13; const lh2 = (logo.height / logo.width) * lw;
      ctx.drawImage(logo, W - pad - lw, H - pad - lh2 + W * 0.01, lw, lh2);
    }
  }

  async function onBg(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) setBg(await fileToImage(f)); }
  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) setLogo(await fileToImage(f)); }

  function download() {
    const c = canvasRef.current; if (!c) return;
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `grahachara-${title || 'post'}-${dateLabel || 'today'}.png`.replace(/\s+/g, '-').toLowerCase();
      a.click(); URL.revokeObjectURL(url);
    }, 'image/png');
  }

  return (
    <AppShell>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 24, alignItems: 'start' }} className="dp-grid">
      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Daily Post</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
            Real per-sign quote from today's ephemeris — upload a background, tweak, render. No AI guessing.
          </p>
          {loadErr && <p style={{ color: '#f87171', fontSize: 12 }}>Quote fetch: {loadErr}</p>}
        </div>

        <Field label="Zodiac sign">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
            {(signs.length ? signs : Array.from({ length: 12 })).map((s: any, k: number) => (
              <button key={k} onClick={() => setI(k)} title={s?.english}
                style={{ ...chip, ...(i === k ? chipOn : {}), fontSize: 18, padding: '8px 0' }}>{s?.symbol || '·'}</button>
            ))}
          </div>
          {sign && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{sign.english} · {sign.rating} ({sign.score}) {sign.chandrashtama ? '· ⚠ Chandrashtama' : ''}</div>}
        </Field>

        <Field label="Language">
          <div style={{ display: 'flex', gap: 8 }}>
            {(['en', 'si'] as const).map((l) => <button key={l} onClick={() => setLang(l)} style={{ ...chip, ...(lang === l ? chipOn : {}) }}>{l === 'en' ? 'English' : 'සිංහල'}</button>)}
          </div>
        </Field>

        <Field label="Quote (editable — starts from the real calc)">
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={4} style={inp} />
        </Field>
        <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} style={inp} /></Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Background"><label style={upl}>Upload<input type="file" accept="image/*" onChange={onBg} hidden /></label></Field>
          <Field label="Logo"><label style={upl}>Upload<input type="file" accept="image/*" onChange={onLogo} hidden /></label></Field>
        </div>

        <Field label="Format">
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(FORMATS).map((f) => <button key={f} onClick={() => setFormat(f as any)} style={{ ...chip, ...(format === f ? chipOn : {}) }}>{f}</button>)}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Text"><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ ...inp, height: 38, padding: 3 }} /></Field>
          <Field label="Accent"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ ...inp, height: 38, padding: 3 }} /></Field>
        </div>
        <Field label={`Scrim ${Math.round(scrim * 100)}%`}><input type="range" min={0} max={1} step={0.05} value={scrim} onChange={(e) => setScrim(+e.target.value)} style={{ width: '100%' }} /></Field>
        <Field label="Footer"><input value={footer} onChange={(e) => setFooter(e.target.value)} style={inp} /></Field>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#cbd5e1' }}>
          <input type="checkbox" checked={showLucky} onChange={(e) => setShowLucky(e.target.checked)} /> Show lucky number + color
        </label>

        <button onClick={download} style={dlBtn}>⬇ Render &amp; download PNG</button>
      </div>

      {/* Live preview */}
      <div style={{ position: 'sticky', top: 20, display: 'grid', placeItems: 'center' }}>
        <canvas ref={canvasRef} style={{ width: '100%', maxWidth: format === 'Story' ? 340 : 460, height: 'auto', borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(139,92,246,.25)' }} />
      </div>

      <style>{`@media (max-width: 820px){ .dp-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#8b84b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>{children}</div>;
}

const inp: React.CSSProperties = { width: '100%', background: '#0d0b2e', border: '1px solid rgba(139,122,216,.25)', color: '#e8e4ff', borderRadius: 10, padding: '9px 11px', fontSize: 13, fontFamily: 'inherit', outline: 'none' };
const chip: React.CSSProperties = { background: '#0d0b2e', border: '1px solid rgba(139,122,216,.25)', color: '#cbd5e1', borderRadius: 9, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const chipOn: React.CSSProperties = { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', borderColor: 'transparent' };
const upl: React.CSSProperties = { ...chip, display: 'block', textAlign: 'center' };
const dlBtn: React.CSSProperties = { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 };
