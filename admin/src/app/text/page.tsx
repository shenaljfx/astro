'use client';

import React, { useMemo, useState } from 'react';
import AppShell from '@/components/AppShell';
import { PageHeader, Panel, Field, Btn, Chip, CopyButton, EmptyState, Select, inputCls, SignThumb } from '@/components/ui';
import { addHistory } from '@/lib/history';
import { SINHALA_VOICE, SINHALA_FB_STYLE, SIGN_SI, ENGLISH_READING_VOICE } from '@/lib/promptStyle';
import { ZODIAC_SIGNS } from '@/services/api';
import { Type, MessageSquareQuote, Anchor, CalendarDays, Sparkles, LucideIcon } from 'lucide-react';

/* ── Modes ──────────────────────────────────────────────────────────────── */

type Mode = 'captions' | 'hooks' | 'quotes' | 'horoscope';

const MODES: Array<{ key: Mode; icon: LucideIcon; name: string; desc: string }> = [
  { key: 'captions', icon: MessageSquareQuote, name: 'Caption pack', desc: 'TikTok, Instagram & Facebook captions + hashtags' },
  { key: 'hooks', icon: Anchor, name: 'Viral hooks', desc: 'Scroll-stopping first lines for reels' },
  { key: 'quotes', icon: Sparkles, name: 'Quotes', desc: 'Bilingual quote lines — English + සිංහල' },
  { key: 'horoscope', icon: CalendarDays, name: 'Week of lines', desc: '7 daily horoscope one-liners per sign' },
];

const TONES = ['Warm & uplifting', 'Bold & punchy', 'Calm & reflective', 'Poetic', 'Mystical & urgent'] as const;
type Tone = (typeof TONES)[number];

const QUOTE_THEMES = [
  { key: 'motivation', label: 'Motivation' },
  { key: 'love', label: 'Love & relationships' },
  { key: 'abundance', label: 'Money & abundance' },
  { key: 'spiritual', label: 'Spiritual / astrology' },
  { key: 'wisdom', label: 'Life wisdom' },
] as const;
type QuoteTheme = (typeof QUOTE_THEMES)[number]['key'];

interface ResultItem {
  label?: string;   // e.g. platform, weekday
  english: string;
  sinhala?: string;
}

/** Small, pre-formatted brief — raw ISO dumps make the model quote UTC times. */
function astroBrief(d: any): string {
  const p = d?.panchanga;
  if (!p) return '';
  const t = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' }) : '';
  const bits = [
    p.nakshatra?.name && `nakshatra: ${p.nakshatra.name}${p.nakshatra.sinhala ? ` (${p.nakshatra.sinhala})` : ''}${p.nakshatra.lord ? `, lord ${p.nakshatra.lord}` : ''}${p.nakshatra.endsAt ? `, ends ${t(p.nakshatra.endsAt)} SL time` : ''}`,
    p.tithi?.name && `tithi: ${p.tithi.name} (${p.tithi.paksha || ''})`,
    p.moonSign?.english && `moon in ${p.moonSign.english}${p.moonSign.sinhala ? ` / ${p.moonSign.sinhala}` : ''}`,
    p.rahuKalam?.start && `rahu kalam: ${t(p.rahuKalam.start)}–${t(p.rahuKalam.end)}`,
  ].filter(Boolean);
  return bits.length ? `\nTODAY'S REAL SKY (cite ONE concrete detail as authority — times are already Sri Lanka time):\n${bits.join('\n')}` : '';
}

/* ── Prompt builders — every mode returns {"items":[...]} JSON ──────────── */

type Lang = 'en' | 'si' | 'both';

