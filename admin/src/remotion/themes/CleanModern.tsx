import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import { ELEMENT_CSS_FALLBACKS, getSignElement, ZodiacElement } from '../../services/images';

interface Props {
  frame: number;
  durationInFrames: number;
  sign?: string;
}

const ELEMENT_PALETTES: Record<ZodiacElement, {
  base: string;
  mid: string;
  accent: string;
  shapeColor: string;
}> = {
  fire: {
    base: '#FFFBEB',
    mid: '#FEF3C7',
    accent: '#FDE68A',
    shapeColor: 'rgba(245,158,11,',
  },
  earth: {
    base: '#F0FDF4',
    mid: '#DCFCE7',
    accent: '#BBF7D0',
    shapeColor: 'rgba(34,197,94,',
  },
  air: {
    base: '#FAF5FF',
    mid: '#F3E8FF',
    accent: '#E9D5FF',
    shapeColor: 'rgba(168,85,247,',
  },
  water: {
    base: '#EFF6FF',
    mid: '#DBEAFE',
    accent: '#BFDBFE',
    shapeColor: 'rgba(59,130,246,',
  },
};

export const CleanModernTheme: React.FC<Props> = ({ frame, durationInFrames, sign }) => {
  const shift = interpolate(frame, [0, durationInFrames], [0, 100]);

  const element: ZodiacElement = sign ? getSignElement(sign) : 'fire';
  const palette = ELEMENT_PALETTES[element];

  return (
    <AbsoluteFill style={{ backgroundColor: palette.base }}>
      {/* Soft gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${palette.base} 0%, ${palette.mid} 50%, ${palette.accent} 100%)`,
        }}
      />

      {/* Floating geometric shapes with element-specific colors */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = (i * 29 + 10) % 90;
        const startY = (i * 41 + 20) % 80;
        const y = startY + Math.sin(frame * 0.01 + i) * 5;
        const size = 40 + (i % 4) * 20;
        const opacity = 0.06 + (i % 3) * 0.03;
        const rotation = frame * 0.2 + i * 45;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              border: `2px solid ${palette.shapeColor}${opacity})`,
              borderRadius: i % 2 === 0 ? '50%' : '8px',
              transform: `rotate(${rotation}deg)`,
            }}
          />
        );
      })}

      {/* Subtle dot pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage: `radial-gradient(circle, ${palette.shapeColor}0.8) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Accent line at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, #7C3AED, #F59E0B, #7C3AED)`,
          backgroundSize: '200% 100%',
          backgroundPosition: `${shift}% 0`,
        }}
      />
    </AbsoluteFill>
  );
};
