'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { TEMPLATES, VISUAL_THEMES } from '@/services/templates';

interface DashboardStats {
  totalGenerated: number;
  pendingReview: number;
  approved: number;
  exported: number;
  todayBatch: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalGenerated: 0,
    pendingReview: 0,
    approved: 0,
    exported: 0,
    todayBatch: false,
  });
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    checkServer();
    loadStats();
  }, []);

  async function checkServer() {
    try {
      const res = await fetch('http://localhost:3000/api/health');
      if (res.ok) setServerStatus('online');
      else setServerStatus('offline');
    } catch {
      setServerStatus('offline');
    }
  }

  function loadStats() {
    // Load from localStorage
    const reels = JSON.parse(localStorage.getItem('grahachara_reels') || '[]');
    setStats({
      totalGenerated: reels.length,
      pendingReview: reels.filter((r: any) => r.status === 'generated').length,
      approved: reels.filter((r: any) => r.status === 'approved').length,
      exported: reels.filter((r: any) => r.status === 'exported').length,
      todayBatch: reels.some((r: any) => r.date === new Date().toISOString().split('T')[0]),
    });
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Marketing Studio</h1>
            <p className="text-gray-400 mt-1">{today}</p>
          </div>
          <Link
            href="/generate"
            className="px-6 py-3 bg-brand-purple hover:bg-brand-purple/80 text-white font-semibold rounded-xl transition-all hover:scale-105 shadow-lg shadow-brand-purple/25"
          >
            ⚡ Generate Today&apos;s Batch
          </Link>
        </div>

        {/* Server Status */}
        {serverStatus === 'offline' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm font-medium">
              ⚠️ Server offline — Run <code className="bg-red-500/20 px-2 py-0.5 rounded">cd server && npm run dev</code> to start the astrology engine
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Generated" value={stats.totalGenerated} icon="🎬" color="purple" />
          <StatCard label="Pending Review" value={stats.pendingReview} icon="👁️" color="yellow" />
          <StatCard label="Approved" value={stats.approved} icon="✅" color="green" />
          <StatCard label="Exported" value={stats.exported} icon="📦" color="blue" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Generate</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TEMPLATES).slice(0, 4).map(([key, template]) => (
                <Link
                  key={key}
                  href={`/generate?template=${key}`}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <p className="text-sm text-gray-300 mt-1">{template.name}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Visual Themes</h2>
            <div className="space-y-3">
              {Object.entries(VISUAL_THEMES).map(([key, theme]) => (
                <div key={key} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.bg, border: '1px solid #333' }} />
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.accent }} />
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.secondary }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{theme.name}</p>
                    <p className="text-xs text-gray-500">{theme.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-cosmic-card border border-cosmic-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          {stats.totalGenerated === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🎬</p>
              <p className="text-gray-400">No reels generated yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Click &quot;Generate Today&apos;s Batch&quot; to create your first content
              </p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Recent reels will appear here</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'border-brand-purple/30 bg-brand-purple/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
  };

  return (
    <div className={`p-5 rounded-xl border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
