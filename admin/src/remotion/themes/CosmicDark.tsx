import React from 'react';
import { AbsoluteFill, interpolate, Img, staticFile } from 'remotion';
import { ELEMENT_CSS_FALLBACKS, getSignElement, ZodiacElement } from '../../services/images';

interface Props {
  frame: number;
  durationInFrames: number;
  backgroundImages?: string[];
  sign?: string;
}

function resolveImgSrc(path: string) {
  return path.startsWith('/') ? staticFile(path) : path;
}

export const CosmicDarkTheme: React.FC<Props> = ({
  frame,
  durationInFrames,
  backgroundImages,
  sign,
}) => {
  const rotation = interpolate(frame, [0, durationInFrames], [0, 360]);
  const pulse = Math.sin(frame * 0.02) * 0.1 + 0.9;

  const element: ZodiacElement = sign ? getSignElement(sign) : 'fire';
  const fallback = ELEMENT_CSS_FALLBACKS[element];

  const images = backgroundImages && backgroundImages.length > 0 ? backgroundImages : null;
  const imageCount = images?.length || 0;
  const segmentDuration = imageCount > 0 ? durationInFrames / imageCount : durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: '#04030C' }}>
      {/* Cycling background images with Ken Burns + crossfade */}
      {images && images.map((img, idx) => {
        const XFADE = 20;
        const segStart = idx * segmentDuration;
        const segEnd = (idx + 1) * segmentDuration;

        const fadeIn = idx === 0
          ? 1
          : interpolate(frame, [segStart - XFADE, segStart + XFADE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const fadeOut = idx === imageCount - 1
          ? 1
          : interpolate(frame, [segEnd - XFADE, segEnd + XFADE], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const opacity = Math.min(fadeIn, fadeOut);

        if (opacity <= 0) return null;

        const localProgress = (frame - segStart) / segmentDuration;
        const directions = [
          { scaleEnd: 1.12, xEnd: -2, yEnd: 0 },
          { scaleEnd: 1.1, xEnd: 2, yEnd: -1 },
          { scaleEnd: 1.15, xEnd: -1, yEnd: 1.5 },
          { scaleEnd: 1.08, xEnd: 1, yEnd: -2 },
          { scaleEnd: 1.12, xEnd: -1.5, yEnd: 0.5 },
        ];
        const dir = directions[idx % directions.length];

        const kbScale = interpolate(localProgress, [0, 1], [1.0, dir.scaleEnd], { extrapolateRight: 'clamp' });
        const kbX = interpolate(localProgress, [0, 1], [0, dir.xEnd], { extrapolateRight: 'clamp' });
        const kbY = interpolate(localProgress, [0, 1], [0, dir.yEnd], { extrapolateRight: 'clamp' });

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              opacity,
            }}
          >
            <Img
              src={resolveImgSrc(img)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${kbScale}) translate(${kbX}%, ${kbY}%)`,
              }}
            />
          </div>
        );
      })}

      {/* Gradient overlay for readability */}
      {images && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(4,3,12,0.5) 0%, rgba(4,3,12,0.3) 40%, rgba(4,3,12,0.75) 100%)',
          }}
        />
      )}

      {/* CSS-only fallback */}
      {!images && (
        <div style={{ position: 'absolute', inset: 0, background: fallback.gradient }} />
      )}

      {/* Gradient nebula overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 20%, rgba(147, 51, 234, ${images ? 0.08 : 0.15}) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, ${images ? 0.05 : 0.1}) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(251, 191, 36, ${images ? 0.02 : 0.05}) 0%, transparent 40%)
          `,
          transform: `rotate(${rotation * 0.1}deg) scale(${pulse})`,
        }}
      />

      {/* Animated stars */}
      {Array.from({ length: images ? 15 : 50 }).map((_, i) => {
        const x = (i * 37 + 13) % 100;
        const y = (i * 53 + 7) % 100;
        const size = (i % 3) + 1;
        const twinkle = Math.sin(frame * 0.05 + i * 0.5) * 0.5 + 0.5;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              opacity: twinkle * (images ? 0.35 : 0.8),
            }}
          />
        );
      })}

      {/* Subtle grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: images ? 0.015 : 0.03,
          backgroundImage: `
            linear-gradient(rgba(147, 51, 234, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 51, 234, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          transform: `translateY(${frame * 0.2}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
