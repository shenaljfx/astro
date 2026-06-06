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

export const MysticGoldTheme: React.FC<Props> = ({
  frame,
  durationInFrames,
  backgroundImages,
  sign,
}) => {
  const shimmer = Math.sin(frame * 0.03) * 0.3 + 0.7;

  const element: ZodiacElement = sign ? getSignElement(sign) : 'fire';
  const fallback = ELEMENT_CSS_FALLBACKS[element];

  const images = backgroundImages && backgroundImages.length > 0 ? backgroundImages : null;
  const imageCount = images?.length || 0;
  const segmentDuration = imageCount > 0 ? durationInFrames / imageCount : durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0C0A09' }}>
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
          { scaleEnd: 1.1, xEnd: 0, yEnd: -2 },
          { scaleEnd: 1.12, xEnd: 1.5, yEnd: 0 },
          { scaleEnd: 1.08, xEnd: -1, yEnd: 1 },
          { scaleEnd: 1.14, xEnd: 0, yEnd: 1.5 },
          { scaleEnd: 1.1, xEnd: -2, yEnd: -1 },
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

      {/* Dark + gold overlay for readability */}
      {images && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(12,10,9,0.55) 0%, rgba(12,10,9,0.3) 40%, rgba(12,10,9,0.8) 100%)',
          }}
        />
      )}

      {/* CSS-only fallback */}
      {!images && (
        <div style={{ position: 'absolute', inset: 0, background: fallback.gradient }} />
      )}

      {/* Deep warm gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, ${images ? 0.06 : 0.12}) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(168, 85, 247, ${images ? 0.04 : 0.08}) 0%, transparent 50%)
          `,
        }}
      />

      {/* Gold particle dust */}
      {Array.from({ length: images ? 12 : 30 }).map((_, i) => {
        const x = (i * 43 + 7) % 100;
        const baseY = (i * 61 + 23) % 100;
        const y = baseY + Math.sin(frame * 0.015 + i * 0.8) * 3;
        const size = 1 + (i % 3);
        const opacity = Math.sin(frame * 0.03 + i) * 0.4 + 0.4;

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
              backgroundColor: '#D97706',
              opacity: opacity * (images ? 0.3 : 0.6),
              boxShadow: `0 0 ${size * 2}px rgba(217, 119, 6, 0.5)`,
            }}
          />
        );
      })}

      {/* Ornate border frame */}
      <div
        style={{
          position: 'absolute',
          inset: 30,
          border: '1px solid rgba(217, 119, 6, 0.2)',
          borderRadius: 16,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 40,
          border: '1px solid rgba(217, 119, 6, 0.1)',
          borderRadius: 12,
        }}
      />

      {/* Corner ornaments */}
      {[
        { top: 20, left: 20 },
        { top: 20, right: 20 },
        { bottom: 20, left: 20 },
        { bottom: 20, right: 20 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: 40,
            height: 40,
            border: '2px solid rgba(217, 119, 6, 0.3)',
            borderRadius: '50%',
            opacity: shimmer,
          } as any}
        />
      ))}
    </AbsoluteFill>
  );
};