function buildPrompt(opts: {
  mode: Mode;
  sign: string;
  tone: Tone;
  count: number;
  theme: QuoteTheme;
  topic: string;
  lang: Lang;
  astro: any;
  weekReal?: string;
}): string {
  const { mode, sign, tone, count, theme, topic, lang, astro, weekReal } = opts;
  const data = astroBrief(astro) + (astro
    ? '\nEvery claim must trace to the data above — NEVER invent a transit, planet or timing that is not in it.'
    : '');
  const wantSi = lang !== 'en';
  const wantEn = lang !== 'si';
  const siField = wantSi ? `,"sinhala":"..."` : '';
  const siName = SIGN_SI[sign] || sign;
  const siNameRule = wantSi
    ? `\nIn SINHALA lines always call the sign "${siName}" (e.g. "${siName} ලග්න හිමියෙනි") — NEVER the English name "${sign}".`
    : '';

  if (mode === 'captions') {
    return `You write social captions for Grahachara, the Sinhala Vedic astrology app (grahachara.com).
Audience: Sri Lankans 18-40 who follow astrology pages daily. Tone: ${tone}. ${topic ? `Angle/topic: ${topic}.` : ''}
Sign: ${sign}.${data}

${wantEn ? `${ENGLISH_READING_VOICE}
- TikTok caption: 1-2 lines of the reading + a soft comment prompt ("tell me you felt this").
- Instagram caption: open with the transit line, turn it inward (3-4 sentences), end with a save/reflect nudge ("keep this for the day it lands").
- Facebook caption: lead with a question that assumes the feeling ("Who else has been carrying this all week?"), then 2 reading lines.
` : ''}${wantSi ? `SINHALA RULES:\n${SINHALA_VOICE}\n${SINHALA_FB_STYLE}${siNameRule}\nThe Sinhala caption is NOT a translation — write it natively in the viral FB formula (headline line → 2-3 emoji-bullet prediction lines in warm ඔබ voice → comment bait → share nudge → blessing).\n` : ''}
Return JSON exactly:
{"items":[
 {"label":"TikTok","english":"1-2 punchy sentences that drive comments"${siField}},
 {"label":"Instagram","english":"3-4 sentence storytelling caption that drives saves"${siField}},
 {"label":"Facebook","english":"question-led conversational caption that drives comments"${siField}},
 {"label":"Hashtags","english":"25 space-separated hashtags: popular astrology + Sri Lanka mix (#astrology #zodiac #${sign.toLowerCase()} #srilanka #ලග්නපලාපල #ජ්‍යෝතිෂය #colombo #lka)"}
]}`;
  }

  if (mode === 'hooks') {
    return `You write viral reel/post hooks for an astrology audience (deciding in 0.3s, sound off).
Sign: ${sign}. Tone: ${tone}.${data}

${wantEn ? `ENGLISH HOOKS: 6-10 words, pattern-interrupt + curiosity gap, open with the sign name, no emojis, no exclamation marks. Target love, money, forbidden knowledge, fear of loss or justice.
Examples of the calibre required: "${sign}: stop scrolling. someone is lying to you." / "${sign}: the money you lost is coming back doubled".` : ''}
${wantSi ? `SINHALA HOOKS: the viral lagna-palapala headline formula — curiosity + benefit + urgency, may use one "!".
${SINHALA_VOICE}${siNameRule}
Calibre required (write NEW ones, same rhythm): "${siName} ලග්න හිමියෙනි — අද ඔබ නොහිතපු තැනකින් සල්ලි එනවා!" / "අදම බලන්න — ${siName}ට සති 2ක් ඇතුළත ලොකු වෙනසක්!" / "ඔබ ${siName}ද? එහෙනම් මේක ඔබටමයි."` : ''}
Return JSON exactly: {"items":[{${wantEn ? `"english":"hook"` : `"english":""`}${siField}} x ${count}]}${lang === 'si' ? ' (leave english as an empty string only if truly Sinhala-only; better: give a short English gloss)' : ''}`;
  }

  if (mode === 'quotes') {
    const themeLabel = QUOTE_THEMES.find((t) => t.key === theme)?.label;
    return `Write ${count} original short quotes for the theme "${themeLabel}" in a ${tone} tone, for the Sri Lankan quote-page audience (the "${'හිතට වදින වදන්'}" genre — screenshot-and-share aphorisms).

STRUCTURES to rotate (never repeat one twice in a row):
1. Contrast flip: "වාසනාව කියන්නේ ලැබෙන දේ නෙවෙයි — නොලැබී බේරුණු දේත් වාසනාවක්."
2. Quiet truth with concrete image (පහන, මුහුද, අහස, පාර, බීජ): "පහන දැල්වෙන්නේ තෙල් ඉවර වෙනකම් — ඔබත් එහෙමයි, තියෙන කාලේ එළිය දෙන්න."
3. Direct address that lands in the last 3 words.
Each quote: ONE thought, two beats max, the second beat lands the punch. No clichés, no textbook words, no emojis inside the quote.
${SINHALA_VOICE}
English rendering: natural, 8-16 words, same punch — not a literal translation. Use the quiet Moon-Omens reading cadence (em-dash turn, gentle landing); never the banned filler words (energy, universe, journey, embrace, align, cosmic, manifest).

Return JSON exactly: {"items":[{"english":"...","sinhala":"..."} x ${count}]}`;
  }

  // horoscope — 7 daily lines, voiced strictly over the COMPUTED week
  const days = Array.from({ length: 7 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() + k);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  });
  const grounding = weekReal
    ? `THE COMPUTED WEEK for ${sign} (real ephemeris — the engine already decided each day's verdict):
${weekReal}

YOU ARE A VOICE, NOT AN ORACLE: restate these computed verdicts in the style — you MUST NOT change, soften or invert any day's verdict, and you MUST NOT invent transits, planets or events that are not in the data. A "bright" day gets an encouraging line, "steady" a balanced line, "take care" / CHANDRASHTAMA a gentle protective line (rest, avoid big decisions).`
    : `Days: ${days.join(' · ')}.${data}
Make the week feel honest, not flattery — at least one gentler "watch-out" day.`;

  return `Write one short daily horoscope line for ${sign} for each of the next 7 days, ${tone} tone.

${grounding}

Each day: pick ONE concrete life area (money / love / work / health / home) — a different one each day.
${ENGLISH_READING_VOICE}
- Each English line: 12-24 words, and name the area plus a moment ("before noon", "an old friend", "a payment").
SINHALA: NOT a translation — write natively.
${SINHALA_VOICE}${siNameRule}
Calibre required: "අද ඔබට ඉතා සුබ දවසක්. අලුත් වැඩක් පටන් ගන්න මේ දවස හොඳයි — වාසනාව අද ඔබ පැත්තෙයි."

Return JSON exactly: {"items":[{"label":"<weekday, date>","english":"...","sinhala":"..."} x 7]}`;
}

