'use client';

import React, { useState } from 'react';
import AppShell from '@/components/AppShell';
import { 
  TEMPLATES, VISUAL_THEMES, 
  TemplateType, VisualTheme, ReelDuration, ReelConfig, 
  generateId, BatchGenerateOptions 
} from '@/services/templates';
import { VOICES, VoiceKey } from '@/services/tts';
import { CTAType, ZODIAC_SIGNS } from '@/services/api';
import { autoFetchBackgrounds, autoFetchVideo, themeSupportsPhotos } from '@/services/images';
export default function GeneratePage() {
  const [templateType, setTemplateType] = useState<TemplateType>('daily-horoscope');
  const [theme, setTheme] = useState<VisualTheme>('cosmic-dark');
  const [duration, setDuration] = useState<ReelDuration>('short');
  const [voice, setVoice] = useState<VoiceKey>('aria');
  const [cta, setCta] = useState<CTAType>('follow');
  const [selectedSigns, setSelectedSigns] = useState<string[]>([...ZODIAC_SIGNS]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [generatedReels, setGeneratedReels] = useState<ReelConfig[]>([]);

  const template = TEMPLATES[templateType];

  async function handleGenerate() {
    setGenerating(true);
    const signs = template.requiresSign ? selectedSigns : ['General'];
    const total = signs.length;
    setProgress({ current: 0, total, status: 'Fetching astrology data...' });

    try {
      // 1. Fetch astrology data from server
      let astroData: any;
      try {
        const res = await fetch('http://localhost:3000/api/marketing/today');
        astroData = await res.json();
      } catch {
        astroData = { fallback: true, date: new Date().toISOString().split('T')[0] };
      }

      const reels: ReelConfig[] = [];

      for (let i = 0; i < signs.length; i++) {
        const sign = signs[i];
        setProgress({ current: i + 1, total, status: `Generating script for ${sign}...` });

        // 2. Generate script via Gemini
        let script;
        try {
          const scriptRes = await fetch('/api/generate-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: buildScriptPrompt(templateType, sign, astroData, duration, cta),
            }),
          });
          const scriptData = await scriptRes.json();
          script = scriptData.result;
        } catch (err) {
          script = {
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
        script.fullScript = `${script.hook}. ${script.body}. ${script.cta}`;
        const ttsText = script.fullScript;

        // 3. Generate TTS (hook + body + CTA — hook spoken during intro overlay)
        setProgress({ current: i + 1, total, status: `Generating voice for ${sign}...` });
        let audio;
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              voice: VOICES[voice].id,
              text: ttsText,
              rate: '+5%',
              engine: VOICES[voice].engine,
            }),
          });
          const ttsData = await ttsRes.json();
          audio = {
            url: `data:audio/mp3;base64,${ttsData.audio}`,
            duration: ttsData.duration,
            wordTimings: ttsData.wordTimings,
          };
        } catch {
          audio = undefined;
        }

        // 4. Fetch intro video clip + background images (5 — one per script point)
        let backgrounds;
        let backgroundVideo;
        if (themeSupportsPhotos(theme) && sign !== 'General') {
          setProgress({ current: i + 1, total, status: `Fetching hook video for ${sign}...` });
          try {
            const hookVideoQuery = `cinematic ${sign} portrait mysterious dramatic slow motion`;
            backgroundVideo = await autoFetchVideo(sign, [hookVideoQuery, script.imageKeywords?.[0]].filter(Boolean) as string[]);
          } catch {
            backgroundVideo = undefined;
          }

          setProgress({ current: i + 1, total, status: `Fetching backgrounds for ${sign}...` });
          try {
            backgrounds = await autoFetchBackgrounds(sign, 5, script.imageKeywords);
          } catch {
            backgrounds = undefined;
          }
        }

        // 5. Create reel config
        const reel: ReelConfig = {
          id: generateId(),
          templateType,
          sign: sign === 'General' ? undefined : sign,
          date: new Date().toISOString().split('T')[0],
          duration,
          theme,
          voice,
          cta,
          status: 'generated',
          script,
          audio,
          backgroundImages: backgrounds && backgrounds.length > 0 ? backgrounds : undefined,
          backgroundVideo: backgroundVideo || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        reels.push(reel);

        // Small delay between generations
        if (i < signs.length - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      // Save to localStorage
      const existing = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
      localStorage.setItem('grahachara_reels', JSON.stringify([...existing, ...reels]));
      setGeneratedReels(reels);
      setProgress({ current: total, total, status: 'Done! All reels generated.' });
    } catch (err: any) {
      setProgress({ current: 0, total: 0, status: `Error: ${err.message}` });
    } finally {
      setGenerating(false);
    }
  }

  function toggleSign(sign: string) {
    setSelectedSigns(prev =>
      prev.includes(sign) ? prev.filter(s => s !== sign) : [...prev, sign]
    );
  }

  function selectAllSigns() {
    setSelectedSigns([...ZODIAC_SIGNS]);
  }

  function clearSigns() {
    setSelectedSigns([]);
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Generate Content</h1>
        <p className="text-gray-400 mb-8">Configure and batch-generate marketing reels</p>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Configuration */}
          <div className="col-span-2 space-y-6">
            {/* Template Selection */}
            <Section title="Template">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TEMPLATES).map(([key, tmpl]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setTemplateType(key as TemplateType);
                      setDuration(tmpl.defaultDuration);
                      setCta(tmpl.defaultCta);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      templateType === key
                        ? 'border-brand-purple bg-brand-purple/10'
                        : 'border-cosmic-border bg-cosmic-card hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{tmpl.icon}</span>
                    <p className="font-medium text-white mt-2">{tmpl.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </Section>

            {/* Signs Selection */}
            {template.requiresSign && (
              <Section title="Zodiac Signs">
                <div className="flex gap-2 mb-3">
                  <button onClick={selectAllSigns} className="text-xs px-3 py-1 bg-brand-purple/20 text-brand-purple rounded-full">
                    Select All
                  </button>
                  <button onClick={clearSigns} className="text-xs px-3 py-1 bg-white/10 text-gray-400 rounded-full">
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ZODIAC_SIGNS.map(sign => (
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
              </Section>
            )}

            {/* Info */}
            <Section title="Format">
              <p className="text-sm text-gray-400">
                Video duration auto-matches the generated voiceover length. Typically 25-40s for the 5-things format.
              </p>
            </Section>
          </div>

          {/* Right: Settings Panel */}
          <div className="space-y-6">
            {/* Theme */}
            <Section title="Visual Theme">
              <div className="space-y-2">
                {Object.entries(VISUAL_THEMES).map(([key, th]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key as VisualTheme)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                      theme === key
                        ? 'border-brand-purple bg-brand-purple/10'
                        : 'border-cosmic-border hover:border-white/20'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: th.colors.accent }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: th.colors.secondary }} />
                    </div>
                    <span className="text-sm text-gray-200">{th.name}</span>
                  </button>
                ))}
              </div>
            </Section>

            {/* Voice */}
            <Section title="Voice">
              <VoiceSelector voice={voice} setVoice={setVoice} />
            </Section>

            {/* CTA */}
            <Section title="Call to Action">
              <select
                value={cta}
                onChange={(e) => setCta(e.target.value as CTAType)}
                className="w-full p-3 bg-cosmic-card border border-cosmic-border rounded-lg text-gray-200 text-sm"
              >
                <option value="follow">Follow for daily readings</option>
                <option value="download">Download Grahachara</option>
                <option value="website">Visit grahachara.com</option>
                <option value="free-chart">Get your free chart</option>
              </select>
            </Section>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || (template.requiresSign && selectedSigns.length === 0)}
              className="w-full py-4 bg-gradient-to-r from-brand-purple to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-purple/25"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {progress.status}
                </span>
              ) : (
                `⚡ Generate ${template.requiresSign ? selectedSigns.length : 1} Reel${(template.requiresSign ? selectedSigns.length : 1) > 1 ? 's' : ''}`
              )}
            </button>

            {/* Progress */}
            {generating && progress.total > 0 && (
              <div className="space-y-2">
                <div className="w-full h-2 bg-cosmic-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-purple rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {progress.current}/{progress.total}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Generated Results */}
        {generatedReels.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-4">
              ✅ Generated {generatedReels.length} Reels
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {generatedReels.map(reel => (
                <div key={reel.id} className="bg-cosmic-card border border-cosmic-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{TEMPLATES[reel.templateType].icon}</span>
                    <span className="text-sm font-medium text-white">{reel.sign || 'General'}</span>
                    <span className="ml-auto text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full">
                      Review
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                    {reel.script?.hook}
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={`/editor?id=${reel.id}`}
                      className="flex-1 text-center text-xs py-2 bg-brand-purple/20 text-brand-purple rounded-lg hover:bg-brand-purple/30"
                    >
                      Edit
                    </a>
                    <button
                      onClick={() => approveReel(reel.id)}
                      className="flex-1 text-xs py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
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

function OptionButton({ selected, onClick, label, desc }: { selected: boolean; onClick: () => void; label: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border text-left transition-all ${
        selected
          ? 'border-brand-purple bg-brand-purple/10'
          : 'border-cosmic-border hover:border-white/20'
      }`}
    >
      <p className="font-medium text-white text-sm">{label}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </button>
  );
}

function VoiceSelector({ voice, setVoice }: { voice: VoiceKey; setVoice: (v: VoiceKey) => void }) {
  const [previewing, setPreviewing] = React.useState<string | null>(null);
  const [audioEl, setAudioEl] = React.useState<HTMLAudioElement | null>(null);

  async function previewVoice(key: string, v: typeof VOICES[VoiceKey]) {
    if (previewing === key && audioEl) {
      audioEl.pause();
      setPreviewing(null);
      return;
    }
    setPreviewing(key);
    try {
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
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audio.onended = () => setPreviewing(null);
        audio.play();
        setAudioEl(audio);
      }
    } catch {
      setPreviewing(null);
    }
  }

  const edgeVoices = Object.entries(VOICES).filter(([, v]) => v.engine === 'edge');
  const kokoroVoices = Object.entries(VOICES).filter(([, v]) => v.engine === 'kokoro');

  return (
    <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1 scrollbar-thin">
      {/* Edge TTS */}
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Microsoft Edge TTS</p>
      <div className="space-y-1.5">
        {edgeVoices.map(([key, v]) => (
          <div
            key={key}
            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
              voice === key
                ? 'border-brand-purple bg-brand-purple/10'
                : 'border-cosmic-border hover:border-white/20'
            }`}
            onClick={() => setVoice(key as VoiceKey)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{v.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{v.desc}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); previewVoice(key, v); }}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-gray-400"
            >
              {previewing === key ? '||' : '>>'}
            </button>
          </div>
        ))}
      </div>

      {/* Kokoro */}
      {kokoroVoices.length > 0 && (
        <>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-3">Kokoro (Local HD)</p>
          <div className="space-y-1.5">
            {kokoroVoices.map(([key, v]) => (
              <div
                key={key}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                  voice === key
                    ? 'border-brand-purple bg-brand-purple/10'
                    : 'border-cosmic-border hover:border-white/20'
                }`}
                onClick={() => setVoice(key as VoiceKey)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{v.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{v.desc}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); previewVoice(key, v); }}
                  className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-gray-400"
                >
                  {previewing === key ? '||' : '>>'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function approveReel(id: string) {
  const reels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
  const updated = reels.map((r: any) => r.id === id ? { ...r, status: 'approved' } : r);
  localStorage.setItem('grahachara_reels', JSON.stringify(updated));
  window.location.reload();
}

function getCTAText(cta: CTAType): string {
  const map: Record<CTAType, string> = {
    follow: 'Follow if this was meant to find you',
    download: 'Save this. Come back in 48 hours.',
    website: 'Share this with the person who needs to hear it',
    'free-chart': 'Comment YES if number 5 hit different',
  };
  return map[cta];
}

function buildScriptPrompt(templateType: string, sign: string, astroData: any, _duration: string, cta: CTAType): string {
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
