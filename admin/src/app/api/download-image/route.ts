import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CACHE_DIR = path.resolve(process.cwd(), 'public', 'backgrounds', 'cache');

export async function POST(request: NextRequest) {
  try {
    const { url, id } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
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
