import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, Video, staticFile } from 'remotion';
import { getSignImagePath } from '../../services/images';
import { INTRO_SECONDS } from '../constants';

interface Props {
  sign: string;
  hook: string;
  colors: { bg: string; text: string; accent: string; secondary: string };
  introVideoPath?: string;
}

export const ZodiacIntro: React.FC<Props> = ({ sign, hook, colors, introVideoPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const introFrames = Math.floor(fps * INTRO_SECONDS);

  const signImagePath = getSignImagePath(sign);
  const hookWords = hook.split(/\s+/).filter(Boolean);

  // Impact flash — frames 0-4
  const flash = interpolate(frame, [0, 2, 6], [0.85, 0.4, 0], { extrapolateRight: 'clamp' });

  // Screen shake when hook lands
  const shakeActive = frame >= 18 && frame <= 28;
  const shakeX = shakeActive ? Math.sin(frame * 1.8) * 6 : 0;
  const shakeY = shakeActive ? Math.cos(frame * 2.1) * 4 : 0;

  // Sign image — explosive zoom-in
  const imageSlam = spring({
    frame,
    fps,
    config: { damping: 6, stiffness: 420, mass: 0.35 },
  });
  const imageScale = interpolate(imageSlam, [0, 1], [4, 1]);
  const imageRotate = interpolate(imageSlam, [0, 1], [-12, 0]);

  // Sign name — hard pop at 0.15s
  const nameSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 5, stiffness: 500, mass: 0.25 },
  });
  const nameScale = interpolate(nameSpring, [0, 1], [2.2, 1]);

  // Accent ring pulse
  const ringPulse = Math.sin(frame * 0.15) * 0.35 + 0.65;
  const ringScale = 1 + Math.sin(frame * 0.1) * 0.08;

  // Fade out entire intro near end
  const fadeOut = interpolate(frame, [introFrames - 12, introFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const videoSrc = introVideoPath
    ? (introVideoPath.startsWith('/') ? staticFile(introVideoPath) : introVideoPath)
    : null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: fadeOut,
        transform: `translate(${shakeX}px, ${shakeY}px)`,
      }}
    >
      {/* Intro video clip — cinematic hook background */}
      {videoSrc ? (
        <Video
          src={videoSrc}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          muted
          volume={0}
        />
      ) : null}

      {/* Dark cinematic overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: videoSrc
            ? 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.9) 100%)'
            : `radial-gradient(ellipse at center, ${colors.bg}88 0%, ${colors.bg} 70%)`,
        }}
      />

      {/* Impact flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#FFFFFF',
          opacity: flash,
          pointerEvents: 'none',
        }}
      />

      {/* Top urgency bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)`,
          opacity: interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '0 40px',
        }}
      >
        {/* Sign image */}
        <div
          style={{
            position: 'relative',
            width: 180,
            height: 180,
            transform: `scale(${imageScale}) rotate(${imageRotate}deg)`,
            opacity: imageSlam,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: -14,
              borderRadius: '50%',
              border: `4px solid ${colors.accent}`,
              opacity: ringPulse,
              transform: `scale(${ringScale})`,
              boxShadow: `0 0 60px ${colors.accent}88, 0 0 120px ${colors.accent}44`,
            }}
          />
          <Img
            src={staticFile(signImagePath)}
            style={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(255,255,255,0.3)',
            }}
          />
        </div>

        {/* Sign name */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: '#FFFFFF',
            fontFamily: 'Inter, system-ui, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: 8,
            transform: `scale(${nameScale})`,
            opacity: nameSpring,
            WebkitTextStroke: '3px rgba(0,0,0,0.7)',
            paintOrder: 'stroke fill',
            textShadow: `0 0 30px ${colors.accent}66, 0 4px 20px rgba(0,0,0,0.9)`,
          }}
        >
          {sign}
        </div>

        {/* Hook — word-by-word dopamine stagger */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '6px 10px',
            maxWidth: 900,
            marginTop: 8,
          }}
        >
          {hookWords.map((word, i) => {
            const wordSpring = spring({
              frame: frame - 18 - i * 3,
              fps,
              config: { damping: 8, stiffness: 280, mass: 0.4 },
            });
            const wordScale = interpolate(wordSpring, [0, 1], [1.6, 1]);
            const isHighlight = i === 0 || i === hookWords.length - 1;

            return (
              <span
                key={`${word}-${i}`}
                style={{
                  fontSize: isHighlight ? 52 : 44,
                  fontWeight: 900,
                  color: isHighlight ? colors.accent : '#FFFFFF',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transform: `scale(${wordScale})`,
                  opacity: wordSpring,
                  display: 'inline-block',
                  textShadow: '0 3px 16px rgba(0,0,0,0.95)',
                  WebkitTextStroke: isHighlight ? 'none' : '1px rgba(0,0,0,0.5)',
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Curiosity gap — blinking ellipsis */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: colors.secondary,
            opacity: interpolate(frame, [50, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              * (0.6 + Math.sin(frame * 0.2) * 0.4),
            letterSpacing: 4,
            marginTop: 4,
          }}
        >
          ...
        </div>
      </div>
    </div>
  );
};
