import { ReelConfig } from './templates';
import { VOICES } from './tts';

export interface RenderJob {
  id: string;
  reelId: string;
  status: 'pending' | 'rendering' | 'complete' | 'failed';
  progress: number;
  outputUrl?: string;
  voiceOnlyUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

/**
 * Render a reel to MP4 using the server-side Remotion API route.
 * This calls the /api/render endpoint which handles bundling + rendering.
 */
export async function renderReel(reel: ReelConfig): Promise<RenderJob> {
  const compositionId = reel.duration === 'short' ? 'ReelShort' : 'ReelLong';
  
  const inputProps = {
    theme: reel.theme,
    script: reel.script,
    wordTimings: reel.audio?.wordTimings || [],
    sign: reel.sign || 'General',
    duration: reel.duration,
    audioUrl: reel.audio?.url || '',
    showSubtitles: reel.duration === 'short',
  };

  const job: RenderJob = {
    id: `job_${Date.now()}`,
    reelId: reel.id,
    status: 'rendering',
    progress: 0,
    startedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ compositionId, inputProps }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const data = await res.json();
    
    job.status = 'complete';
    job.progress = 100;
    job.outputUrl = `data:video/mp4;base64,${data.base64}`;
    job.completedAt = new Date().toISOString();
  } catch (err: any) {
    job.status = 'failed';
    job.error = err.message;
  }

  return job;
}

/**
 * Download a rendered video
 */
export function downloadVideo(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Generate a posting schedule based on optimal times for US audience
 * Peak times: 
 * - TikTok: 7-9am, 12-3pm, 7-9pm EST
 * - Instagram: 6-9am, 12-2pm, 5-7pm EST
 * - Facebook: 1-3pm, 6-8pm EST
 */
export function getOptimalPostingTimes(platform: 'tiktok' | 'instagram' | 'facebook'): string[] {
  const times: Record<string, string[]> = {
    tiktok: ['7:00 AM EST', '12:00 PM EST', '7:00 PM EST'],
    instagram: ['6:00 AM EST', '12:00 PM EST', '5:00 PM EST'],
    facebook: ['1:00 PM EST', '6:00 PM EST'],
  };
  return times[platform] || times.tiktok;
}

/**
 * Generate a weekly content schedule
 */
export function generateWeeklySchedule(reels: ReelConfig[]): Map<string, ReelConfig[]> {
  const schedule = new Map<string, ReelConfig[]>();
  const today = new Date();

  // Distribute reels across 7 days
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    
    // 2-3 reels per day
    const startIdx = day * 3;
    const dayReels = reels.slice(startIdx, startIdx + 3);
    if (dayReels.length > 0) {
      schedule.set(dateStr, dayReels);
    }
  }

  return schedule;
}
