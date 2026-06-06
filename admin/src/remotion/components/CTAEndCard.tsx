import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { getSignImagePath } from '../../services/images';

interface Props {
  cta: string;
  colors: { bg: string; text: string; accent: string; secondary: string };
  sign?: string;
}

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export const CTAEndCard: React.FC<Props> = ({ cta, colors, sign }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const buttonPulse = Math.sin(frame * 0.1) * 0.03 + 1;
  const glowPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  const signImagePath = sign ? getSignImagePath(sign) : null;
  const symbol = sign ? (ZODIAC_SYMBOLS[sign] || '✦') : null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
        opacity: entrance,
        transform: `scale(${interpolate(entrance, [0, 1], [0.9, 1])})`,
      }}
    >
      {/* Sign icon bookend */}
      {signImagePath && (
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <div
            style={{
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              border: `2px solid ${colors.accent}`,
              opacity: glowPulse,
              boxShadow: `0 0 20px ${colors.accent}44`,
            }}
          />
          <Img
            src={staticFile(signImagePath)}
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              objectFit: 'cover',
              filter: `drop-shadow(0 0 12px ${colors.accent}44)`,
            }}
          />
          {symbol && (
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: colors.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: '#FFFFFF',
              }}
            >
              {symbol}
            </div>
          )}
        </div>
      )}

      {/* Logo */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: colors.accent,
          fontFamily: 'Inter, system-ui, sans-serif',
          letterSpacing: 4,
          textShadow: `0 2px 20px ${colors.bg}AA`,
        }}
      >
        GRAHACHARA
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 28,
          color: `${colors.text}AA`,
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          textShadow: `0 2px 12px ${colors.bg}AA`,
        }}
      >
        Ancient Vedic Wisdom • Modern Precision
      </div>

      {/* CTA Button */}
      <div
        style={{
          padding: '24px 60px',
          borderRadius: 50,
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.secondary})`,
          transform: `scale(${buttonPulse})`,
          boxShadow: `0 0 30px ${colors.accent}44`,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {cta}
        </span>
      </div>

      {/* Arrow indicator */}
      <div
        style={{
          fontSize: 40,
          color: colors.secondary,
          transform: `translateY(${Math.sin(frame * 0.15) * 8}px)`,
          textShadow: `0 2px 12px ${colors.bg}AA`,
        }}
      >
        ↓ Link in Bio
      </div>
    </div>
  );
};
