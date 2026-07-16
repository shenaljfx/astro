import { Composition } from 'remotion';
import { ReelComposition } from './ReelComposition';
import { calcVideoDuration } from './constants';
import { CosmicDarkTheme } from './themes/CosmicDark';
import { CleanModernTheme } from './themes/CleanModern';
import { MysticGoldTheme } from './themes/MysticGold';

/**
 * Rendered length follows the actual voiceover: pass `audioDuration` (seconds)
 * in inputProps and the video is sized to it — same math the studio preview
 * uses, so exports never truncate the audio.
 */
const durationFromProps = ({ props }: { props: { audioDuration?: number } }) => ({
  durationInFrames: Math.max(
    150,
    Math.round(calcVideoDuration(Number(props.audioDuration) || 20) * 30),
  ),
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelShort"
        component={ReelComposition}
        calculateMetadata={durationFromProps}
        durationInFrames={900} // fallback; overridden by calculateMetadata
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          theme: 'cosmic-dark' as const,
          script: {
            hook: 'Scorpios, stop scrolling right now',
            body: 'Venus just entered your 7th house and your love life is about to completely transform. This is the energy shift you have been waiting for all year.',
            cta: 'Follow for daily Vedic readings',
            fullScript: '',
            keyPhrases: ['Venus in 7th house', 'Love life transforms', 'Energy shift of the year'],
            hashtags: [],
            captions: { tiktok: '', instagram: '', facebook: '' },
          },
          wordTimings: [],
          sign: 'Scorpio',
          duration: 'short' as const,
          audioUrl: '',
          showSubtitles: true,
        }}
      />
      <Composition
        id="ReelLong"
        component={ReelComposition}
        calculateMetadata={durationFromProps}
        durationInFrames={2100} // fallback; overridden by calculateMetadata
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          theme: 'cosmic-dark' as const,
          script: {
            hook: 'Your weekly Vedic forecast is here',
            body: 'This week brings powerful planetary movements that will reshape how you approach relationships and career...',
            cta: 'Follow for daily Vedic readings',
            fullScript: '',
            keyPhrases: ['Planetary movements', 'Relationships shift', 'Career transformation', 'New opportunities'],
            hashtags: [],
            captions: { tiktok: '', instagram: '', facebook: '' },
          },
          wordTimings: [],
          sign: 'Aries',
          duration: 'long' as const,
          audioUrl: '',
          showSubtitles: false,
        }}
      />
    </>
  );
};
