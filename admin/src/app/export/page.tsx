'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { ReelConfig, TEMPLATES, VISUAL_THEMES } from '@/services/templates';

export default function ExportPage() {
  const [reels, setReels] = useState<ReelConfig[]>([]);
  const [exporting, setExporting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'tiktok' | 'instagram' | 'facebook'>('all');

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
    setReels(stored.filter((r: ReelConfig) => r.status === 'approved'));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      // Create export package
      const exportData = reels.map(reel => ({
        id: reel.id,
        filename: `${reel.date}_${reel.templateType}_${reel.sign || 'general'}_${reel.duration}`,
        script: reel.script?.fullScript,
        caption: selectedPlatform === 'all' 
          ? reel.script?.captions 
          : { [selectedPlatform]: reel.script?.captions?.[selectedPlatform as keyof typeof reel.script.captions] },
        hashtags: reel.script?.hashtags?.join(' '),
        theme: reel.theme,
        voice: reel.voice,
        duration: reel.duration,
        audioUrl: reel.audio?.url,
      }));

      // Generate downloadable JSON manifest
      const manifest = {
        exportDate: new Date().toISOString(),
        platform: selectedPlatform,
        totalReels: exportData.length,
        reels: exportData,
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grahachara-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Also export captions as separate text files
      const captionsText = exportData.map(reel => {
        let text = `=== ${reel.filename} ===\n\n`;
        if (typeof reel.caption === 'object' && reel.caption) {
          Object.entries(reel.caption).forEach(([platform, caption]) => {
            text += `[${platform.toUpperCase()}]\n${caption}\n\n`;
          });
        }
        text += `[HASHTAGS]\n${reel.hashtags}\n\n`;
        text += `---\n\n`;
        return text;
      }).join('');

      const captionsBlob = new Blob([captionsText], { type: 'text/plain' });
      const captionsUrl = URL.createObjectURL(captionsBlob);
      const b = document.createElement('a');
      b.href = captionsUrl;
      b.download = `grahachara-captions-${new Date().toISOString().split('T')[0]}.txt`;
      b.click();
      URL.revokeObjectURL(captionsUrl);

      // Mark as exported
      const allReels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
      const updatedReels = allReels.map((r: ReelConfig) => {
        if (reels.find(approved => approved.id === r.id)) {
          return { ...r, status: 'exported' };
        }
        return r;
      });
      localStorage.setItem('grahachara_reels', JSON.stringify(updatedReels));
      setReels([]);

      alert('Export complete! Check your downloads folder.');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  async function exportAudio(reel: ReelConfig) {
    if (!reel.audio?.url) return;
    const a = document.createElement('a');
    a.href = reel.audio.url;
    a.download = `${reel.date}_${reel.sign || 'general'}_${reel.duration}.mp3`;
    a.click();
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Export Content</h1>
            <p className="text-gray-400 mt-1">{reels.length} approved reels ready for export</p>
          </div>
        </div>

        {reels.length === 0 ? (
          <div className="text-center py-20 bg-cosmic-card border border-cosmic-border rounded-xl">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-gray-400">No approved reels to export</p>
            <p className="text-gray-500 text-sm mt-1">
              Approve reels in the Review page first
            </p>
          </div>
        ) : (
          <>
            {/* Export Options */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Export Options</h2>
              
              <div className="grid grid-cols-4 gap-3 mb-6">
                {(['all', 'tiktok', 'instagram', 'facebook'] as const).map(platform => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedPlatform === platform
                        ? 'border-brand-purple bg-brand-purple/10'
                        : 'border-cosmic-border hover:border-white/20'
                    }`}
                  >
                    <p className="text-2xl mb-1">
                      {platform === 'all' ? '📦' : platform === 'tiktok' ? '🎵' : platform === 'instagram' ? '📸' : '👥'}
                    </p>
                    <p className="text-sm text-gray-300 capitalize">{platform === 'all' ? 'All Platforms' : platform}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-4 bg-gradient-to-r from-brand-purple to-purple-700 hover:from-purple-600 hover:to-purple-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
              >
                {exporting ? '⏳ Exporting...' : `📦 Export ${reels.length} Reels (Captions + Manifest)`}
              </button>
            </div>

            {/* Export includes */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Export Includes</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <div>
                    <p className="text-gray-200">Platform captions</p>
                    <p className="text-gray-500 text-xs">TikTok, Instagram, Facebook optimized</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <div>
                    <p className="text-gray-200">Hashtag sets</p>
                    <p className="text-gray-500 text-xs">20-30 per reel, niche + popular mix</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <div>
                    <p className="text-gray-200">Audio files</p>
                    <p className="text-gray-500 text-xs">Voiceover MP3s (download individually)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400">✓</span>
                  <div>
                    <p className="text-gray-200">Posting manifest</p>
                    <p className="text-gray-500 text-xs">JSON with all metadata for scheduling</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reel List */}
            <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Approved Reels</h2>
              <div className="space-y-3">
                {reels.map(reel => (
                  <div key={reel.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TEMPLATES[reel.templateType]?.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {reel.sign || 'General'} — {TEMPLATES[reel.templateType]?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {reel.duration === 'short' ? '15-20s' : '45-60s'} • {VISUAL_THEMES[reel.theme]?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {reel.audio && (
                        <button
                          onClick={() => exportAudio(reel)}
                          className="text-xs px-3 py-1.5 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20"
                        >
                          🔊 Audio
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
