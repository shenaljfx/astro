'use client';

import React, { useState } from 'react';
import AppShell from '@/components/AppShell';
import { ZODIAC_SIGNS } from '@/services/api';

// ── Content modes ───────────────────────────────────────────────────────────
type Mode = 'quotes' | 'horoscope';

// ── Quote themes ────────────────────────────────────────────────────────────
const THEMES = [
  { key: 'motivation', label: 'Motivation', icon: '🔥', desc: 'Daily drive & discipline' },
  { key: 'love', label: 'Love & Relationships', icon: '💜', desc: 'Connection, romance, self-worth' },
  { key: 'abundance', label: 'Money & Abundance', icon: '💰', desc: 'Wealth mindset & opportunity' },
  { key: 'spiritual', label: 'Spiritual / Astrology', icon: '✨', desc: 'Cosmic, karmic, mindful' },
  { key: 'wisdom', label: 'Life Wisdom', icon: '📖', desc: 'Timeless reflection' },
] as const;

type ThemeKey = (typeof THEMES)[number]['key'];

const TONES = ['Warm & uplifting', 'Bold & punchy', 'Calm & reflective', 'Poetic'] as const;
type Tone = (typeof TONES)[number];

interface DayQuote {
  sign?: string;
  day: number;
  date: string;
  weekday: string;
  sinhala: string;
  english: string;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function QuotesPage() {
  const [mode, setMode] = useState<Mode>('quotes');
  const [theme, setTheme] = useState<ThemeKey>('motivation');
  const [tone, setTone] = useState<Tone>('Warm & uplifting');
  const [startDate, setStartDate] = useState<string>(isoDate(new Date()));
  const [perDay, setPerDay] = useState<number>(1);
  const [selectedSigns, setSelectedSigns] = useState<string[]>([ZODIAC_SIGNS[0]]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<DayQuote[]>([]);

  function weekScaffold() {
    const start = new Date(`${startDate}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { day: i + 1, date: isoDate(d), weekday: WEEKDAYS[d.getDay()] };
    });
  }

  async function fetchQuotes(prompt: string): Promise<Array<{ sinhala: string; english: string }>> {
    const res = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    const raw = data.result?.quotes;
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error('Model did not return a quotes array. Try again.');
    }
    return raw.map((q: any) => ({
      sinhala: String(q.sinhala || q.si || '').trim(),
      english: String(q.english || q.en || '').trim(),
    }));
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setQuotes([]);
    const days = weekScaffold();

    try {
      if (mode === 'quotes') {
        setProgress({ current: 0, total: 1, status: 'Writing quotes…' });
        const raw = await fetchQuotes(buildQuotesPrompt(theme, tone, perDay, days));
        const merged: DayQuote[] = raw.map((q, idx) => {
          const scaffold = days[Math.floor(idx / perDay)] || days[days.length - 1];
          return { ...scaffold, sinhala: q.sinhala, english: q.english };
        });
        setQuotes(merged.filter((q) => q.sinhala || q.english));
        setProgress({ current: 1, total: 1, status: 'Done' });
      } else {
        // Daily horoscope — one Gemini call per selected sign (7 days each).
        const signs = selectedSigns;
        if (signs.length === 0) throw new Error('Select at least one zodiac sign.');
        const all: DayQuote[] = [];
        for (let i = 0; i < signs.length; i++) {
          const sign = signs[i];
          setProgress({ current: i, total: signs.length, status: `Reading the week for ${sign}…` });
          const raw = await fetchQuotes(buildHoroscopePrompt(sign, tone, days));
          raw.forEach((q, idx) => {
            const scaffold = days[idx] || days[days.length - 1];
            all.push({ sign, ...scaffold, sinhala: q.sinhala, english: q.english });
          });
        }
        setQuotes(all.filter((q) => q.sinhala || q.english));
        setProgress({ current: signs.length, total: signs.length, status: 'Done' });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function toggleSign(sign: string) {
    setSelectedSigns((prev) => (prev.includes(sign) ? prev.filter((s) => s !== sign) : [...prev, sign]));
  }

  function buildTextFile(): string {
    const lines: string[] = [];
    if (mode === 'quotes') {
      const themeLabel = THEMES.find((t) => t.key === theme)?.label || theme;
      lines.push('GRAHACHARA — WEEKLY QUOTES');
      lines.push(`Theme: ${themeLabel}  |  Tone: ${tone}`);
    } else {
      lines.push('GRAHACHARA — WEEKLY DAILY HOROSCOPE');
      lines.push(`Signs: ${selectedSigns.join(', ')}  |  Tone: ${tone}`);
    }
    lines.push(`Week starting: ${startDate}`);
    lines.push('='.repeat(52));
    lines.push('');

    if (mode === 'horoscope') {
      // Group by sign, then day.
      const bySign = new Map<string, DayQuote[]>();
      quotes.forEach((q) => {
        const key = q.sign || '';
        if (!bySign.has(key)) bySign.set(key, []);
        bySign.get(key)!.push(q);
      });
      bySign.forEach((items, sign) => {
        lines.push(`### ${sign.toUpperCase()} ###`);
        lines.push('');
        items
          .sort((a, b) => a.day - b.day)
          .forEach((q) => {
            lines.push(`${q.weekday}, ${q.date}`);
            if (q.sinhala) lines.push(`SI: ${q.sinhala}`);
            if (q.english) lines.push(`EN: ${q.english}`);
            lines.push('');
          });
        lines.push('');
      });
      return lines.join('\n');
    }

    // Quotes mode — group by day.
    const byDay = new Map<number, DayQuote[]>();
    quotes.forEach((q) => {
      if (!byDay.has(q.day)) byDay.set(q.day, []);
      byDay.get(q.day)!.push(q);
    });
    [...byDay.keys()]
      .sort((a, b) => a - b)
      .forEach((day) => {
        const items = byDay.get(day)!;
        const head = items[0];
        lines.push(`DAY ${day} — ${head.weekday}, ${head.date}`);
        lines.push('-'.repeat(52));
        items.forEach((q, i) => {
          if (items.length > 1) lines.push(`(${i + 1})`);
          if (q.sinhala) lines.push(`SI: ${q.sinhala}`);
          if (q.english) lines.push(`EN: ${q.english}`);
          lines.push('');
        });
      });
    return lines.join('\n');
  }

