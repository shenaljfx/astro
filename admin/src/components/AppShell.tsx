'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Sidebar, { NAV_ITEMS, isActivePath } from '@/components/Sidebar';

/** Compact top bar for < lg viewports (the sidebar handles desktop). */
function MobileBar() {
  const pathname = usePathname();
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md lg:hidden">
      <div className="flex h-12 items-center justify-between px-4">
        <span className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={24} height={24} className="h-6 w-6" />
          <span className="font-display text-[15px] font-semibold text-ink">Grahachara</span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">✦ Studio</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-colors ${
                active ? 'bg-surface-2 text-accent-ink' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <MobileBar />
      <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
