import { Composition } from 'remotion';
import { ReelComposition } from './ReelComposition';
import { CosmicDarkTheme } from './themes/CosmicDark';
import { CleanModernTheme } from './themes/CleanModern';
import { MysticGoldTheme } from './themes/MysticGold';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelShort"
        component={ReelComposition}
        durationInFrames={900} // 30s at 30fps (3s intro + ~20s content + 4s CTA + buffer)
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
        durationInFrames={2100} // 70s at 30fps (3s intro + ~55s content + 4s CTA + buffer)
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
