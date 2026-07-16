import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { VisualTheme, VISUAL_THEMES } from '../services/templates';
import { BackgroundImage, themeSupportsPhotos } from '../services/images';
import { CosmicDarkTheme } from './themes/CosmicDark';
import { CleanModernTheme } from './themes/CleanModern';
import { MysticGoldTheme } from './themes/MysticGold';
import { AnimatedSubtitles } from './components/AnimatedSubtitles';
import { KeyPhraseOverlay } from './components/KeyPhraseOverlay';
import { CTAEndCard } from './components/CTAEndCard';
import { ZodiacIntro } from './components/ZodiacIntro';
import { INTRO_SECONDS, CTA_SECONDS } from './constants';

// A `type` (not interface) so it satisfies Remotion's Record<string, unknown>
// constraint on Player/Composition generics.
export type ReelProps = {
  theme: VisualTheme;
  script: {
    hook: string;
    body: string;
    cta: string;
    fullScript: string;
    keyPhrases: string[];
    hashtags: string[];
    captions: { tiktok: string; instagram: string; facebook: string };
  };
  wordTimings: Array<{ word: string; start: number; end: number }>;
  sign: string;
  duration: 'short' | 'long';
  audioUrl: string;
  showSubtitles: boolean;
  backgroundImages?: BackgroundImage[];
  introVideoPath?: string;
  /** Voiceover length in seconds — sizes the rendered video (see remotion/index). */
  audioDuration?: number;
};

export const ReelComposition: React.FC<ReelProps> = ({
  theme,
  script,
  wordTimings,
  sign,
  duration,
  audioUrl,
  showSubtitles,
  backgroundImages,
  introVideoPath,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const themeColors = VISUAL_THEMES[theme].colors;

  const introEnd = Math.floor(fps * INTRO_SECONDS);
  const ctaStart = durationInFrames - Math.floor(fps * CTA_SECONDS);
  const contentEnd = ctaStart;

  const usesPhotos = themeSupportsPhotos(theme);
  const bgPaths = usesPhotos && backgroundImages
    ? backgroundImages.map(bg => bg.localPath)
    : undefined;

  const hasWordTimings = wordTimings && wordTimings.length > 0;

  return (
    <AbsoluteFill>
      {/* Background Theme — full duration */}
      {theme === 'cosmic-dark' && (
        <CosmicDarkTheme
          frame={frame}
          durationInFrames={durationInFrames}
          backgroundImages={bgPaths}
          sign={sign}
        />
      )}
      {theme === 'mystic-gold' && (
        <MysticGoldTheme
          frame={frame}
          durationInFrames={durationInFrames}
          backgroundImages={bgPaths}
          sign={sign}
        />
      )}
      {theme === 'clean-modern' && (
        <CleanModernTheme
          frame={frame}
          durationInFrames={durationInFrames}
          sign={sign}
        />
      )}

      {/* Hook intro overlay (0 → 4s) — audio starts immediately underneath */}
      <Sequence from={0} durationInFrames={introEnd}>
        <ZodiacIntro
          sign={sign}
          hook={script.hook}
          colors={themeColors}
          introVideoPath={introVideoPath}
        />
      </Sequence>

      {/* Full script audio: hook + body + CTA from frame 0 */}
      {audioUrl && <Audio src={audioUrl} />}

      {/* Subtitles synced to audio from start */}
      {showSubtitles && hasWordTimings && (
        <Sequence from={0} durationInFrames={contentEnd}>
          <AnimatedSubtitles
            wordTimings={wordTimings}
            startFrame={0}
            colors={themeColors}
          />
        </Sequence>
      )}

      {/* Key Phrase Overlay fallback (when no word timings) */}
      {(!showSubtitles || !hasWordTimings) && (
        <Sequence from={0} durationInFrames={contentEnd}>
          <KeyPhraseOverlay
            phrases={script?.keyPhrases}
            startFrame={0}
            endFrame={contentEnd}
            colors={themeColors}
          />
        </Sequence>
      )}

      {/* CTA End Card */}
      <Sequence from={ctaStart} durationInFrames={durationInFrames - ctaStart}>
        <CTAEndCard cta={script.cta} colors={themeColors} sign={sign} />
      </Sequence>

      {/* Logo Watermark */}
      <div
        style={{
          position: 'absolute',
          top: 60,
          right: 40,
          opacity: 0.7,
          fontSize: 24,
          fontWeight: 700,
          color: themeColors.accent,
          letterSpacing: 1,
          textShadow: `0 2px 8px ${themeColors.bg}88`,
        }}
      >
        GRAHACHARA
      </div>
    </AbsoluteFill>
  );
};
