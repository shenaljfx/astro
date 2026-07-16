import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/verifyAdmin';

export const dynamic = 'force-dynamic';

const PEXELS_BASE = 'https://api.pexels.com';
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!PEXELS_API_KEY) {
    return NextResponse.json(
      { error: 'PEXELS_API_KEY not set', videos: [] },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') || 'cosmic galaxy';
  const perPage = parseInt(searchParams.get('per_page') || '10');
  const page = parseInt(searchParams.get('page') || '1');

  try {
    const url = `${PEXELS_BASE}/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=${perPage}&page=${page}&size=medium`;

    const res = await fetch(url, {
      headers: { Authorization: PEXELS_API_KEY },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Pexels Video API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();

    const videos = data.videos.map((video: any) => {
      const hdFile = video.video_files.find((f: any) => f.quality === 'hd' && f.width <= 1080)
        || video.video_files.find((f: any) => f.quality === 'sd')
        || video.video_files[0];

      return {
        id: video.id,
        width: video.width,
        height: video.height,
        duration: video.duration,
        user: video.user?.name || 'Unknown',
        videoUrl: hdFile?.link || '',
        previewUrl: video.image || '',
        fileType: hdFile?.file_type || 'video/mp4',
      };
    });

    return NextResponse.json({
      videos,
      total: data.total_results,
      page: data.page,
      perPage: data.per_page,
    });
  } catch (error: any) {
    console.error('Pexels Video Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
