'use client';

import React from 'react';
import { Player } from '@remotion/player';
import { ReelComposition } from '@/remotion/ReelComposition';
import { calcVideoDuration } from '@/remotion/constants';
import { ReelConfig } from '@/services/templates';

/**
 * Remotion preview player — loaded lazily (next/dynamic) from the video page
 * so the heavy player bundle only ships when a preview is opened.
 */
export default function ReelPreview({ reel }: { reel: ReelConfig }) {
  if (!reel.script) return null;
  const seconds = calcVideoDuration(reel.audio?.duration || 20);
  return (
    <div className="mx-auto max-w-[280px] overflow-hidden rounded-xl border border-line">
      <Player
        key={`${reel.id}_${reel.audio?.duration ?? 0}`}
        component={ReelComposition}
        inputProps={{
          theme: reel.theme || 'cosmic-dark',
          script: reel.script,
          wordTimings: reel.audio?.wordTimings || [],
          sign: reel.sign || 'General',
          duration: reel.duration || 'short',
          audioUrl: reel.audio?.url || '',
          showSubtitles: true,
          backgroundImages: reel.backgroundImages,
          introVideoPath: reel.backgroundVideo?.localPath,
        }}
        durationInFrames={Math.max(150, Math.round(seconds * 30))}
        fps={30}
        compositionWidth={1080}
        compositionHeight={1920}
        style={{ width: '100%', aspectRatio: '9/16' }}
        controls
        autoPlay={false}
        clickToPlay
      />
    </div>
  );
}
