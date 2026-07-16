'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import AppShell from '@/components/AppShell';
import { PageHeader, Panel, Field, Btn, Chip, Progress, EmptyState, CopyButton, Select, inputCls, SignThumb } from '@/components/ui';
import { addHistory } from '@/lib/history';
import { TEMPLATES, VISUAL_THEMES, TemplateType, VisualTheme, ReelConfig, generateId } from '@/services/templates';
import { VOICES, VoiceKey } from '@/services/tts';
import { CTAType, ZODIAC_SIGNS } from '@/services/api';
import { autoFetchBackgrounds, autoFetchVideo, themeSupportsPhotos } from '@/services/images';
import {
  Clapperboard, Trash2, Play, ChevronUp, Film, Download, RefreshCw, Volume2, Pause, Image as ImageIcon,
} from 'lucide-react';

const ReelPreview = dynamic(() => import('@/components/ReelPreview'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto grid aspect-[9/16] max-w-[280px] place-items-center rounded-xl border border-line bg-surface-2">
      <span className="font-mono text-[11px] text-ink-3">loading player…</span>
    </div>
  ),
});

/* ── Storage ────────────────────────────────────────────────────────────── */

const REELS_KEY = 'grahachara_reels';
const REELS_CAP = 24; // base64 voiceovers are heavy — keep localStorage sane

