import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verifyAdmin';

export const dynamic = 'force-dynamic';

const PEXELS_BASE = 'https://api.pexels.com/v1';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!PEXELS_API_KEY) {
    return NextResponse.json(
      { error: 'PEXELS_API_KEY not set. Add it to .env.local (free at pexels.com/api)', images: [] },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'cosmic galaxy';
  const perPage = parseInt(searchParams.get('per_page') || '15');
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const url = `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=${perPage}&page=${page}&size=medium`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Pexels API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();

    // Return simplified image data
    const images = data.photos.map((photo: any) => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      src: {
        original: photo.src.original,
        large: photo.src.large,      // 940px wide
        medium: photo.src.medium,    // 350px wide (thumbnails)
        portrait: photo.src.portrait, // 800x1200
      },
      alt: photo.alt || query,
    }));

    return NextResponse.json({
      images,
      total: data.total_results,
      page: data.page,
      perPage: data.per_page,
    });
  } catch (error: any) {
    console.error('Pexels Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
