import type { NextRequest } from 'next/server';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Server-side gate for the studio's API routes. Verifies a Firebase ID token
 * (carried in the mkt_token cookie or a Bearer header) against Google's public
 * keys and an email allowlist — no service account needed. Returns the email on
 * success, null on any failure. Every route that spends money (Gemini/TTS) or
 * proxies data MUST call this.
 */
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'nakathai-6c5b7';

export const ADMIN_EMAILS = (process.env.MARKETING_ADMIN_EMAILS ||
  'shenalsamaranayakejfx@gmail.com,ridmaraveengamage@gmail.com')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function verifyAdmin(req: NextRequest): Promise<{ email: string } | null> {
  // Local-dev-only bypass (pairs with AuthGate's NEXT_PUBLIC_DEV_NO_AUTH).
  // NODE_ENV is 'production' in every deployed build, so this cannot fire there.
  if (process.env.NODE_ENV === 'development' && process.env.DEV_NO_AUTH === '1') {
    return { email: 'dev@localhost' };
  }
  try {
    const cookieTok = req.cookies.get('mkt_token')?.value;
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const token = cookieTok || bearer;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });

    const email = String((payload as any).email || '').toLowerCase();
    if (!email || (payload as any).email_verified !== true || !ADMIN_EMAILS.includes(email)) return null;
    return { email };
  } catch {
    return null;
  }
}
