import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verifyAdmin';

/**
 * Server-side proxy: the studio's browser calls /api/astro/<path>, and this
 * route (running IN the marketing container on the VM) forwards it to the
 * astrology API over VM-localhost. Because the request originates from
 * 127.0.0.1, it satisfies the API's localhost gate on /api/marketing — no
 * token, no CORS, and the browser never talks to the API directly.
 */
export const dynamic = 'force-dynamic';

const SERVER = process.env.SERVER_INTERNAL_URL || 'http://127.0.0.1:3000';

async function proxy(req: NextRequest, path: string[]) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const target = `${SERVER}/${(path || []).join('/')}${req.nextUrl.search || ''}`;
  try {
    const res = await fetch(target, {
      method: req.method,
      headers: {
        'content-type': req.headers.get('content-type') || 'application/json',
        // Shared secret so the API's marketing gate trusts this server-side call.
        'x-marketing-key': process.env.MARKETING_API_KEY || '',
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text(),
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'astro proxy failed', detail: e?.message || String(e) }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path);
}