  function handleDownload() {
    const blob = new Blob([buildTextFile()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = mode === 'quotes' ? theme : 'horoscope';
    a.download = `${label}-${startDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(buildTextFile());
    } catch {
      /* clipboard blocked — download is the fallback */
    }
  }

  const generateCount = mode === 'quotes' ? perDay * 7 : selectedSigns.length * 7;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Weekly Text Content</h1>
        <p className="text-gray-400 mb-6">
          Generate a full week of text in Sinhala &amp; English, then download it as a text file.
        </p>

        {/* Mode toggle */}
        <div className="inline-flex p-1 bg-cosmic-card border border-cosmic-border rounded-xl mb-8">
          {([
            { key: 'quotes', label: '✍️ Quotes' },
            { key: 'horoscope', label: '🔮 Daily Horoscope' },
          ] as const).map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m.key ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: configuration */}
          <div className="col-span-2 space-y-6">
            {mode === 'quotes' ? (
              <Section title="Theme">
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTheme(t.key)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        theme === t.key
                          ? 'border-brand-purple bg-brand-purple/10'
                          : 'border-cosmic-border bg-cosmic-card hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl">{t.icon}</span>
                      <p className="font-medium text-white mt-2">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </Section>
            ) : (
              <Section title="Zodiac Signs">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedSigns([...ZODIAC_SIGNS])}
                    className="text-xs px-3 py-1 bg-brand-purple/20 text-brand-purple rounded-full"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedSigns([])}
                    className="text-xs px-3 py-1 bg-white/10 text-gray-400 rounded-full"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ZODIAC_SIGNS.map((sign) => (
                    <button
                      key={sign}
                      onClick={() => toggleSign(sign)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedSigns.includes(sign)
                          ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                          : 'bg-white/5 text-gray-400 border border-transparent hover:border-white/10'
                      }`}
                    >
                      {sign}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {selectedSigns.length} sign{selectedSigns.length === 1 ? '' : 's'} × 7 days ={' '}
                  {selectedSigns.length * 7} horoscopes.
                </p>
              </Section>
            )}
          </div>

          {/* Right: settings */}
          <div className="space-y-6">
            <Section title="Tone">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                className="w-full p-3 bg-cosmic-card border border-cosmic-border rounded-lg text-gray-200 text-sm"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Section>

            <Section title="Week starts">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-3 bg-cosmic-card border border-cosmic-border rounded-lg text-gray-200 text-sm"
              />
            </Section>

            {mode === 'quotes' && (
              <Section title="Quotes per day">
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPerDay(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        perDay === n
                          ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                          : 'bg-white/5 text-gray-400 border border-transparent hover:border-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">{perDay * 7} quotes total for the week.</p>
              </Section>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || (mode === 'horoscope' && selectedSigns.length === 0)}
              className="w-full py-4 bg-gradient-to-r from-brand-purple to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-purple/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> {progress.status || 'Working…'}
                </span>
              ) : (
                `${mode === 'quotes' ? '✍️' : '🔮'} Generate ${generateCount} ${mode === 'quotes' ? 'Quotes' : 'Horoscopes'}`
              )}
            </button>