function normalizeItems(raw: any): ResultItem[] {
  const arr = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
  return arr
    .map((it: any) => {
      if (typeof it === 'string') return { english: it.trim() };
      return {
        label: it.label || it.platform || it.day || undefined,
        english: String(it.english || it.en || it.text || '').trim(),
        sinhala: it.sinhala || it.si ? String(it.sinhala || it.si).trim() : undefined,
      };
    })
    .filter((it: ResultItem) => it.english || it.sinhala);
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function TextPage() {
  const [mode, setMode] = useState<Mode>('captions');
  const [sign, setSign] = useState<string>(ZODIAC_SIGNS[0]);
  const [tone, setTone] = useState<Tone>('Mystical & urgent');
  const [theme, setTheme] = useState<QuoteTheme>('motivation');
  const [count, setCount] = useState(8);
  const [topic, setTopic] = useState('');
  const [lang, setLang] = useState<Lang>('both');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ResultItem[]>([]);
  const [generatedFor, setGeneratedFor] = useState('');

  const modeMeta = MODES.find((m) => m.key === mode)!;
  const needsSign = mode === 'captions' || mode === 'hooks' || mode === 'horoscope';
  const hasLangChoice = mode === 'captions' || mode === 'hooks';

  const copyAll = useMemo(
    () =>
      items
        .map((it) => {
          const head = it.label ? `[${it.label}] ` : '';
          return head + [it.english, it.sinhala].filter(Boolean).join('\n');
        })
        .join('\n\n'),
    [items],
  );

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setItems([]);
    try {
      // Real ephemeris context when the engine is up (optional).
      let astro: any = null;
      if (mode === 'captions' || mode === 'hooks' || mode === 'horoscope') {
        try {
          const r = await fetch('/api/astro/api/marketing/today');
          if (r.ok) astro = await r.json();
        } catch { /* engine offline — generate without it */ }
      }

      // For weekly lines: the REAL computed week — the AI only voices these verdicts.
      let weekReal = '';
      if (mode === 'horoscope') {
        try {
          const r = await fetch('/api/astro/api/marketing/rashi-period?mode=weekly');
          const d = r.ok ? await r.json() : null;
          const s = d?.signs?.find((x: any) => x.english === sign);
          if (s?.days?.length) {
            const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            weekReal = s.days
              .map((day: any) => {
                const verdict = day.chandrashtama ? 'CHANDRASHTAMA — rest day' : day.score >= 70 ? 'bright' : day.score >= 48 ? 'steady' : 'take care';
                return `${WD[day.dow]}, ${day.date}: ${verdict} (score ${day.score})`;
              })
              .join('\n');
            weekReal += `\nComputed week summary: ${s.quote}`;
          }
        } catch { /* engine offline — prompt falls back gracefully */ }
      }

      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrompt({ mode, sign, tone, count, theme, topic, lang, astro, weekReal }) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      const normalized = normalizeItems(data.result);
      if (normalized.length === 0) throw new Error('Model returned no usable items — try again.');
      setItems(normalized);

      const subject = mode === 'quotes' ? QUOTE_THEMES.find((t) => t.key === theme)?.label : sign;
      setGeneratedFor(`${modeMeta.name} — ${subject}`);
      addHistory('text', `${modeMeta.name} — ${subject}`, `${normalized.length} items`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Generator · 03"
          title="Text"
          description="Captions, hooks, quotes and horoscope lines — grounded in today's real sky when the engine is online."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[320px,1fr]">
          {/* ── Config rail ── */}
          <div className="rise space-y-4 lg:sticky lg:top-8" style={{ ['--i' as any]: 4 }}>
            <Panel title="What to write" pad={false}>
              <div className="p-2">
                {MODES.map((m) => {
                  const Icon = m.icon;
                  const active = mode === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => { setMode(m.key); setItems([]); setError(null); }}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 ${
                        active ? 'bg-accent-glow' : 'hover:bg-surface-2'
                      }`}
                    >
                      <Icon size={16} className={`mt-0.5 shrink-0 ${active ? 'text-accent-ink' : 'text-ink-3'}`} />
                      <span>
                        <p className={`text-[13px] font-medium ${active ? 'text-accent-ink' : 'text-ink'}`}>{m.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{m.desc}</p>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Settings">
              <div className="space-y-4">
                {needsSign && (
                  <Field label="Sign">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ZODIAC_SIGNS.map((s) => (
                        <Chip
                          key={s}
                          active={sign === s}
                          onClick={() => setSign(s)}
                          className="flex items-center justify-center gap-1.5 !px-1.5"
                          title={s}
                        >
                          <SignThumb sign={s} size={20} />
                          {s.slice(0, 3)}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                )}

                {mode === 'quotes' && (
                  <Field label="Theme">
                    <Select value={theme} onChange={(e) => setTheme(e.target.value as QuoteTheme)}>
                      {QUOTE_THEMES.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </Select>
                  </Field>
                )}

                {hasLangChoice && (
                  <Field label="Language">
                    <div className="flex gap-1.5">
                      {([['en', 'English'], ['si', 'සිංහල'], ['both', 'Both']] as const).map(([k, label]) => (
                        <Chip key={k} active={lang === k} onClick={() => setLang(k)} className="flex-1 text-center">
                          {label}
                        </Chip>
                      ))}
                    </div>
                  </Field>
                )}

                <Field label="Tone">
                  <Select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                    {TONES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </Field>

                {mode === 'captions' && (
                  <Field label="Angle" hint="optional">
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="full-moon week, mercury retrograde…"
                      className={inputCls}
                    />
                  </Field>
                )}

                {(mode === 'hooks' || mode === 'quotes') && (
                  <Field label={`Count — ${count}`}>
                    <input type="range" min={4} max={16} step={1} value={count} onChange={(e) => setCount(+e.target.value)} className="w-full" />
                  </Field>
                )}
              </div>
            </Panel>

            <Btn variant="primary" size="lg" className="w-full" onClick={handleGenerate} disabled={loading}>
              <Type size={15} />
              {loading ? 'Writing…' : `Generate ${modeMeta.name.toLowerCase()}`}
            </Btn>

            {error && (
              <p className="rounded-lg border border-[rgba(224,101,95,0.3)] bg-[rgba(224,101,95,0.08)] px-3 py-2 text-[12px] text-danger">
                {error}
              </p>
            )}
          </div>

          {/* ── Results ── */}
          <div className="rise min-w-0" style={{ ['--i' as any]: 5 }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="truncate text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">
                {generatedFor || 'Output'}
                {items.length > 0 && <span className="ml-1.5 font-mono text-ink-3">{items.length}</span>}
              </h2>
              {items.length > 0 && <CopyButton text={copyAll} label="Copy all" />}
            </div>

            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((k) => (
                  <div key={k} className="overflow-hidden rounded-xl border border-line bg-surface p-4">
                    <div className="relative h-3.5 w-2/3 overflow-hidden rounded bg-surface-2">
                      <span className="absolute inset-y-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                    <div className="relative mt-2.5 h-3.5 w-5/6 overflow-hidden rounded bg-surface-2">
                      <span className="absolute inset-y-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface">
                <EmptyState
                  icon={Type}
                  title="Nothing written yet"
                  hint="Pick a format and tone on the left — results appear here with one-tap copy."
                />
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, k) => (
                  <div key={k} className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {it.label && (
                          <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">{it.label}</p>
                        )}
                        {it.english && (
                          <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{it.english}</p>
                        )}
                        {it.sinhala && (
                          <p className={`whitespace-pre-wrap text-[13.5px] leading-[1.8] ${it.english ? 'mt-2 border-t border-line pt-2 text-ink-2' : 'text-ink'}`}>
                            {it.sinhala}
                          </p>
                        )}
                      </div>
                      <CopyButton text={[it.english, it.sinhala].filter(Boolean).join('\n')} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
