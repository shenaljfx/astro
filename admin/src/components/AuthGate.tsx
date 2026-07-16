'use client';
import React, { useEffect, useState } from 'react';
import { auth, signIn, signOutUser, watchAuth } from '@/lib/firebaseClient';

const ALLOW = (process.env.NEXT_PUBLIC_MARKETING_ADMIN_EMAILS ||
  'shenalsamaranayakejfx@gmail.com,ridmaraveengamage@gmail.com')
  .split(',').map((s) => s.trim().toLowerCase());

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

  if (user === undefined) {
    return <div style={box}><div style={{ fontSize: 40 }}>🎬</div></div>;
  }

  const email = (user?.email || '').toLowerCase();
  const allowed = !!user && ALLOW.includes(email);

  if (!allowed) {
    return (
      <div style={box}>
        <div style={card}>
          <div style={{ fontSize: 44 }}>🎬</div>
          <h1 style={{ fontSize: 20, margin: '14px 0 6px' }}>Grahachara Marketing Studio</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, maxWidth: 320, margin: '0 auto 22px' }}>
            {user
              ? `Signed in as ${user.email} — this account isn't authorized.`
              : 'Restricted studio. Sign in with an authorized account.'}
          </p>
          {user
            ? <button style={btnGhost} onClick={() => signOutUser()}>Sign out</button>
            : <button style={btn} onClick={() => signIn().catch((e) => alert(e.message))}>Continue with Google</button>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const box: React.CSSProperties = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0817', color: '#e8e4ff' };
const card: React.CSSProperties = { textAlign: 'center', padding: '44px 52px', border: '1px solid rgba(139,92,246,.2)', borderRadius: 16, background: 'rgba(139,92,246,.06)' };
const btn: React.CSSProperties = { background: '#8b5cf6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { ...btn, background: 'transparent', border: '1px solid rgba(139,92,246,.4)' };
