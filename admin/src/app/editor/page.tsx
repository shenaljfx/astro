'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { ReelConfig, TEMPLATES, VISUAL_THEMES, VisualTheme } from '@/services/templates';
import { VOICES, VoiceKey } from '@/services/tts';
import { CTAType } from '@/services/api';
import { Player } from '@remotion/player';
import { ReelComposition } from '@/remotion/ReelComposition';
import { calcVideoDuration } from '@/remotion/constants';
import { autoFetchBackgrounds, themeSupportsPhotos, BackgroundImage } from '@/services/images';

function EditorContent() {
  const searchParams = useSearchParams();
  const reelId = searchParams.get('id');
  const [reel, setReel] = useState<ReelConfig | null>(null);
  const [editedScript, setEditedScript] = useState('');
  const [regeneratingVoice, setRegeneratingVoice] = useState(false);
  const [fetchingBackgrounds, setFetchingBackgrounds] = useState(false);
  const [availableBackgrounds, setAvailableBackgrounds] = useState<BackgroundImage[]>([]);
  const [detectedAudioDuration, setDetectedAudioDuration] = useState<number>(0);

  useEffect(() => {
    if (reelId) {
      const reels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
      const found = reels.find((r: ReelConfig) => r.id === reelId);
      if (found) {
        setReel(found);
        setEditedScript(found.script?.fullScript || '');
      }
    }
  }, [reelId]);

  useEffect(() => {
    if (!reel?.audio?.url) return;
    const audio = new window.Audio();
    audio.src = reel.audio.url;
    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDetectedAudioDuration(audio.duration);
      }
    });
    return () => { audio.src = ''; };
  }, [reel?.audio?.url]);

  function saveChanges() {
    if (!reel) return;
    const reels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
    const updated = reels.map((r: ReelConfig) => {
      if (r.id === reel.id) {
        return {
          ...r,
          script: { ...r.script, fullScript: editedScript },
          theme: reel.theme,
          voice: reel.voice,
          cta: reel.cta,
          backgroundImages: reel.backgroundImages,
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    localStorage.setItem('grahachara_reels', JSON.stringify(updated));
    alert('Changes saved!');
  }

  async function fetchMoreBackgrounds() {
    if (!reel?.sign) return;
    setFetchingBackgrounds(true);
    try {
      const bgs = await autoFetchBackgrounds(reel.sign, 8, reel.script?.imageKeywords);
      setAvailableBackgrounds(bgs);
    } catch {
      alert('Failed to fetch backgrounds. Check your Pexels API key.');
    } finally {
      setFetchingBackgrounds(false);
    }
  }

  function replaceBackgroundAtIndex(bg: BackgroundImage, idx: number) {
    if (!reel) return;
    const current = [...(reel.backgroundImages || [])];
    while (current.length <= idx) current.push(bg);
    current[idx] = bg;
    setReel({ ...reel, backgroundImages: current });
  }

  function removeBackgroundAtIndex(idx: number) {
    if (!reel) return;
    const current = [...(reel.backgroundImages || [])];
    current.splice(idx, 1);
    setReel({ ...reel, backgroundImages: current.length > 0 ? current : undefined });
  }

  function addBackground(bg: BackgroundImage) {
    if (!reel) return;
    const current = [...(reel.backgroundImages || [])];
    if (current.length >= 7) return;
    current.push(bg);
    setReel({ ...reel, backgroundImages: current });
  }

  async function regenerateVoice() {
    if (!reel) return;
    setRegeneratingVoice(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: VOICES[reel.voice].id,
          text: editedScript,
          rate: '+5%',
          engine: VOICES[reel.voice].engine,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'TTS failed');
      const updatedReel = {
        ...reel,
        audio: {
          url: `data:audio/mp3;base64,${data.audio}`,
          duration: data.duration,
          wordTimings: data.wordTimings,
        },
      };
      setDetectedAudioDuration(data.duration);
      setReel(updatedReel);

      // Save to storage
      const reels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
      const updated = reels.map((r: ReelConfig) => r.id === reel.id ? updatedReel : r);
      localStorage.setItem('grahachara_reels', JSON.stringify(updated));
    } catch (err: any) {
      alert(`Voice generation failed: ${err.message}`);
    } finally {
      setRegeneratingVoice(false);
    }
  }

  if (!reel) {
    return (
      <AppShell>
        <div className="max-w-5xl mx-auto text-center py-20">
          <p className="text-gray-400">
            {reelId ? 'Reel not found' : 'Select a reel from the Review page to edit'}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Reel</h1>
            <p className="text-gray-400 mt-1">
              {TEMPLATES[reel.templateType]?.icon} {reel.sign || 'General'} • {reel.date}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveChanges}
              className="px-5 py-2 bg-brand-purple text-white rounded-lg font-medium hover:bg-brand-purple/80"
            >
              💾 Save
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Script Editor - 3 cols */}
          <div className="col-span-3 space-y-6">
            {/* Full Script */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Script</h3>
              <textarea
                value={editedScript}
                onChange={(e) => setEditedScript(e.target.value)}
                rows={8}
                className="w-full bg-white/5 border border-cosmic-border rounded-lg p-4 text-gray-200 text-sm resize-none focus:border-brand-purple focus:outline-none"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">
                  {editedScript.split(/\s+/).filter(Boolean).length} words • 
                  ~{Math.ceil(editedScript.split(/\s+/).filter(Boolean).length / 2.5)}s spoken
                </span>
                <button
                  onClick={regenerateVoice}
                  disabled={regeneratingVoice}
                  className="text-xs px-3 py-1.5 bg-brand-purple/20 text-brand-purple rounded-lg hover:bg-brand-purple/30 disabled:opacity-50"
                >
                  {regeneratingVoice ? '⏳ Generating...' : '🔊 Regenerate Voice'}
                </button>
              </div>
            </div>

            {/* Audio Preview */}
            {reel.audio && (
              <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Audio Preview</h3>
                <audio controls className="w-full" src={reel.audio.url}>
                  Your browser does not support audio.
                </audio>
                <p className="text-xs text-gray-500 mt-2">
                  Audio: {detectedAudioDuration ? detectedAudioDuration.toFixed(1) : (reel.audio.duration ?? 0).toFixed(1)}s • 
                  Video: {calcVideoDuration(detectedAudioDuration || reel.audio?.duration || 20).toFixed(0)}s •
                  {reel.audio.wordTimings?.length ?? 0} words
                </p>
              </div>
            )}

            {/* Captions */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Platform Captions</h3>
              <div className="space-y-3">
                {reel.script?.captions && Object.entries(reel.script.captions).map(([platform, caption]) => (
                  <div key={platform} className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs font-medium text-brand-purple capitalize mb-1">{platform}</p>
                    <p className="text-sm text-gray-300">{caption}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            {reel.script?.hashtags && (
              <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Hashtags</h3>
                <div className="flex flex-wrap gap-2">
                  {reel.script.hashtags.slice(0, 20).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-brand-purple/10 text-brand-purple rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel - 2 cols */}
          <div className="col-span-2 space-y-5">
            {/* Video Preview */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl overflow-hidden">
              {reel.script ? (
                <Player
                  key={reel.id}
                  component={ReelComposition}
                  inputProps={{
                    theme: reel.theme || 'cosmic-dark',
                    script: reel.script,
                    wordTimings: reel.audio?.wordTimings || [],
                    sign: reel.sign,
                    duration: reel.duration || 'short',
                    audioUrl: reel.audio?.url || '',
                    showSubtitles: true,
                    backgroundImages: reel.backgroundImages,
                    introVideoPath: reel.backgroundVideo?.localPath,
                  }}
                  durationInFrames={Math.max(30, Math.round(calcVideoDuration(detectedAudioDuration || reel.audio?.duration || 20) * 30))}
                  fps={30}
                  compositionWidth={1080}
                  compositionHeight={1920}
                  style={{ width: '100%', aspectRatio: '9/16' }}
                  controls
                  autoPlay={false}
                  clickToPlay
                />
              ) : (
                <div className="aspect-[9/16] bg-gradient-to-b from-brand-purple/10 to-transparent flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl mb-2">🎬</p>
                    <p className="text-sm text-gray-400">Video Preview</p>
                    <p className="text-xs text-gray-500 mt-1">Generate a script first</p>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Selector */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Theme</h3>
              <div className="space-y-2">
                {Object.entries(VISUAL_THEMES).map(([key, th]) => (
                  <button
                    key={key}
                    onClick={() => setReel({ ...reel, theme: key as VisualTheme })}
                    className={`w-full p-2 rounded-lg border text-left flex items-center gap-2 transition-all text-sm ${
                      reel.theme === key
                        ? 'border-brand-purple bg-brand-purple/10'
                        : 'border-cosmic-border hover:border-white/20'
                    }`}
                  >
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: th.colors.accent }} />
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: th.colors.secondary }} />
                    </div>
                    <span className="text-gray-200">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selector */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Voice</h3>
              <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1">
                {Object.entries(VOICES).map(([key, v]) => (
                  <div
                    key={key}
                    onClick={() => setReel({ ...reel, voice: key as VoiceKey })}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm ${
                      reel.voice === key
                        ? 'border-brand-purple bg-brand-purple/10'
                        : 'border-cosmic-border hover:border-white/20'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-200 text-sm">{v.name}</span>
                      <span className="text-[10px] text-gray-500 ml-1">{v.engine === 'kokoro' ? 'HD' : ''}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Background Images — 5 slots, one per script point */}
            {themeSupportsPhotos(reel.theme) && (
              <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">
                    Backgrounds
                    <span className="text-xs text-gray-500 font-normal ml-1">
                      ({reel.backgroundImages?.length || 0} images)
                    </span>
                  </h3>
                  <button
                    onClick={fetchMoreBackgrounds}
                    disabled={fetchingBackgrounds}
                    className="text-xs px-2 py-1 bg-brand-purple/20 text-brand-purple rounded-lg hover:bg-brand-purple/30 disabled:opacity-50"
                  >
                    {fetchingBackgrounds ? 'Fetching...' : 'Fetch New'}
                  </button>
                </div>

                {/* Current slideshow order */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const bg = reel.backgroundImages?.[idx];
                    return (
                      <div key={idx} className="relative group">
                        {bg ? (
                          <>
                            <img
                              src={bg.localPath}
                              alt={bg.alt}
                              className="w-full h-14 object-cover rounded-lg border border-cosmic-border"
                            />
                            <button
                              onClick={() => removeBackgroundAtIndex(idx)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/90 text-white text-[9px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none"
                            >
                              x
                            </button>
                            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">
                              {idx + 1}
                            </span>
                          </>
                        ) : (
                          <div className="w-full h-14 rounded-lg border border-dashed border-cosmic-border flex items-center justify-center">
                            <span className="text-[9px] text-gray-600">{idx + 1}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Available backgrounds to add */}
                {availableBackgrounds.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Click to add / replace:</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {availableBackgrounds.map((bg) => {
                        const alreadyUsed = reel.backgroundImages?.some(b => b.id === bg.id);
                        return (
                          <img
                            key={bg.id}
                            src={bg.localPath}
                            alt={bg.alt}
                            className={`w-full h-12 object-cover rounded-lg border cursor-pointer transition-colors ${
                              alreadyUsed
                                ? 'border-brand-purple/50 opacity-50'
                                : 'border-cosmic-border hover:border-brand-purple'
                            }`}
                            onClick={() => !alreadyUsed && addBackground(bg)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {!reel.backgroundImages?.length && availableBackgrounds.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    No backgrounds yet. Click &quot;Fetch New&quot; to load from Pexels.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<AppShell><div className="text-gray-400 p-8">Loading...</div></AppShell>}>
      <EditorContent />
    </Suspense>
  );
}