function loadReels(): ReelConfig[] {
  try {
    const r = JSON.parse(localStorage.getItem(REELS_KEY) || '[]');
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}
function saveReels(reels: ReelConfig[]) {
  try {
    localStorage.setItem(REELS_KEY, JSON.stringify(reels.slice(-REELS_CAP)));
  } catch {
    // Quota exceeded — drop the oldest and retry once.
    try {
      localStorage.setItem(REELS_KEY, JSON.stringify(reels.slice(-8)));
    } catch { /* give up quietly */ }
  }
}

/* ── Script prompt (the tuned viral prompt — unchanged) ─────────────────── */

function getCTAText(cta: CTAType): string {
  const map: Record<CTAType, string> = {
    follow: 'Follow if this was meant to find you',
    download: 'Save this. Come back in 48 hours.',
    website: 'Share this with the person who needs to hear it',
    'free-chart': 'Comment YES if number 5 hit different',
  };
  return map[cta];
}

function buildScriptPrompt(templateType: string, sign: string, astroData: any, cta: CTAType): string {
  const ctaText = getCTAText(cta);

  return `You write viral astrology scripts that exploit primal human desires. Every line must target one of: LOVE, LUST, MONEY, STATUS, REVENGE, FEAR OF LOSS, or FORBIDDEN KNOWLEDGE. These are the 7 triggers that make humans unable to scroll past.

AUDIENCE: Women 18-35 on TikTok/Reels. Sound off. They decide in 0.3 seconds.

=== THE 7 PRIMAL DESIRES (use these as fuel for each point) ===

1. LOVE: "Someone is about to confess something to you. You already know who."
   - The #1 desire. Everyone wants to be chosen, wanted, pursued.
   - Tease a specific person — use initials, physical descriptions, "the one who..."

2. LUST / ATTRACTION: "They can not stop thinking about you. And you know exactly who I mean."
   - Sexual tension, magnetic pull, obsession from another person
   - "You have been on someone's mind at 2am and they are too afraid to tell you"

3. MONEY / ABUNDANCE: "An unexpected amount of money is heading toward you before Friday."
   - Specific amounts, timelines, sources. "A payment, a refund, a gift, or an opportunity"
   - Everyone wants financial relief. Be specific about WHEN.

4. STATUS / RECOGNITION: "The people who doubted you are about to watch you win."
   - Revenge through success. Being seen. Getting credit. Rising above.
   - "Someone who dismissed you is about to regret it deeply"

5. FEAR OF LOSS: "If you do not act on this by Thursday, you will miss it."
   - Urgency, deadlines, "this window closes." FOMO is the strongest driver of action.
   - "A door is closing. Either you walk through it or someone else will."

6. REVENGE / JUSTICE: "The person who hurt you? Their karma is arriving this week."
   - Karmic justice, the universe evening the score, vindication
   - Do not promote actual revenge — frame it as "the universe handles it FOR you"

7. FORBIDDEN KNOWLEDGE: "I was not going to post this for ${sign} but..."
   - Secrets, hidden truths, "what they do not want you to know"
   - Makes the viewer feel like they are getting insider/exclusive access

=== SCRIPT STRUCTURE: 5 POINTS, 5 DESIRES ===

Each of the 5 points MUST target a DIFFERENT primal desire. Rotate through them:
- Point 1: LOVE or LUST (hook them with romance/attraction — highest retention trigger)
- Point 2: MONEY or STATUS (reward them — dopamine hit)
- Point 3: FORBIDDEN KNOWLEDGE (make them feel special — "I should not be telling you this")
- Point 4: FEAR OF LOSS with SPECIFICITY (create urgency — day, time, deadline)
- Point 5: LOVE + REVENGE/JUSTICE combined (the ultimate payoff — "the person who broke your heart is about to see you thriving, and someone better is already on the way")

=== HOOK (spoken aloud during first 4 seconds + shown on screen) ===
- 6-10 words MAX — punchy, pattern-interrupt, scroll-stopping
- Must trigger LUST, LOVE, FORBIDDEN KNOWLEDGE, or FEAR OF LOSS
- Open with sign name then a curiosity gap or command that creates instant tension
- Pattern: "${sign}: [pattern interrupt] + [curiosity gap]"
- Examples:
  "${sign}: stop scrolling. someone is lying to you."
  "${sign}: delete their number. read this first."
  "${sign}: the money you lost is coming back doubled"
  "${sign}: they replay you in their mind at 2am"
  "${sign}: I was not supposed to post this one"
  "${sign}: wait. your intuition was right about them."

=== BODY (spoken, 60-90 words) ===
- 5 punchy points, no numbering words, no transition words
- Each point = 1-2 sentences targeting a different primal desire
- Use Barnum effect + cold reading + fake specificity
- Initials (J, M, S, A), days (Tuesday-Thursday), times (2am, 11:11), amounts ($500, unexpected deposit)
- Make every line feel like a private reading, not a broadcast

CTA (spoken): "${ctaText}"

=== ABSOLUTE RULES ===
- ZERO emojis in script, hook, body, CTA, fullScript, or captions
- ZERO astrology jargon
- ZERO generic filler
- ZERO exclamation marks
- Customize to ${sign} personality and relationship patterns
- Speak as "you/your" only
- Every line must make the viewer think "this is about ME specifically"

SIGN: ${sign}
TEMPLATE: ${templateType}
DATA: ${JSON.stringify(astroData)}

Generate JSON (ZERO emojis):
{
  "hook": "6-10 words, pattern-interrupt + curiosity gap for ${sign}",
  "body": "60-90 words, 5 points each targeting a different primal desire (love, money, forbidden knowledge, fear of loss, love+justice)",
  "cta": "${ctaText}",
  "fullScript": "hook + body + cta combined",
  "hashtags": ["25 hashtags no emojis"],
  "captions": {
    "tiktok": "tease the love/money prediction, no emojis, drive comments",
    "instagram": "tease point 5, drive saves",
    "facebook": "ask about point 5, drive comments"
  },
  "keyPhrases": ["5 gut-punch phrases, 2-4 words, one per desire: e.g. 'They want you.', 'Check your bank.', 'You were right.', 'Door is closing.', 'Karma arrived.'"],
  "imageKeywords": ["5 Pexels queries matching each desire mood: romantic silhouette, gold coins abundance, mysterious dark portrait, clock urgency time, couple embrace sunset"]
}`;
}

function fallbackScript(sign: string, cta: CTAType) {
  return {
    hook: `${sign}: someone is lying to you about how they feel`,
    body: `Someone has been thinking about you at 2am and they are too scared to say it. You already know exactly who I mean. An unexpected amount of money is heading your way before Friday. A payment, a refund, or an opportunity you gave up on. I was not supposed to share this for ${sign} but there is something you need to know. A door is closing by Thursday. If you do not walk through it, someone else will. And the person who broke you? They are about to watch you win. Someone better is already closer than you think.`,
    cta: getCTAText(cta),
    fullScript: '',
    keyPhrases: ['They want you.', 'Check your bank.', 'You were right.', 'Door is closing.', 'Karma arrived.'],
    imageKeywords: ['romantic couple silhouette sunset', 'gold coins abundance light', 'mysterious dark portrait woman', 'clock urgency dramatic light', 'couple embrace golden hour'],
    hashtags: ['#astrology', '#zodiac', `#${sign.toLowerCase()}`, '#manifestation', '#love', '#money', '#karma', '#fyp', '#viral', '#tarot'],
    captions: {
      tiktok: `${sign} wait for the money prediction. screenshot this.`,
      instagram: `${sign}... the love prediction in this one. save it. come back Friday.`,
      facebook: `${sign}s - type YES if the person in point 1 came to mind immediately`,
    },
  };
}

/* ── TTS helper ─────────────────────────────────────────────────────────── */

async function generateVoice(voice: VoiceKey, text: string) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice: VOICES[voice].id, text, rate: '+5%', engine: VOICES[voice].engine }),
  });
  const data = await res.json();
  if (!res.ok || !data.audio) throw new Error(data.error || 'TTS failed');
  return {
    url: `data:audio/mp3;base64,${data.audio}`,
    duration: data.duration as number,
    wordTimings: data.wordTimings as Array<{ word: string; start: number; end: number }>,
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

type RenderState = { status: 'idle' | 'rendering' | 'done' | 'error'; url?: string; error?: string };

export default function VideoPage() {
  const [templateType, setTemplateType] = useState<TemplateType>('daily-horoscope');
  const [theme, setTheme] = useState<VisualTheme>('cosmic-dark');
  const [voice, setVoice] = useState<VoiceKey>('aria');
  const [cta, setCta] = useState<CTAType>('follow');
  const [selectedSigns, setSelectedSigns] = useState<string[]>([...ZODIAC_SIGNS]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [reels, setReels] = useState<ReelConfig[]>([]);

  const template = TEMPLATES[templateType];
  const signCount = template.requiresSign ? selectedSigns.length : 1;

  useEffect(() => {
    setReels(loadReels().reverse()); // newest first
  }, []);

  function persist(next: ReelConfig[]) {
    setReels(next);
    saveReels([...next].reverse()); // storage keeps oldest→newest
  }

  async function handleGenerate() {
    setGenerating(true);
    const signs = template.requiresSign ? selectedSigns : ['General'];
    const total = signs.length;
    setProgress({ current: 0, total, status: 'Fetching astrology data…' });

    try {
      let astroData: any;
      try {
        const res = await fetch('/api/astro/api/marketing/today');
        astroData = await res.json();
      } catch {
        astroData = { fallback: true, date: new Date().toISOString().split('T')[0] };
      }

      let queue = [...reels];

      for (let i = 0; i < signs.length; i++) {
        const sign = signs[i];
        setProgress({ current: i + 1, total, status: `Writing script for ${sign}…` });

        let script: any;
        try {
          const scriptRes = await fetch('/api/generate-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: buildScriptPrompt(templateType, sign, astroData, cta) }),
          });
          const scriptData = await scriptRes.json();
          if (!scriptRes.ok || !scriptData.result) throw new Error(scriptData.error || 'script failed');
          script = scriptData.result;
        } catch {
          script = fallbackScript(sign, cta);
        }
        script.fullScript = script.fullScript || `${script.hook}. ${script.body}. ${script.cta}`;

        // Script ONLY — voice and visuals are explicit per-reel buttons, so
        // nothing spends TTS/Pexels quota without the user pressing it.
        const audio = undefined;
        const backgrounds = undefined;
        const backgroundVideo = undefined;

        const reel: ReelConfig = {
          id: generateId(),
          templateType,
          sign: sign === 'General' ? undefined : sign,
          date: new Date().toISOString().split('T')[0],
          duration: template.defaultDuration,
          theme,
          voice,
          cta,
          status: 'generated',
          script,
          audio,
          backgroundImages: backgrounds,
          backgroundVideo: backgroundVideo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queue = [reel, ...queue];
        persist(queue); // save incrementally so a mid-batch failure keeps progress
        addHistory('video', `Reel — ${sign}`, TEMPLATES[templateType].name);

        if (i < signs.length - 1) await new Promise((r) => setTimeout(r, 400));
      }

      setProgress({ current: total, total, status: 'Scripts ready — voice & visuals are buttons on each reel.' });
    } catch (err: any) {
      setProgress({ current: 0, total: 0, status: `Error: ${err.message}` });
    } finally {
      setGenerating(false);
    }
  }

  function updateReel(id: string, patch: Partial<ReelConfig>) {
    persist(reels.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)));
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Generator · 01"
          title="Video reels"
          description="Generate scripts, then voice, visuals and MP4 per reel — every step is a button; nothing runs on its own."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[320px,1fr]">
          {/* ── Config rail ── */}
          <div className="rise space-y-4 lg:sticky lg:top-8" style={{ ['--i' as any]: 4 }}>
            <Panel title="Template" pad={false}>
              <div className="p-2">
                {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => { setTemplateType(key as TemplateType); setCta(tmpl.defaultCta); }}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 ${
                      templateType === key ? 'bg-accent-glow' : 'hover:bg-surface-2'
                    }`}
                  >
                    <p className={`text-[13px] font-medium ${templateType === key ? 'text-accent-ink' : 'text-ink'}`}>
                      {tmpl.name}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </Panel>

            {template.requiresSign && (
              <Panel
                title="Signs"
                aside={
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedSigns([...ZODIAC_SIGNS])} className="text-[11px] font-medium text-accent-ink hover:brightness-125">All</button>
                    <span className="text-ink-3">·</span>
                    <button onClick={() => setSelectedSigns([])} className="text-[11px] font-medium text-ink-3 hover:text-ink">None</button>
                  </div>
                }
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {ZODIAC_SIGNS.map((sign) => (
                    <Chip
                      key={sign}
                      active={selectedSigns.includes(sign)}
                      onClick={() =>
                        setSelectedSigns((prev) =>
                          prev.includes(sign) ? prev.filter((s) => s !== sign) : [...prev, sign],
                        )
                      }
                      className="flex items-center justify-center gap-1.5 !px-1.5"
                      title={sign}
                    >
                      <SignThumb sign={sign} size={20} />
                      {sign.slice(0, 3)}
                    </Chip>
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="Look & voice">
              <div className="space-y-4">
                <Field label="Visual theme">
                  <div className="space-y-1.5">
                    {Object.entries(VISUAL_THEMES).map(([key, th]) => (
                      <button
                        key={key}
                        onClick={() => setTheme(key as VisualTheme)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                          theme === key ? 'border-accent/60 bg-accent-glow' : 'border-line hover:border-line-strong'
                        }`}
                      >
                        <span className="flex gap-1">
                          <span className="h-3.5 w-3.5 rounded-full border border-line-strong" style={{ backgroundColor: th.colors.bg }} />
                          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: th.colors.accent }} />
                          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: th.colors.secondary }} />
                        </span>
                        <span className={`text-[12px] font-medium ${theme === key ? 'text-accent-ink' : 'text-ink-2'}`}>{th.name}</span>
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Voice" hint="tap ▸ to hear">
                  <VoicePicker voice={voice} setVoice={setVoice} />
                </Field>

                <Field label="Call to action">
                  <Select value={cta} onChange={(e) => setCta(e.target.value as CTAType)}>
                    <option value="follow">Follow for daily readings</option>
                    <option value="download">Download Grahachara</option>
                    <option value="website">Visit grahachara.com</option>
                    <option value="free-chart">Get your free chart</option>
                  </Select>
                </Field>
              </div>
            </Panel>

            <Btn
              variant="primary"
              size="lg"
              className="w-full"
              disabled={generating || (template.requiresSign && selectedSigns.length === 0)}
              onClick={handleGenerate}
            >
              <Clapperboard size={16} />
              {generating ? progress.status || 'Generating…' : `Generate ${signCount} script${signCount === 1 ? '' : 's'}`}
            </Btn>
            <p className="font-mono text-[10px] text-ink-3">
              scripts only — voice, visuals & render run per reel, when you press them
            </p>

            {generating && progress.total > 0 && (
              <Progress
                value={(progress.current / progress.total) * 100}
                status={`${progress.current}/${progress.total} — ${progress.status}`}
              />
            )}
          </div>

          {/* ── Production queue ── */}
          <div className="rise min-w-0" style={{ ['--i' as any]: 5 }}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">
                Production queue <span className="ml-1 font-mono text-ink-3">{reels.length}</span>
              </h2>
              {reels.length > 0 && (
                <button
                  onClick={() => persist([])}
                  className="text-[11px] font-medium text-ink-3 transition-colors hover:text-danger"
                >
                  Clear queue
                </button>
              )}
            </div>

            {reels.length === 0 ? (
              <div className="rounded-xl border border-line bg-surface">
                <EmptyState
                  icon={Clapperboard}
                  title="No reels in the queue"
                  hint="Pick a template and signs on the left, then generate — each reel lands here ready to edit, preview and render."
                />
              </div>
            ) : (
              <div className="space-y-4">
                {reels.map((reel) => (
                  <ReelCard
                    key={reel.id}
                    reel={reel}
                    onDelete={() => persist(reels.filter((r) => r.id !== reel.id))}
                    onUpdate={(patch) => updateReel(reel.id, patch)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── Voice picker ───────────────────────────────────────────────────────── */

function VoicePicker({ voice, setVoice }: { voice: VoiceKey; setVoice: (v: VoiceKey) => void }) {
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  async function preview(key: VoiceKey) {
    if (previewing === key && audioEl) {
      audioEl.pause();
      setPreviewing(null);
      return;
    }
    setPreviewing(key);
    try {
      const v = VOICES[key];
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: v.id,
          text: 'Someone has been thinking about you. And you already know exactly who I mean.',
          rate: '+5%',
          engine: v.engine,
        }),
      });
      const data = await res.json();
      if (data.audio) {
        const el = new Audio(`data:audio/mp3;base64,${data.audio}`);
        el.onended = () => setPreviewing(null);
        el.play();
        setAudioEl(el);
      } else {
        setPreviewing(null);
      }
    } catch {
      setPreviewing(null);
    }
  }

  const groups = [
    ['Edge TTS', Object.entries(VOICES).filter(([, v]) => v.engine === 'edge')],
    ['Kokoro — local HD', Object.entries(VOICES).filter(([, v]) => v.engine === 'kokoro')],
  ] as const;

  return (
    <div className="max-h-[240px] space-y-3 overflow-y-auto pr-1">
      {groups.map(([label, voices]) =>
        voices.length === 0 ? null : (
          <div key={label}>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">{label}</p>
            <div className="space-y-1">
              {voices.map(([key, v]) => (
                <div
                  key={key}
                  onClick={() => setVoice(key as VoiceKey)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all duration-150 ${
                    voice === key ? 'border-accent/60 bg-accent-glow' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[12px] font-medium ${voice === key ? 'text-accent-ink' : 'text-ink-2'}`}>{v.name}</p>
                    <p className="truncate text-[10px] text-ink-3">{v.desc}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); preview(key as VoiceKey); }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-3 transition-colors hover:text-ink"
                    title="Preview voice"
                  >
                    {previewing === key ? <Pause size={11} /> : <Play size={11} className="ml-px" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/* ── Reel card ──────────────────────────────────────────────────────────── */

function ReelCard({
  reel,
  onDelete,
  onUpdate,
}: {
  reel: ReelConfig;
  onDelete: () => void;
  onUpdate: (patch: Partial<ReelConfig>) => void;
}) {
  const [script, setScript] = useState(reel.script?.fullScript || '');
  const [showPreview, setShowPreview] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [fetchingVisuals, setFetchingVisuals] = useState(false);
  const [render, setRender] = useState<RenderState>({ status: 'idle' });

  const words = useMemo(() => script.split(/\s+/).filter(Boolean).length, [script]);
  const sign = reel.sign || 'General';
  const dirty = script !== (reel.script?.fullScript || '');

  function saveScript() {
    if (!dirty) return;
    onUpdate({ script: { ...reel.script!, fullScript: script } });
  }

  async function regenVoice() {
    setRegenerating(true);
    try {
      const audio = await generateVoice(reel.voice, script);
      onUpdate({ script: { ...reel.script!, fullScript: script }, audio });
    } catch (err: any) {
      alert(`Voice generation failed: ${err.message}`);
    } finally {
      setRegenerating(false);
    }
  }

  async function fetchVisuals() {
    if (!reel.sign) return;
    setFetchingVisuals(true);
    try {
      let backgroundVideo;
      let backgrounds;
      try {
        const hookVideoQuery = `cinematic ${reel.sign} portrait mysterious dramatic slow motion`;
        backgroundVideo = await autoFetchVideo(
          reel.sign,
          [hookVideoQuery, reel.script?.imageKeywords?.[0]].filter(Boolean) as string[],
        );
      } catch { backgroundVideo = undefined; }
      try {
        backgrounds = await autoFetchBackgrounds(reel.sign, 5, reel.script?.imageKeywords);
      } catch { backgrounds = undefined; }
      if (!backgroundVideo && (!backgrounds || backgrounds.length === 0)) {
        throw new Error('Pexels returned nothing — check PEXELS_API_KEY.');
      }
      onUpdate({
        backgroundImages: backgrounds && backgrounds.length > 0 ? backgrounds : reel.backgroundImages,
        backgroundVideo: backgroundVideo || reel.backgroundVideo,
      });
    } catch (err: any) {
      alert(`Visuals fetch failed: ${err.message}`);
    } finally {
      setFetchingVisuals(false);
    }
  }

  async function renderVideo() {
    setRender({ status: 'rendering' });
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositionId: reel.duration === 'long' ? 'ReelLong' : 'ReelShort',
          inputProps: {
            theme: reel.theme || 'cosmic-dark',
            script: reel.script,
            wordTimings: reel.audio?.wordTimings || [],
            sign,
            duration: reel.duration || 'short',
            audioUrl: reel.audio?.url || '',
            audioDuration: reel.audio?.duration || 20,
            showSubtitles: true,
            backgroundImages: reel.backgroundImages,
            introVideoPath: reel.backgroundVideo?.localPath,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Render failed (${res.status})`);
      setRender({ status: 'done', url: data.downloadUrl });
      addHistory('video', `Rendered MP4 — ${sign}`, TEMPLATES[reel.templateType]?.name);
    } catch (err: any) {
      setRender({ status: 'error', error: err.message });
    }
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <SignThumb sign={sign} size={38} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">{sign}</p>
          <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
            {TEMPLATES[reel.templateType]?.name} · {VISUAL_THEMES[reel.theme]?.name} · {VOICES[reel.voice]?.name}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-[rgba(224,101,95,0.12)] hover:text-danger"
          title="Delete reel"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Script */}
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        onBlur={saveScript}
        rows={4}
        className={`${inputCls} resize-y font-sans leading-relaxed`}
      />
      <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-ink-3">
        {words} words · ~{Math.ceil(words / 2.5)}s spoken
        {reel.audio ? ` · voiced ${reel.audio.duration.toFixed(1)}s` : ' · no voiceover yet'}
        {reel.backgroundImages?.length ? ` · ${reel.backgroundImages.length} visuals` : ''}
        {dirty && <span className="text-warn"> · edited — regenerate voice</span>}
      </p>

      {/* Audio */}
      {reel.audio && <audio controls src={reel.audio.url} className="mt-3" />}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn size="sm" variant="soft" onClick={regenVoice} disabled={regenerating}>
          <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
          {regenerating ? 'Voicing…' : dirty || !reel.audio ? 'Generate voice' : 'Re-voice'}
        </Btn>
        {themeSupportsPhotos(reel.theme) && reel.sign && (
          <Btn size="sm" variant="soft" onClick={fetchVisuals} disabled={fetchingVisuals}>
            <ImageIcon size={12} className={fetchingVisuals ? 'animate-pulse' : ''} />
            {fetchingVisuals ? 'Fetching…' : reel.backgroundImages?.length ? 'Re-fetch visuals' : 'Fetch visuals'}
          </Btn>
        )}
        <Btn size="sm" variant="ghost" onClick={() => setShowPreview((p) => !p)}>
          {showPreview ? <ChevronUp size={12} /> : <Play size={12} />}
          {showPreview ? 'Hide preview' : 'Preview'}
        </Btn>
        {reel.audio && (
          <a
            href={reel.audio.url}
            download={`${reel.date}_${sign}.mp3`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[12px] font-medium text-ink-2 transition-all hover:bg-surface-2 hover:text-ink"
          >
            <Volume2 size={12} /> MP3
          </a>
        )}

        <span className="mx-1 hidden h-4 w-px bg-line sm:block" />

        {reel.script?.captions &&
          (['tiktok', 'instagram', 'facebook'] as const).map((p) => (
            <CopyButton key={p} text={reel.script!.captions[p]} label={p === 'tiktok' ? 'TikTok' : p === 'instagram' ? 'IG' : 'FB'} />
          ))}
        {reel.script?.hashtags && <CopyButton text={reel.script.hashtags.join(' ')} label="#tags" />}

        <span className="flex-1" />

        {render.status === 'done' && render.url ? (
          <a
            href={render.url}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12px] font-semibold text-[#0b0918] transition-all hover:brightness-110"
          >
            <Download size={13} /> Download MP4
          </a>
        ) : (
          <Btn size="sm" variant="soft" onClick={renderVideo} disabled={render.status === 'rendering'}>
            <Film size={12} />
            {render.status === 'rendering' ? 'Rendering…' : 'Render MP4'}
          </Btn>
        )}
      </div>

      {render.status === 'rendering' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full w-1/2 animate-shimmer rounded-full bg-accent/60" />
          </div>
          <p className="mt-1.5 font-mono text-[10.5px] text-ink-3">bundling & rendering — this takes a minute or two</p>
        </div>
      )}
      {render.status === 'error' && (
        <p className="mt-2 text-[12px] text-danger">Render failed: {render.error}</p>
      )}

      {/* Preview */}
      {showPreview && (
        <div className="mt-4">
          <ReelPreview reel={{ ...reel, script: { ...reel.script!, fullScript: script } }} />
          {!reel.backgroundImages && themeSupportsPhotos(reel.theme) && (
            <p className="mt-2 text-center font-mono text-[10.5px] text-ink-3">
              no stock visuals attached — theme gradient background will be used
            </p>
          )}
        </div>
      )}
    </article>
  );
}
