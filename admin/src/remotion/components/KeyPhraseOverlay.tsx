import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface Props {
  phrases: string[];
  startFrame: number;
  endFrame: number;
  colors: { bg: string; text: string; accent: string; secondary: string };
}

export const KeyPhraseOverlay: React.FC<Props> = ({ phrases, startFrame, endFrame, colors }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!phrases || phrases.length === 0) return null;

  const totalDuration = endFrame - startFrame;
  const phraseDuration = totalDuration / phrases.length;

  // Find which phrase to show
  const relativeFrame = frame - startFrame;
  const currentPhraseIndex = Math.min(
    Math.floor(relativeFrame / phraseDuration),
    phrases.length - 1
  );

  if (currentPhraseIndex < 0) return null;

  const phraseStartFrame = currentPhraseIndex * phraseDuration;
  const phraseProgress = (relativeFrame - phraseStartFrame) / phraseDuration;

  // Entrance animation
  const enterProgress = spring({
    frame: relativeFrame - phraseStartFrame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // Exit animation (fade out in last 20% of phrase)
  const opacity = phraseProgress > 0.8
    ? interpolate(phraseProgress, [0.8, 1], [1, 0])
    : 1;

  const translateY = interpolate(enterProgress, [0, 1], [50, 0]);
  const scale = interpolate(enterProgress, [0, 1], [0.8, 1]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '35%',
        left: 60,
        right: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          padding: '24px 40px',
          borderRadius: 16,
          backgroundColor: `${colors.accent}22`,
          border: `2px solid ${colors.accent}44`,
          backdropFilter: 'blur(10px)',
        }}
      >
        <p
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: colors.text,
            textAlign: 'center',
            lineHeight: 1.3,
            margin: 0,
            fontFamily: 'Inter, system-ui, sans-serif',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}
        >
          {phrases[currentPhraseIndex]}
        </p>
      </div>
    </div>
  );
};
