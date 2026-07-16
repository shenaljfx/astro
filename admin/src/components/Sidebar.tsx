'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clapperboard, Image as ImageIcon, Type, LogOut, LucideIcon } from 'lucide-react';
import { auth, signOutUser } from '@/lib/firebaseClient';
import { StatusDot, useEngineStatus } from '@/components/ui';

export const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon; section?: string }> = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/video', label: 'Video', icon: Clapperboard, section: 'Generators' },
  { href: '/image', label: 'Image post', icon: ImageIcon, section: 'Generators' },
  { href: '/text', label: 'Text', icon: Type, section: 'Generators' },
];

export function isActivePath(pathname: string | null, href: string): boolean {
  return href === '/' ? pathname === '/' : !!pathname?.startsWith(href);
}

function NavLink({ item, active }: { item: (typeof NAV_ITEMS)[number]; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-all duration-150 ease-out ${
        active ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2/60 hover:text-ink'
      }`}
    >
      {active && <span className="absolute left-0 top-2 h-5 w-0.5 rounded-full bg-accent" />}
      <Icon size={17} className={active ? 'text-accent-ink' : 'text-ink-3 group-hover:text-ink-2'} />
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const engine = useEngineStatus();
  const email = auth.currentUser?.email || 'dev session';

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-line bg-surface lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Grahachara" width={38} height={38} className="h-[38px] w-[38px] shrink-0" />
        <div>
          <h1 className="font-display text-[18px] font-semibold leading-tight tracking-[-0.01em] text-ink">Grahachara</h1>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-gold">✦ Studio</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        <NavLink item={NAV_ITEMS[0]} active={isActivePath(pathname, '/')} />
        <p className="px-3 pb-1 pt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-3">Generators</p>
        {NAV_ITEMS.slice(1).map((item) => (
          <NavLink key={item.href} item={item} active={isActivePath(pathname, item.href)} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-line p-4">
        <div className="flex items-center gap-2">
          <StatusDot state={engine === 'online' ? 'ok' : engine === 'checking' ? 'idle' : 'danger'} />
          <span className="font-mono text-[11px] text-ink-3">
            engine {engine === 'checking' ? '…' : engine}
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-ink-3" title={email}>
            {email}
          </span>
          <button
            onClick={() => signOutUser()}
            title="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
