import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface Props {
  wordTimings: Array<{ word: string; start: number; end: number }>;
  startFrame: number;
  colors: { bg: string; text: string; accent: string; secondary: string };
}

const WORDS_PER_GROUP = 4;

export const AnimatedSubtitles: React.FC<Props> = ({ wordTimings, startFrame, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!wordTimings || wordTimings.length === 0) return null;

  const groups: Array<{ words: typeof wordTimings; startTime: number; endTime: number }> = [];
  for (let i = 0; i < wordTimings.length; i += WORDS_PER_GROUP) {
    const chunk = wordTimings.slice(i, i + WORDS_PER_GROUP);
    groups.push({
      words: chunk,
      startTime: chunk[0]?.start || 0,
      endTime: chunk[chunk.length - 1]?.end || 0,
    });
  }

  const currentTime = (frame - startFrame) / fps;

  let currentGroupIndex = -1;
  for (let i = groups.length - 1; i >= 0; i--) {
    if (currentTime >= groups[i].startTime - 0.05) {
      currentGroupIndex = i;
      break;
    }
  }

  if (currentGroupIndex === -1) return null;
  const group = groups[currentGroupIndex];
  if (currentTime > group.endTime + 1.2) return null;

  const groupLocalFrame = Math.max(0, frame - startFrame - Math.floor(group.startTime * fps));
  const groupPop = spring({
    frame: groupLocalFrame,
    fps,
    config: { damping: 9, stiffness: 250, mass: 0.4 },
  });
  const groupScale = interpolate(groupPop, [0, 1], [0.6, 1]);
  const groupY = interpolate(groupPop, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 350,
        left: 40,
        right: 40,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 14,
        transform: `translateY(${groupY}px) scale(${groupScale})`,
      }}
    >
      {group.words.map((wd, i) => {
        const isActive = currentTime >= wd.start - 0.03 && currentTime <= wd.end + 0.06;
        const isPast = currentTime > wd.end + 0.06;

        const wordLocalFrame = Math.max(0, frame - startFrame - Math.floor(wd.start * fps));
        const pop = spring({
          frame: wordLocalFrame,
          fps,
          config: { damping: 6, stiffness: 400, mass: 0.3 },
        });

        const scale = isActive ? interpolate(pop, [0, 0.5, 1], [1.35, 1.1, 1.0]) : 1;
        const yOffset = isActive ? interpolate(pop, [0, 0.3, 1], [0, -8, 0]) : 0;

        const textColor = isActive
          ? colors.accent
          : isPast
            ? '#FFFFFF'
            : 'rgba(255,255,255,0.45)';

        return (
          <span
            key={`${currentGroupIndex}-${i}`}
            style={{
              display: 'inline-block',
              fontSize: 72,
              fontWeight: 900,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: textColor,
              textTransform: 'uppercase',
              letterSpacing: -0.5,
              lineHeight: 1.15,
              transform: `scale(${scale}) translateY(${yOffset}px)`,
              WebkitTextStroke: '3px rgba(0,0,0,0.9)',
              paintOrder: 'stroke fill',
              textShadow: isActive
                ? `0 0 20px ${colors.accent}88, 0 0 40px ${colors.accent}44, 0 4px 8px rgba(0,0,0,1)`
                : '0 4px 8px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            {wd.word}
          </span>
        );
      })}
    </div>
  );
};
