import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CACHE_DIR = path.resolve(process.cwd(), 'public', 'backgrounds', 'cache');

/**
 * SSRF guard — this endpoint fetches a client-supplied URL, so restrict it to
 * public http(s) hosts. Blocks loopback, private, and link-local ranges
 * (incl. the 169.254.169.254 cloud-metadata address) and internal TLDs. Note:
 * this is a best-effort scheme/host check, not full DNS-rebinding protection.
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  // IPv6 loopback / unique-local / link-local
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  // IPv4 private / loopback / link-local ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a >= 224) return true;               // multicast / reserved
  }
  return false;
}

function isSafeUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  return !isBlockedHost(u.hostname);
}

export async function POST(request: NextRequest) {
  try {
    const { url, id } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (!isSafeUrl(url)) {
      return NextResponse.json({ error: 'url must be a public http(s) address' }, { status: 400 });
    }

    const hash = id || crypto.createHash('md5').update(url).digest('hex').slice(0, 12);
    const isVideo = url.includes('.mp4') || url.includes('video') || (id && id.startsWith('vid_'));
    const ext = isVideo ? '.mp4' : '.jpg';
    const filename = `${hash}${ext}`;
    const filepath = path.join(CACHE_DIR, filename);
    const publicPath = `/backgrounds/cache/${filename}`;

    // Return cached path if already downloaded
    if (existsSync(filepath)) {
      return NextResponse.json({ path: publicPath, cached: true });
    }

    // Download the image
    await mkdir(CACHE_DIR, { recursive: true });
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to download image: ${res.status}` }, { status: 500 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(filepath, buffer);

    return NextResponse.json({ path: publicPath, cached: false });
  } catch (error: any) {
    console.error('Download Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
