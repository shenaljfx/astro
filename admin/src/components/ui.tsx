'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, LucideIcon } from 'lucide-react';

/* ── Shared class fragments ─────────────────────────────────────────────── */

export const inputCls =
  'w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 ' +
  'transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none';

/* ── Page header — the one composed entrance per page ───────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="rise font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3" style={{ ['--i' as any]: 0 }}>
          {eyebrow}
        </p>
        <h1
          className="rise mt-1.5 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink"
          style={{ ['--i' as any]: 1 }}
        >
          {title}
        </h1>
        {description && (
          <p className="rise mt-2 max-w-[52ch] text-[13px] text-ink-2" style={{ ['--i' as any]: 2 }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="rise flex items-center gap-2" style={{ ['--i' as any]: 3 }}>
          {actions}
        </div>
      )}
    </header>
  );
}

/* ── Panel ──────────────────────────────────────────────────────────────── */

export function Panel({
  title,
  aside,
  children,
  className = '',
  pad = true,
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface ${className}`}>
      {(title || aside) && (
        <div className={`flex items-center justify-between gap-3 border-b border-line px-4 py-3`}>
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-2">{title}</h3>
          {aside}
        </div>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[12px] font-medium text-ink-2">{label}</label>
        {hint && <span className="font-mono text-[10px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-[0.01em] ' +
  'transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-45 select-none';

const btnSizes = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-11 px-5 text-[14px] font-semibold',
};

const btnVariants = {
  primary:
    'bg-accent text-[#0b0918] hover:brightness-110 active:scale-[0.98] shadow-[0_0_0_1px_rgba(139,124,255,.35),0_4px_18px_var(--accent-glow)]',
  soft: 'bg-accent-glow text-accent-ink hover:bg-[rgba(139,124,255,0.24)] active:scale-[0.98]',
  ghost: 'border border-line-strong text-ink-2 hover:bg-surface-2 hover:text-ink active:scale-[0.98]',
  danger: 'bg-[rgba(224,101,95,0.12)] text-danger hover:bg-[rgba(224,101,95,0.2)] active:scale-[0.98]',
};

export function Btn({
  variant = 'ghost',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof btnVariants;
  size?: keyof typeof btnSizes;
}) {
  return <button type={type} className={`${btnBase} ${btnSizes[size]} ${btnVariants[variant]} ${className}`} {...props} />;
}

/* ── Premium select (native under the hood, styled shell + chevron) ─────── */

export function Select({
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select
        {...props}
        className={`${inputCls} cursor-pointer appearance-none truncate pr-8 hover:border-line-strong`}
      >
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  );
}

/* ── Chips (selectable) ─────────────────────────────────────────────────── */

export function Chip({
  active,
  onClick,
  children,
  className = '',
  title,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all duration-150 ease-out active:scale-[0.97] ${
        active
          ? 'border-accent/60 bg-accent-glow text-accent-ink'
          : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ── Status & progress ──────────────────────────────────────────────────── */

export function StatusDot({ state }: { state: 'ok' | 'warn' | 'danger' | 'idle' }) {
  const color =
    state === 'ok' ? 'bg-ok' : state === 'warn' ? 'bg-warn' : state === 'danger' ? 'bg-danger' : 'bg-ink-3';
  return (
    <span className="relative inline-flex h-2 w-2">
      {state === 'ok' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-30" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

export function Progress({ value, status }: { value: number; status?: string }) {
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="relative h-full overflow-hidden rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${Math.max(3, Math.min(100, value))}%` }}
        >
          <span className="absolute inset-y-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>
      {status && <p className="mt-1.5 font-mono text-[11px] text-ink-3">{status}</p>}
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface-2">
        <Icon size={20} className="text-ink-3" />
      </div>
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      {hint && <p className="mt-1 max-w-[38ch] text-[12px] text-ink-3">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ── Copy button ────────────────────────────────────────────────────────── */

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-all duration-150 ${
        copied ? 'bg-[rgba(92,189,138,0.14)] text-ok' : 'bg-surface-2 text-ink-3 hover:text-ink'
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {label ? (copied ? 'Copied' : label) : null}
    </button>
  );
}

/* ── Zodiac ─────────────────────────────────────────────────────────────── */

/** Illustrated sign art shipped in public/zodiac (512×512, circular). */
export const SIGN_ART: Record<string, string> = {
  Aries: '/zodiac/aries.png',
  Taurus: '/zodiac/taurus.png',
  Gemini: '/zodiac/gemini.png',
  Cancer: '/zodiac/cancer.png',
  Leo: '/zodiac/leo.png',
  Virgo: '/zodiac/virgo.png',
  Libra: '/zodiac/libra.png',
  Scorpio: '/zodiac/scorpio.png',
  Sagittarius: '/zodiac/sagittarius.png',
  Capricorn: '/zodiac/capricorn.png',
  Aquarius: '/zodiac/aquarius.png',
  Pisces: '/zodiac/pisces.png',
};

/** Round zodiac-art thumbnail with a quiet seat border. */
export function SignThumb({
  sign,
  size = 28,
  className = '',
}: {
  sign: string;
  size?: number;
  className?: string;
}) {
  const src = SIGN_ART[sign];
  if (!src) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-surface-2 text-accent-ink ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        ✦
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={sign}
      width={size}
      height={size}
      className={`rounded-full border border-line-strong object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** ︎ forces monochrome text presentation (never emoji). */
export const SIGN_GLYPHS: Record<string, string> = {
  Aries: '♈︎',
  Taurus: '♉︎',
  Gemini: '♊︎',
  Cancer: '♋︎',
  Leo: '♌︎',
  Virgo: '♍︎',
  Libra: '♎︎',
  Scorpio: '♏︎',
  Sagittarius: '♐︎',
  Capricorn: '♑︎',
  Aquarius: '♒︎',
  Pisces: '♓︎',
};

/* ── Engine health ──────────────────────────────────────────────────────── */

export function useEngineStatus(pollMs = 60000) {
  const [state, setState] = useState<'checking' | 'online' | 'offline'>('checking');
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const res = await fetch('/api/astro/api/health', { cache: 'no-store' });
        if (alive) setState(res.ok ? 'online' : 'offline');
      } catch {
        if (alive) setState('offline');
      }
    }
    check();
    const id = setInterval(check, pollMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [pollMs]);
  return state;
}

/* ── Time ───────────────────────────────────────────────────────────────── */

export function relativeTime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
