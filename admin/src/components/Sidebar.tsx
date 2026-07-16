'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/daily-post', label: 'Daily Post', icon: '🌙' },
  { href: '/generate', label: 'Generate', icon: '⚡' },
  { href: '/quotes', label: 'Quotes', icon: '✍️' },
  { href: '/review', label: 'Review', icon: '👁️' },
  { href: '/editor', label: 'Editor', icon: '✏️' },
  { href: '/calendar', label: 'Calendar', icon: '📅' },
  { href: '/export', label: 'Export', icon: '📦' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-cosmic-card border-r border-cosmic-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-cosmic-border">
        <h1 className="text-xl font-bold text-brand-purple">GRAHACHARA</h1>
        <p className="text-xs text-gray-500 mt-1">Marketing Studio</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-cosmic-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-500">Server: localhost:3000</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-xs text-gray-500">Rendering: Local</span>
        </div>
      </div>
    </aside>
  );
}
