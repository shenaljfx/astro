'use client';
import React, { useEffect, useState } from 'react';
import { auth, signIn, signOutUser, watchAuth } from '@/lib/firebaseClient';

const ALLOW = (process.env.NEXT_PUBLIC_MARKETING_ADMIN_EMAILS ||
  'shenalsamaranayakejfx@gmail.com,ridmaraveengamage@gmail.com')
  .split(',').map((s) => s.trim().toLowerCase());

// Local-dev-only bypass so the studio can be worked on without Google auth.
// Double-gated: NODE_ENV is compile-time in Next, so this is dead code in
// production builds, AND the explicit flag must be set in .env.local.
const DEV_BYPASS = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_NO_AUTH === '1';

// Carry the ID token in a same-origin cookie so every API route can verify it
// without touching each fetch call. Refreshed below before it expires.
function setTokenCookie(t: string | null) {
  if (typeof document === 'undefined') return;
  if (t) document.cookie = `mkt_token=${t}; Path=/; SameSite=Strict; Secure; Max-Age=3600`;
  else document.cookie = 'mkt_token=; Path=/; Max-Age=0';
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(undefined); // undefined = booting

  useEffect(() => watchAuth(async (u: any) => {
    if (u) setTokenCookie(await u.getIdToken().catch(() => null));
    else setTokenCookie(null);
    setUser(u || null);
  }), []);

  useEffect(() => {
    const id = setInterval(async () => {
      if (auth.currentUser) setTokenCookie(await auth.currentUser.getIdToken(true).catch(() => null));
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (DEV_BYPASS) return <>{children}</>;

  if (user === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-3">✦ opening studio…</span>
      </div>
    );
  }

  const email = (user?.email || '').toLowerCase();
  const allowed = !!user && ALLOW.includes(email);

  if (!allowed) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg px-4">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(640px 420px at 50% 12%, var(--accent-glow), transparent 70%)' }}
        />
        <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Grahachara" width={76} height={76} className="mx-auto mb-4 h-[76px] w-[76px]" />
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">✦ Studio</p>
          <h1 className="mt-2 font-display text-[26px] font-semibold tracking-[-0.02em] text-ink">Grahachara</h1>
          <p className="mx-auto mt-3 max-w-[30ch] text-[13px] leading-relaxed text-ink-2">
            {user
              ? `Signed in as ${user.email} — this account isn't authorized.`
              : 'Restricted studio. Sign in with an authorized account.'}
          </p>
          {user ? (
            <button
              onClick={() => signOutUser()}
              className="mt-6 h-10 w-full rounded-lg border border-line-strong text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn().catch((e: Error) => alert(e.message))}
              className="mt-6 h-10 w-full rounded-lg bg-accent text-[13px] font-semibold text-[#0b0918] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Continue with Google
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
