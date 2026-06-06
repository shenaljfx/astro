'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import { ReelConfig, TEMPLATES, VISUAL_THEMES } from '@/services/templates';
import Link from 'next/link';

export default function ReviewPage() {
  const [reels, setReels] = useState<ReelConfig[]>([]);
  const [filter, setFilter] = useState<'all' | 'generated' | 'approved' | 'exported'>('all');

  useEffect(() => {
    loadReels();
  }, []);

  function loadReels() {
    const stored = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
    setReels(stored);
  }

  function updateStatus(id: string, status: ReelConfig['status']) {
    const updated = reels.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r);
    setReels(updated);
    localStorage.setItem('grahachara_reels', JSON.stringify(updated));
  }

  function deleteReel(id: string) {
    const updated = reels.filter(r => r.id !== id);
    setReels(updated);
    localStorage.setItem('grahachara_reels', JSON.stringify(updated));
  }

  function approveAll() {
    const updated = reels.map(r => r.status === 'generated' ? { ...r, status: 'approved' as const } : r);
    setReels(updated);
    localStorage.setItem('grahachara_reels', JSON.stringify(updated));
  }

  const filtered = filter === 'all' ? reels : reels.filter(r => r.status === filter);
  const groupedByDate = filtered.reduce<Record<string, ReelConfig[]>>((acc, reel) => {
    const date = reel.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(reel);
    return acc;
  }, {});

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/20 text-gray-400',
    generated: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    exported: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Review Content</h1>
            <p className="text-gray-400 mt-1">{reels.length} total reels</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={approveAll}
              className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm hover:bg-green-500/30"
            >
              ✅ Approve All Pending
            </button>
            <Link
              href="/export"
              className="px-4 py-2 bg-brand-purple/20 text-brand-purple border border-brand-purple/30 rounded-lg text-sm hover:bg-brand-purple/30"
            >
              📦 Export Approved
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'generated', 'approved', 'exported'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-brand-purple text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-2 text-xs opacity-60">
                ({f === 'all' ? reels.length : reels.filter(r => r.status === f).length})
              </span>
            </button>
          ))}
        </div>

        {/* Reels Grid by Date */}
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="text-center py-20 bg-cosmic-card border border-cosmic-border rounded-xl">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-400">No reels to review</p>
            <Link href="/generate" className="text-brand-purple text-sm hover:underline mt-2 inline-block">
              Generate your first batch →
            </Link>
          </div>
        ) : (
          Object.entries(groupedByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dateReels]) => (
              <div key={date} className="mb-8">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">{formatDate(date)}</h2>
                <div className="grid grid-cols-3 gap-4">
                  {dateReels.map(reel => (
                    <div key={reel.id} className="bg-cosmic-card border border-cosmic-border rounded-xl p-4 hover:border-white/20 transition-all">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{TEMPLATES[reel.templateType]?.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-white">{reel.sign || 'General'}</p>
                            <p className="text-xs text-gray-500">{TEMPLATES[reel.templateType]?.name}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[reel.status]}`}>
                          {reel.status}
                        </span>
                      </div>

                      {/* Script Preview */}
                      <div className="mb-3 p-3 bg-white/5 rounded-lg">
                        <p className="text-xs text-brand-purple font-medium mb-1">Hook:</p>
                        <p className="text-sm text-gray-300">{reel.script?.hook}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <span>{reel.duration === 'short' ? '15-20s' : '45-60s'}</span>
                        <span>•</span>
                        <span>{VISUAL_THEMES[reel.theme]?.name}</span>
                        <span>•</span>
                        <span>{reel.audio ? '🔊' : '🔇'}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/editor?id=${reel.id}`}
                          className="flex-1 text-center text-xs py-2 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10"
                        >
                          ✏️ Edit
                        </Link>
                        {reel.status === 'generated' && (
                          <button
                            onClick={() => updateStatus(reel.id, 'approved')}
                            className="flex-1 text-xs py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30"
                          >
                            ✅ Approve
                          </button>
                        )}
                        <button
                          onClick={() => deleteReel(reel.id)}
                          className="text-xs py-2 px-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>
    </AppShell>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