            {loading && progress.total > 1 && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-cosmic-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-purple rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {progress.current}/{progress.total} signs
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>
            )}
          </div>
        </div>

        {/* Results */}
        {quotes.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-white">✅ {quotes.length} {mode === 'quotes' ? 'Quotes' : 'Horoscopes'}</h2>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={handleCopyAll}
                  className="text-sm px-4 py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 border border-cosmic-border"
                >
                  Copy all
                </button>
                <button
                  onClick={handleDownload}
                  className="text-sm px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 font-medium"
                >
                  📦 Download .txt
                </button>
              </div>
            </div>

            {mode === 'horoscope' ? (
              <div className="space-y-8">
                {[...new Set(quotes.map((q) => q.sign))].map((sign) => (
                  <div key={sign}>
                    <h3 className="text-lg font-bold text-brand-purple mb-3">{sign}</h3>
                    <div className="space-y-3">
                      {quotes
                        .filter((q) => q.sign === sign)
                        .map((q, i) => (
                          <QuoteCard key={i} q={q} />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((q, i) => (
                  <QuoteCard key={i} q={q} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function QuoteCard({ q }: { q: DayQuote }) {
  return (
    <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-5">
      <p className="text-xs text-brand-purple font-medium mb-3">
        Day {q.day} · {q.weekday}, {q.date}
      </p>
      {q.sinhala && <p className="text-gray-100 text-lg leading-relaxed mb-2">{q.sinhala}</p>}
      {q.english && <p className="text-gray-400 italic leading-relaxed">{q.english}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function buildQuotesPrompt(
  theme: string,
  tone: string,
  perDay: number,
  days: Array<{ day: number; date: string; weekday: string }>,
): string {
  const total = perDay * 7;
  const themeGuide: Record<string, string> = {
    motivation: 'discipline, momentum, taking action, self-belief, showing up daily',
    love: 'connection, romance, self-worth, letting go, emotional honesty',
    abundance: 'wealth mindset, gratitude, opportunity, effort meeting luck',
    spiritual: 'karma, the cosmos, inner peace, alignment, trusting the timing of life',
    wisdom: 'perspective, patience, growth through hardship, timeless reflection',
  };

  return `You are a bilingual copywriter for GRAHACHARA, a Sri Lankan astrology & wellness brand.
Write ${total} short, original, shareable social-media QUOTES — ${perDay} for each of the 7 days below.

THEME: ${theme} (${themeGuide[theme] || theme})
TONE: ${tone}

RULES:
- Each quote has TWO versions of the SAME idea: natural Sinhala ("sinhala") and natural English ("english").
- The Sinhala must be authentic, fluent Sinhala script — NOT a stiff word-for-word translation of the English. Write it as a native speaker would say it.
- 1 to 2 sentences each. Punchy and quotable. Suitable to post on a plain background.
- ZERO emojis. ZERO hashtags. ZERO quotation marks around the text. No author attribution.
- Every quote must be DISTINCT — no repeated ideas across the week.
- Keep it warm and inclusive; avoid religion-specific claims and avoid fear-mongering.

Return ONLY this JSON (exactly ${total} items, in day order):
{
  "quotes": [
    { "sinhala": "…", "english": "…" }
  ]
}`;
}

function buildHoroscopePrompt(
  sign: string,
  tone: string,
  days: Array<{ day: number; date: string; weekday: string }>,
): string {
  const dayList = days.map((d) => `Day ${d.day}: ${d.weekday}, ${d.date}`).join('\n');

  return `You are a bilingual astrologer for GRAHACHARA, a Sri Lankan astrology & wellness brand.
Write a 7-DAY DAILY HOROSCOPE for the zodiac sign ${sign}, one reading for each day below:
${dayList}

TONE: ${tone}

RULES:
- Each day has TWO versions of the SAME reading: natural Sinhala ("sinhala") and natural English ("english").
- The Sinhala must be authentic, fluent Sinhala script — NOT a stiff word-for-word translation. Write it as a Sri Lankan astrologer would speak to a reader.
- 1 to 2 sentences each. Personal and encouraging, speaking directly to the reader ("you / ඔබ").
- Rotate the daily focus across the week so no two days feel the same: love, work/money, health, luck, relationships, mindset, energy.
- ZERO emojis. ZERO hashtags. ZERO quotation marks. No sign name inside the text.
- Keep it warm, hopeful and inclusive; give gentle guidance, never fear-mongering or absolute doom.

Return ONLY this JSON (exactly 7 items, in day order Day 1 → Day 7):
{
  "quotes": [
    { "sinhala": "…", "english": "…" }
  ]
}`;
}
