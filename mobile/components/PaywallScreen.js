/**
 * PaywallScreen v6 — Grahachara Premium Paywall
 *
 * ⚠️  NO <Modal> — renders as a full-screen absolute overlay.
 *     This bypasses the RN 0.76 + newArch + Android 15 edge-to-edge
 *     Modal bug where content collapses to zero height on real devices.
 *     See: facebook/react-native#47950, #47254, expo/expo#33046
 *
 * Also removed AwesomeRashiChakra (heavy SVG that could crash in overlay)
 * and reduced particle count for reliability on low-end devices.
 *
 * Context-aware: different content for onboarding, report, and porondam.
 * - onboarding = monthly subscription
 * - report     = one-time per report
 * - porondam   = one-time per check
 *
 * Props:
 *   visible, onClose, onPurchased, source ('onboarding' | 'report' | 'porondam')
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Dimensions, ActivityIndicator, Linking, Platform, Image,
  ScrollView, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn, FadeOut, FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withDelay, interpolate, Easing,
} from 'react-native-reanimated';
import { useLanguage } from '../contexts/LanguageContext';
import { usePricing } from '../contexts/PricingContext';
import {
  getOfferings,
  purchasePackage,
  purchaseOneTimeProduct,
  restorePurchases,
  PRODUCT_IDS,
} from '../services/revenuecat';
import { APP_LOGO_IMAGE } from '../assets/logo-inline';

var { width: SW, height: SH } = Dimensions.get('window');
var IS_SMALL = SH < 700;

// ─── Context-specific content ────────────────────────────────────

var CONTENT = {
  onboarding: {
    en: {
      badge: '✦ LIMITED LAUNCH OFFER · 50% OFF',
      hook: 'Your future, fully decoded. 9 planets, 12 houses, and 27 nakshatras holding the secrets to your next 5 years.',
      title: 'The Blueprint of\nYour Destiny',
      subtitle: 'Unlock the exact dates for wealth, love, and major life changes. Like having a master astrologer in your pocket, 24/7.',
      stats: [
        { value: '12K+', label: 'Sri Lankans' },
        { value: '4.8★', label: '2,341 reviews' },
        { value: '9 ග්‍රහ', label: 'analysed' },
      ],
      features: [
        { icon: 'telescope-outline', text: 'Full Vedic Birth Chart',
          desc: 'Lagna, Navamsha, all 12 bhavas deeply analyzed with hidden yogas.' },
        { icon: 'alert-circle-outline', text: 'Crisis & Opportunity Alerts',
          desc: 'Know your challenging periods months in advance. Avoid financial loss and regret.' },
        { icon: 'chatbubble-ellipses-outline', text: 'Personal AI Astrologer',
          desc: 'Chat about your chart. "Will I marry him?" "Should I take this job?" Get tailored, honest answers.' },
        { icon: 'diamond-outline', text: 'Wealth, Marriage & Career Timing',
          desc: 'Exact dasha & bhukti windows. Know exactly when to strike and when to lay low.' },
        { icon: 'planet-outline', text: 'Accurate Weekly Lagna Forecasts',
          desc: 'Not generic moon sign fluff — precise weekly predictions based strictly on your Lagna (Ascendant).' },
        { icon: 'color-wand-outline', text: 'Secret Vedic Remedies',
          desc: 'Discover the exact gems, mantras, and actions to neutralize your worst planetary doshas.' },
      ],
      valueLine: 'Master Astrologer consultation: LKR 5,000+',
      testimonial: '"Told me I would get a promotion in October. It happened. My mind is blown."',
      testimonialAuthor: '— Tharindu, Colombo',
      urgency: '⏱ Less than a single cup of coffee per month',
      cta: 'Unlock My Destiny',
      ctaSub: 'Cancel anytime · No hidden charges · Protected by Google Play',
    },
    si: {
      badge: '✦ දියත් කිරීමේ විශේෂ ඉල්ලුම · 50% වට්ටම්',
      hook: 'ඔයාගේ අනාගතයේ රහස් සොයාගන්න. ග්‍රහයන් 9ක්, භාව 12ක් සහ නැකැත් 27ක් ඔයාගේ ජීවිතයට බලපාන හැටි.',
      title: 'ඔයාගේ ඉරණම\nදැන් ඔයාගේ අතේ.',
      subtitle: 'ප්‍රවීණ ජ්‍යෝතිෂ්‍යවේදියෙකුගේ කාර්යාලයට නොගොස්, ඔයාට ධනය සහ ජීවන වෙනස්කම් ගෙන එන නිවැරදිම කාලසීමාවන් දැන්ම දැනගන්න.',
      stats: [
        { value: '12K+', label: 'ශ්‍රී ලාංකිකයෝ' },
        { value: '4.8★', label: 'සමාලෝචන 2,341' },
        { value: '9 ග්‍රහ', label: 'විශ්ලේෂණය' },
      ],
      features: [
        { icon: 'telescope-outline', text: 'සම්පූර්ණ කේන්දර පරීක්ෂාව',
          desc: 'ඔයාගේ කේන්දරයේ සැඟවුණු ප්‍රබල යෝග, ලග්නය, නවාංශකය සහ භාව 12ම.' },
        { icon: 'alert-circle-outline', text: 'මාරක සහ අපල කාල ඇඟවීම්',
          desc: 'ඉදිරියට එන කරදර සහ ධන හානි මාස ගණනකට පෙරම දැනගන්න, අවදානම් වලින් බේරෙන්න.' },
        { icon: 'chatbubble-ellipses-outline', text: 'ඔයාගේම පෞද්ගලික AI ජ්‍යෝතිෂී',
          desc: '"මට මේ රස්සාව ලැබෙයිද?" "ඔහු මට කවදා හමුවෙයිද?" — ඔයාගේ කේන්දරය මත පදනම් වූ නිවැරදි පිළිතුරු.' },
        { icon: 'diamond-outline', text: 'ධනය, විවාහය සහ දියුණුව ලැබෙන කාල',
          desc: 'විවාහය සහ දියුණුවට අදාල හැම දශාවම සහ අතුරු දශාවම නිවැරදිවම මැනගන්න.' },
        { icon: 'planet-outline', text: 'නිවැරදිම සතිපතා ලග්න පලාපල',
          desc: 'සාමාන්‍ය පත්තර වල බොරු පලාපල නෙවෙයි — ඔයාගේම ලග්නයට අනුව සතියේ පලාපල හරියටම දැනගන්න.' },
        { icon: 'color-wand-outline', text: 'රහස්‍ය පිළියම් සහ මන්ත්‍ර',
          desc: 'ඔයාගේ අපල දුරු කරගන්නට හරියටම පැළඳිය යුතු මැණික් සහ කියවිය යුතු මන්ත්‍ර හරියටම.' },
      ],
      valueLine: 'ප්‍රජා ජ්‍යෝතිෂී උපදේශනය: රු. 5,000+',
      testimonial: '"මගේ රස්සාව මාරුව හරියටම මාසයට කිවුවා. ඇත්තටම පුදුම හිතුණා."',
      testimonialAuthor: '— තරිඳු, කොළඹ',
      urgency: '⏱ මාසෙකට තේ කෝප්පයක මිලටත් අඩුයි',
      cta: 'මගේ කේන්දරේ රහස් අරින්න',
      ctaSub: 'ඕනෑම වෙලාවක නවතන්න · Google Play හරහා ආරක්ෂිතයි',
    },
  },
  report: {
    en: {
      badge: '★ MOST POPULAR · INSTANT DOWNLOAD',
      hook: 'Your 47+ page master-report is ready. Your entire life arc, written exclusively for you.',
      title: 'The Ultimate Revelation\nOf Your Life',
      subtitle: 'Discover exactly when you\'ll peak financially, when you\'ll meet your soulmate, and what hidden talents will make you rich.',
      stats: [
        { value: '47+', label: 'pages' },
        { value: '12', label: 'life areas' },
        { value: '120', label: 'years mapped' },
      ],
      features: [
        { icon: 'document-text-outline', text: 'All 12 Life Areas Decoded',
          desc: 'Your deepest self, untold wealth logic, family, health, career, and fame—every locked door opened.' },
        { icon: 'heart-outline', text: 'Marriage & Love Timeline',
          desc: 'When you\'ll finally meet them, the best age to marry, and the psychological traits of your future spouse.' },
        { icon: 'trending-up-outline', text: 'Career & Wealth Forecast',
          desc: 'Should you do a business or job? When are your highest earning years? Will you move abroad?' },
        { icon: 'pulse-outline', text: 'Health & Vulnerabilities',
          desc: 'Specific points in your life to be hyper-cautious about your health. Prevention mapping based on doshas.' },
        { icon: 'color-wand-outline', text: 'Lifelong Protection Remedies',
          desc: 'Your ultimate lucky gemstone, secret mantras, and specific donations to continuously buffer bad periods.' },
        { icon: 'download-outline', text: 'A Beautiful PDF — Yours Forever',
          desc: 'Download instantly, read endlessly. Uncover new meanings as you move through life.' },
      ],
      valueLine: 'Printed custom astrologer report: LKR 8,000+',
      testimonial: '"Unbelievably accurate about my past relationships. Confirmed everything I felt but couldn\'t explain."',
      testimonialAuthor: '— Nadeesha, Kandy',
      urgency: '✦ Less than a movie ticket — yours to keep for life',
      cta: 'Get My Complete Life Report',
      ctaSub: 'One-time payment · Yours instantly · 7-day money-back guarantee',
    },
    si: {
      badge: '★ ජනප්‍රියම · ක්ෂණික PDF',
      hook: 'ඔයා වෙනුවෙන්ම ලියැවුණු පිටු 47ක ජීවිත කතාව සූදානම්.',
      title: 'ඔයාගේ ජීවිතයම\nවෙනස් කරන වාර්තාව',
      subtitle: 'ධනවත් වන කාලය, විවාහ වන වයස සහ සැඟවුණු දක්ෂතා — ලංකාවේ ප්‍රවීණ ජ්‍යෝතිෂ්‍යවේදියෙකුගේ විග්‍රහයක් මෙන්.',
      stats: [
        { value: '47+', label: 'පිටු' },
        { value: '12', label: 'භාව' },
        { value: '120', label: 'වසර' },
      ],
      features: [
        { icon: 'document-text-outline', text: 'ජීවිතයේ ප්‍රධාන අංශ 12ම විවෘත වේ',
          desc: 'කාටවත් නොකියූ ඔයාගේ ආදායම් මාර්ග, පවුල, රක්ෂාව, අධ්‍යාපනය සහ දක්ෂතා ගැන සියල්ල.' },
        { icon: 'heart-outline', text: 'ආදරය සහ විවාහයට අදාල රහස්',
          desc: 'ඔයාට ගැලපෙනම සහකරුගේ ස්වභාවය මොන වගේද සහ ඔවුන් හමුවන නිශ්චිත කාලසීමාවන්.' },
        { icon: 'trending-up-outline', text: 'රස්සාව සහ ධනය ගලා එන කාල',
          desc: 'ව්‍යාපාර කරලා ගොඩ යනවද? පිටරට යනවද? ඔයාගේ ජීවිතයේ ස්වර්ණමය කාලය කවදාද යන්න හරියටම.' },
        { icon: 'pulse-outline', text: 'සෞඛ්‍ය අවදානම් සහ ආයු කාලය',
          desc: 'ඔයාගේ ශරීරයේ දුර්වල ස්ථාන, ප්‍රවේසම් විය යුතු කාල සහ එය මඟහරවා ගන්නා විදිහ.' },
        { icon: 'color-wand-outline', text: 'ජීවිත කාලයටම බලපාන පිළියම්',
          desc: 'ඔයාගේ වාසනාව කැඳවන මැණික්, කියවිය යුතු බලගතු මන්ත්‍ර සහ දානමාන හරියටම.' },
        { icon: 'download-outline', text: 'ජීවිත කාලයටම වැදගත් වන PDF වාර්තාව',
          desc: 'එක වරක් බාගත කර ඔයාගේ සහ දෙමාපියන්ගේ දුරකථනයේ තබාගන්න. ඕනෑම වෙලාවක කියවන්න.' },
      ],
      valueLine: 'මුද්‍රිත සම්පූර්ණ කේන්දර කියවීමක්: රු. 8,000+',
      testimonial: '"මගේ පරණ සම්බන්ධතා ගැන කියපු දේවල් ඇත්තටම 100% ක් නිවැරදියි. පුදුම හිතුණා."',
      testimonialAuthor: '— නදීෂා, මහනුවර',
      urgency: '✦ සිනමා ටිකට් එකකටත් අඩුයි — ජීවිත කාලයටම වැදගත්',
      cta: 'මගේ සම්පූර්ණ වාර්තාව ගන්න',
      ctaSub: 'එක් වරක් ගෙවන්න · ක්ෂණිකව ලැබේ · දින 7ක තෘප්තිය සහතිකය',
    },
  },
  porondam: {
    en: {
      badge: '♥ SOULMATE CHECK · TRADITIONAL + AI',
      hook: 'Don\'t leave your marriage to chance. Let a 2,000-year-old Vedic science reveal the absolute truth.',
      title: 'Is This the Right\nPerson For You?',
      subtitle: 'Instantly discover hidden red flags, long-term compatibility, and exactly how your futures align.',
      stats: [
        { value: '7', label: 'factors' },
        { value: '20', label: 'max score' },
        { value: '30s', label: 'instant' },
      ],
      features: [
        { icon: 'sparkles-outline', text: 'All 7 Core Porondam Factors',
          desc: 'Dina, Gana, Yoni, Rashi, Vasya, Nadi, Mahendra — checked exactly as the elders do.' },
        { icon: 'stats-chart-outline', text: 'The Brutally Honest Truth',
          desc: 'No sugar-coating. The real compatibility score out of 20, and what each factor truly means for your marriage.' },
        { icon: 'flame-outline', text: 'Hidden Red-Flag Detection',
          desc: 'Nadi doshas, Rashi conflicts, psychological mismatches — what fights are likely & how to prevent them.' },
        { icon: 'checkmark-circle-outline', text: 'Clear Go / No-Go Verdict',
          desc: 'Direct, plain advice in your language — proceed with blessings, proceed with caution, or walk away.' },
        { icon: 'share-outline', text: 'Shareable PDF for the Family',
          desc: 'A beautifully formatted one-page PDF to share with matching parents — settling the debate instantly.' },
      ],
      valueLine: 'Traditional Porondam Consultation: LKR 2,500+',
      testimonial: '"We were hesitating because of one dosha, but this explained exactly how it affects us. Got married last month!"',
      testimonialAuthor: '— Kavindu, Galle',
      urgency: '♥ Before you commit your whole life — let the stars confirm it.',
      cta: 'Check Our Match Now',
      ctaSub: 'One-time payment · Instant calculation · 100% private',
    },
    si: {
      badge: '♥ පොරොන්දම් පරීක්ෂාව · සම්ප්‍රදායික + AI',
      hook: 'විවාහයක් කියන්නේ ජීවිතයේ ලොකුම තීරණයයි. තීරණයක් ගන්න කලින් තාරකා කියන ඇත්ත දැනගන්න.',
      title: 'ඔවුන් ඔයාටම\nහිමි කෙනාද?',
      subtitle: 'වසර 2,000ක් පැරණි සාම්ප්‍රදායික පරීක්ෂාව යොදාගෙන කොයිතරම් දුරට ඔයා දෙදෙනා ගැලපෙනවද කියලා තත්පර 30කින් හරියටම දකින්න.',
      stats: [
        { value: '7', label: 'පොරොන්දම්' },
        { value: '20', label: 'උපරිමය' },
        { value: '30s', label: 'ක්ෂණික' },
      ],
      features: [
        { icon: 'sparkles-outline', text: 'පොරොන්දම් 7 ම නිවැරදිව පරීක්ෂාව',
          desc: 'දින, ගණ, යෝනි, රාශි, වශ්‍ය, නාඩි, මහේන්ද්‍ර යන අංග වැඩිහිටියන් බලන විදිහටම.' },
        { icon: 'stats-chart-outline', text: 'ලකුණු 20න් සැබෑ ගැලපීම',
          desc: 'කිසිම දෙයක් වසන් නොකර, ඔයා දෙදෙනාගේ අනාගතය කොතරම් සාර්ථක ද කියලා සත්‍ය ලකුණු ප්‍රමාණයෙන්.' },
        { icon: 'flame-outline', text: 'විවාහයෙන් පසු එන ගැටළු කලින්ම දකින්න',
          desc: 'නාඩි දෝෂ, රාශි ගැටුම් සහ අදහස් නොගැලපීම් — ඇතිවිය හැකි රණ්ඩු සහ ඒ පවුල් ආරවුල් මගහරවා ගන්නා අයුරු.' },
        { icon: 'checkmark-circle-outline', text: 'ඍජු සහ පැහැදිලි අවසාන තීරණය',
          desc: 'සිංහලෙන් සරලවම — ඉදිරියට යා යුතුද? ප්‍රවේසම් විය යුතුද? නැවත සිතිය යුතුද? යන්න බියකින් තොරව දැනගන්න.' },
        { icon: 'share-outline', text: 'පවුලේ අයට පෙන්වීමට PDF වාර්තාවක්',
          desc: 'දෙමාපියන්ගේ සැක දුරු කිරීමට පෙන්විය හැකි ලස්සන PDF එකක් — අනවශ්‍ය වාද විවාද හැමදාටම ඉවරයි.' },
      ],
      valueLine: 'සාමාන්‍යයෙන් පොරොන්දම් බැලීම සඳහා: රු. 2,500+',
      testimonial: '"එක දෝෂයක් නිසා අපි ගොඩක් බයෙන් හිටියේ, ඒත් මෙතනින් ඒක පැහැදිලි කළා. අපි ගිය මාසෙ බැන්දා!"',
      testimonialAuthor: '— කවින්දු, ගාල්ල',
      urgency: '♥ ඔයාගේ මුළු අනාගතයම භාර දෙන්න කලින් — තාරකාවල නිවැරදි ගැලපීමක් තිබේදැයි බලන්න.',
      cta: 'අපේ ගැලපීම දැන් බලන්න',
      ctaSub: 'එක් වරක් · ප්‍රතිඵල ක්ෂණිකව · සම්පූර්ණයෙන් පෞද්ගලිකයි',
    },
  },
};

var ACCENTS = {
  onboarding: { primary: '#FFB800', secondary: '#FF8C00', gradient: ['#FFD700', '#FFB800', '#FF8C00'] },
  report:     { primary: '#34D399', secondary: '#10B981', gradient: ['#34D399', '#10B981', '#059669'] },
  porondam:   { primary: '#F472B6', secondary: '#EC4899', gradient: ['#F472B6', '#EC4899', '#DB2777'] },
};

var SHARED = {
  en: {
    restore: 'Restore purchases', terms: 'Terms', privacy: 'Privacy',
    secured: 'Secured by Google Play',
    noSub: 'No active subscription found',
    purchaseFail: 'Purchase failed. Please try again.',
    restoreFail: 'Restore failed.',
    oneTime: 'one-time',
    perMonth: '/month',
    perReport: '/report',
    valuePrefix: 'Worth',
    youPay: 'You pay only',
    guarantee: '7-day money-back · Cancel anytime',
    instantAccess: 'Instant access · Works offline',
    youGet: 'WHAT YOU GET',
  },
  si: {
    restore: 'ප්‍රතිස්ථාපනය', terms: 'කොන්දේසි', privacy: 'රහස්‍යතාව',
    secured: 'Google Play ආරක්ෂිතයි',
    noSub: 'දායකත්වයක් නැහැ',
    purchaseFail: 'මිලදී ගැනීම අසාර්ථකයි.',
    restoreFail: 'ප්‍රතිස්ථාපනය අසාර්ථකයි.',
    oneTime: 'එක් වරක්',
    perMonth: '/මාසයට',
    perReport: '/රිපෝට් එකට',
    valuePrefix: 'වටිනාකම',
    youPay: 'ඔයා ගෙවන්නේ',
    guarantee: 'දින 7ක මුදල් ආපසු · ඕනෑම වෙලාවක නවතන්න',
    instantAccess: 'ක්ෂණික ප්‍රවේශය · Offline වැඩ කරයි',
    youGet: 'ඔයාට ලැබෙන්නේ',
  },
};

// ─── Subtle floating particles (only 5 — lightweight) ────────────

var PARTICLE_DATA = [];
for (var _pi = 0; _pi < 5; _pi++) {
  PARTICLE_DATA.push({
    id: _pi,
    left: 10 + Math.random() * 80,
    top: 5 + Math.random() * 90,
    size: 1.5 + Math.random() * 1.5,
    dur: 4000 + Math.random() * 3000,
    delay: Math.random() * 2000,
    color: _pi % 2 === 0 ? '#FFB80040' : '#9333EA30',
  });
}

function SingleParticle({ p }) {
  var anim = useSharedValue(0);
  useEffect(function () {
    anim.value = withDelay(p.delay,
      withRepeat(withTiming(1, { duration: p.dur, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(anim.value, [0, 0.5, 1], [0, 0.6, 0]),
      transform: [{ translateY: interpolate(anim.value, [0, 1], [0, -12]) }],
    };
  });
  return (
    <Animated.View
      style={[{
        position: 'absolute',
        left: p.left + '%',
        top: p.top + '%',
        width: p.size,
        height: p.size,
        borderRadius: p.size,
        backgroundColor: p.color,
      }, style]}
    />
  );
}

function FloatingParticles() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLE_DATA.map(function (p) {
        return <SingleParticle key={p.id} p={p} />;
      })}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function PaywallScreen({ visible, onClose, onPurchased, source }) {
  var insets = useSafeAreaInsets();
  var { language } = useLanguage();
  var lang = language === 'si' ? 'si' : 'en';
  var { priceLabel, priceAmount, isInternational, syncFromStoreCurrency } = usePricing();

  var src = source || 'onboarding';
  var content = CONTENT[src] ? CONTENT[src][lang] : CONTENT.onboarding[lang];
  var shared = SHARED[lang];
  var accent = ACCENTS[src] || ACCENTS.onboarding;
  var isOneTime = src === 'report' || src === 'porondam';

  // Debug logging
  console.log('[Paywall] render — visible:', visible, 'source:', src, 'lang:', lang);

  var [offerings, setOfferings] = useState(null);
  var [loadingOfferings, setLoadingOfferings] = useState(true);
  var [purchasing, setPurchasing] = useState(false);
  var [restoring, setRestoring] = useState(false);
  var [error, setError] = useState('');

  // Handle Android back button — dismiss paywall
  useEffect(function () {
    if (!visible || !onClose) return;
    var handler = function () { onClose(); return true; };
    var sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return function () { sub.remove(); };
  }, [visible, onClose]);

  // Load offerings when paywall becomes visible
  useEffect(function () {
    if (!visible) return;
    console.log('[Paywall] visible=true, loading offerings for source:', src);
    setLoadingOfferings(true);
    setError('');
    getOfferings()
      .then(function (off) {
        console.log('[Paywall] offerings loaded:', off ? 'YES' : 'NULL',
          off && off.current ? 'current=' + off.current.identifier : 'no-current');
        setOfferings(off);
        // Sync the detected store currency (LKR/USD/etc.) back to PricingContext.
        // RevenueCat reports the user's actual Play Store / App Store account
        // currency — the same currency they'll be charged in. This is more
        // reliable than the device locale-based detection.
        try {
          var anyProduct = null;
          var pools = [];
          if (off && off.current && off.current.availablePackages) pools.push(off.current.availablePackages);
          if (off && off.all) {
            Object.keys(off.all).forEach(function (k) {
              if (off.all[k] && off.all[k].availablePackages) pools.push(off.all[k].availablePackages);
            });
          }
          for (var i = 0; i < pools.length && !anyProduct; i++) {
            for (var j = 0; j < pools[i].length; j++) {
              if (pools[i][j] && pools[i][j].product) { anyProduct = pools[i][j].product; break; }
            }
          }
          var rcCurrency = anyProduct && (anyProduct.currencyCode || anyProduct.priceCurrencyCode);
          if (rcCurrency && syncFromStoreCurrency) {
            console.log('[Paywall] sync currency from RevenueCat:', rcCurrency);
            syncFromStoreCurrency(rcCurrency);
          }
        } catch (syncErr) {
          if (__DEV__) console.warn('[Paywall] currency sync failed:', syncErr && syncErr.message);
        }
      })
      .catch(function (err) {
        console.error('[Paywall] offerings FAILED:', err && err.message ? err.message : err);
      })
      .finally(function () { setLoadingOfferings(false); });
  }, [visible]);

  // Button glow animation
  var btnPulse = useSharedValue(0);
  useEffect(function () {
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    );
  }, []);

  var btnGlowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(btnPulse.value, [0, 1], [0.3, 0.7]),
      transform: [{ scale: interpolate(btnPulse.value, [0, 1], [0.95, 1.05]) }],
    };
  });

  var getMonthlyPackage = useCallback(function () {
    if (!offerings) return null;
    var pools = [];
    if (offerings.current && offerings.current.availablePackages) {
      pools.push(offerings.current.availablePackages);
    }
    if (offerings.all) {
      Object.keys(offerings.all).forEach(function (k) {
        var off = offerings.all[k];
        if (off && off.availablePackages) pools.push(off.availablePackages);
      });
    }
    var matcher = function (p) {
      return p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly' ||
        (p.product && p.product.identifier && p.product.identifier.indexOf('monthly') !== -1);
    };
    for (var i = 0; i < pools.length; i++) {
      var hit = pools[i].find(matcher);
      if (hit) return hit;
    }
    return null;
  }, [offerings]);

  // Find the RevenueCat package matching a given product identifier
  // (e.g. 'full_report' or 'porondam_check'). Returns null if not configured.
  var getPackageByProductId = useCallback(function (productId) {
    if (!offerings || !productId) return null;
    var pools = [];
    if (offerings.current && offerings.current.availablePackages) {
      pools.push(offerings.current.availablePackages);
    }
    if (offerings.all) {
      Object.keys(offerings.all).forEach(function (k) {
        var off = offerings.all[k];
        if (off && off.availablePackages) pools.push(off.availablePackages);
      });
    }
    for (var i = 0; i < pools.length; i++) {
      var hit = pools[i].find(function (p) {
        return p.product && p.product.identifier === productId;
      });
      if (hit) return hit;
    }
    return null;
  }, [offerings]);

  var getDisplayPrice = function () {
    // Prefer RevenueCat's priceString — it reflects the user's actual
    // Google Play / App Store account country & currency (the price they
    // will actually be charged), which is more reliable than device locale.
    if (isOneTime) {
      var oneTimeProductId = src === 'report' ? PRODUCT_IDS.full_report : PRODUCT_IDS.porondam_check;
      var oneTimePkg = getPackageByProductId(oneTimeProductId);
      if (oneTimePkg && oneTimePkg.product && oneTimePkg.product.priceString) {
        return oneTimePkg.product.priceString;
      }
      return priceLabel(src);
    }
    if (offerings && offerings.current) {
      var monthly = getMonthlyPackage();
      if (monthly && monthly.product) return monthly.product.priceString;
    }
    var sym = isInternational ? '$' : 'LKR ';
    return sym + priceAmount('subscription');
  };

  var getPriceSuffix = function () {
    if (src === 'report') return shared.perReport;
    if (isOneTime) return '  (' + shared.oneTime + ')';
    return shared.perMonth;
  };

  var handlePurchase = async function () {
    console.log('[Paywall] handlePurchase — src:', src, 'isOneTime:', isOneTime);
    setPurchasing(true);
    setError('');
    try {
      if (isOneTime) {
        var productId = src === 'report' ? PRODUCT_IDS.full_report : PRODUCT_IDS.porondam_check;
        console.log('[Paywall] one-time purchase productId:', productId);
        var otResult = await purchaseOneTimeProduct(productId);
        if (otResult && otResult.purchased) {
          if (onPurchased) onPurchased(otResult);
        } else {
          setError(shared.purchaseFail);
        }
      } else {
        var pkg = getMonthlyPackage();
        if (!pkg) {
          try {
            var direct = await purchaseOneTimeProduct(PRODUCT_IDS.monthly);
            if (direct && direct.isProActive) {
              if (onPurchased) onPurchased(direct);
              setPurchasing(false);
              return;
            }
          } catch (directErr) {
            if (directErr && directErr.message === 'Payment cancelled') {
              setPurchasing(false);
              return;
            }
          }
          setError(shared.purchaseFail);
          setPurchasing(false);
          return;
        }
        var result = await purchasePackage(pkg);
        if (result && result.isProActive) {
          if (onPurchased) onPurchased(result);
        } else {
          setError(shared.purchaseFail);
        }
      }
    } catch (e) {
      var msg = e && e.message ? e.message : String(e);
      console.error('[Paywall] purchase error:', msg);
      if (msg.indexOf('cancelled') === -1 && msg.indexOf('cancel') === -1) {
        setError(shared.purchaseFail);
      }
    } finally { setPurchasing(false); }
  };

  var handleRestore = async function () {
    setRestoring(true);
    setError('');
    try {
      var result = await restorePurchases();
      if (result && result.isProActive) {
        if (onPurchased) onPurchased(result);
      } else { setError(shared.noSub); }
    } catch (e) { setError(shared.restoreFail); }
    finally { setRestoring(false); }
  };

  // ── Don't render anything when not visible ──
  if (!visible) return null;

  console.log('[Paywall] RENDERING overlay — src:', src, 'loadingOfferings:', loadingOfferings);

  // ── FULL-SCREEN OVERLAY (no Modal!) ──
  // Renders as an absolute-positioned View on top of everything.
  // This is the bullet-proof approach for RN 0.76+ Android.
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={s.overlay}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Full-screen background gradient */}
      <LinearGradient
        colors={src === 'porondam' ? ['#1A0A1E', '#120818', '#08040F']
              : src === 'report'   ? ['#0A1A15', '#081210', '#04080A']
              :                      ['#0A0620', '#080418', '#04020F']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      />

      {/* Loading splash while offerings load (non-subscription can skip) */}
      {loadingOfferings && !isOneTime ? (
        <View style={s.loadingSplash}>
          <ActivityIndicator size="large" color={accent.primary} />
          <Text style={s.loadingText}>Loading...</Text>
          {onClose ? (
            <TouchableOpacity style={[s.loadingClose, { top: insets.top + 10 }]} onPress={onClose}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Subtle particles */}
      <FloatingParticles />

      {/* Decorative accent glow */}
      <View style={[s.accentGlow, { backgroundColor: accent.primary + '08' }]} />

      {/* Close button */}
      {onClose ? (
        <TouchableOpacity
          style={[s.closeBtn, { top: insets.top + 10 }]}
          onPress={onClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
        >
          <View style={s.closeBtnInner}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>
      ) : null}

      {/* Scrollable content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, {
          paddingTop: insets.top + (onClose ? 60 : 20),
          paddingBottom: Math.max(insets.bottom, 16) + 20,
        }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {/* Badge */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.badgeWrap}>
          <View style={[s.badge, { borderColor: accent.primary + '30' }]}>
            <Text style={[s.badgeText, { color: accent.primary }]}>{content.badge}</Text>
          </View>
        </Animated.View>

        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={s.logoWrap}>
          <View style={[s.logoCircle, { borderColor: accent.primary + '25' }]}>
            <Image
              source={APP_LOGO_IMAGE}
              style={s.logoImg}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={s.titleWrap}>
          <Text style={s.title}>{content.title}</Text>
          {content.hook ? (
            <Text style={[s.hook, { color: accent.primary }]}>{content.hook}</Text>
          ) : null}
          <Text style={s.subtitle}>{content.subtitle}</Text>
        </Animated.View>

        {/* Stats row — social proof / instant credibility */}
        {content.stats ? (
          <Animated.View entering={FadeInDown.delay(250).duration(500)} style={s.statsRow}>
            {content.stats.map(function (stat, i) {
              return (
                <React.Fragment key={i}>
                  {i > 0 ? <View style={s.statsDivider} /> : null}
                  <View style={s.statItem}>
                    <Text style={[s.statValue, { color: accent.primary }]}>{stat.value}</Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                  </View>
                </React.Fragment>
              );
            })}
          </Animated.View>
        ) : null}

        {/* "What you get" header */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={s.youGetWrap}>
          <View style={[s.youGetLine, { backgroundColor: accent.primary + '40' }]} />
          <Text style={[s.youGetText, { color: accent.primary }]}>{shared.youGet}</Text>
          <View style={[s.youGetLine, { backgroundColor: accent.primary + '40' }]} />
        </Animated.View>

        {/* Features (with descriptions) */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.featuresWrap}>
          {content.features.map(function (feat, i) {
            return (
              <View key={i} style={s.featureRow}>
                <View style={[s.featureIconWrap, { backgroundColor: accent.primary + '15', borderColor: accent.primary + '25' }]}>
                  <Ionicons name={feat.icon} size={18} color={accent.primary} />
                </View>
                <View style={s.featureTextWrap}>
                  <Text style={s.featureText}>{feat.text}</Text>
                  {feat.desc ? (
                    <Text style={s.featureDesc}>{feat.desc}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Testimonial */}
        {content.testimonial ? (
          <Animated.View
            entering={FadeInDown.delay(380).duration(500)}
            style={[s.testimonialCard, { borderColor: accent.primary + '25' }]}
          >
            <Text style={[s.testimonialQuote, { color: accent.primary }]}>“</Text>
            <Text style={s.testimonialText}>{content.testimonial}</Text>
            <Text style={s.testimonialAuthor}>{content.testimonialAuthor}</Text>
          </Animated.View>
        ) : null}

        {/* Value anchor */}
        {content.valueLine ? (
          <Animated.View entering={FadeInDown.delay(420).duration(400)} style={s.valueAnchorWrap}>
            <Text style={s.valueAnchorOld}>{content.valueLine}</Text>
            <View style={s.valueAnchorStrike} />
          </Animated.View>
        ) : null}

        {/* Price */}
        <Animated.View entering={FadeInDown.delay(440).duration(500)} style={s.priceWrap}>
          {loadingOfferings && !isOneTime ? (
            <ActivityIndicator size="small" color={accent.primary} />
          ) : (
            <>
              <Text style={s.youPayLabel}>{shared.youPay}</Text>
              <View style={s.priceRow}>
                <Text style={[s.priceAmount, { color: accent.primary }]}>{getDisplayPrice()}</Text>
                <Text style={s.priceSuffix}>{getPriceSuffix()}</Text>
              </View>
              {content.urgency ? (
                <Text style={[s.urgencyText, { color: accent.primary + 'CC' }]}>{content.urgency}</Text>
              ) : null}
            </>
          )}
        </Animated.View>

        {/* Error */}
        {error ? (
          <View style={s.errorWrap}>
            <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* CTA Button */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={s.ctaWrap}>
          {/* Glow behind button */}
          <Animated.View style={[s.ctaGlow, btnGlowStyle, { backgroundColor: accent.primary }]} />

          <TouchableOpacity
            onPress={handlePurchase}
            disabled={purchasing || (!isOneTime && loadingOfferings)}
            activeOpacity={0.8}
            style={s.ctaTouchable}
          >
            <LinearGradient
              colors={purchasing ? ['#555', '#444'] : accent.gradient}
              style={s.ctaBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={s.ctaInner}>
                  <Ionicons
                    name={src === 'porondam' ? 'heart' : src === 'report' ? 'document-text' : 'lock-open'}
                    size={18} color="#FFF"
                  />
                  <Text style={s.ctaText}>{content.cta}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Sub-CTA */}
        <Text style={s.ctaSub}>{content.ctaSub}</Text>

        {/* Guarantee badges row */}
        <View style={s.guaranteeRow}>
          <View style={s.guaranteeBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#34D399" />
            <Text style={s.guaranteeText}>{shared.guarantee}</Text>
          </View>
          <View style={s.guaranteeBadge}>
            <Ionicons name="flash" size={11} color={accent.primary} />
            <Text style={s.guaranteeText}>{shared.instantAccess}</Text>
          </View>
        </View>

        {/* Secured badge */}
        <View style={s.securedRow}>
          <Ionicons name="shield-checkmark" size={12} color="#34D399" />
          <Text style={s.securedText}>
            {Platform.OS === 'ios' ? shared.secured.replace('Google Play', 'App Store') : shared.secured}
          </Text>
        </View>

        {/* Footer links */}
        <View style={s.footerRow}>
          {!isOneTime ? (
            <>
              <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                <Text style={[s.footerLink, { color: accent.primary + '90' }]}>
                  {restoring ? '...' : shared.restore}
                </Text>
              </TouchableOpacity>
              <Text style={s.footerDot}>·</Text>
            </>
          ) : null}
          <TouchableOpacity onPress={function () { Linking.openURL('https://grahachara.com/legal/terms.html'); }}>
            <Text style={[s.footerLink, { color: accent.primary + '90' }]}>{shared.terms}</Text>
          </TouchableOpacity>
          <Text style={s.footerDot}>·</Text>
          <TouchableOpacity onPress={function () { Linking.openURL('https://grahachara.com/legal/privacy.html'); }}>
            <Text style={[s.footerLink, { color: accent.primary + '90' }]}>{shared.privacy}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

var s = StyleSheet.create({
  // Full-screen overlay — NO Modal. Sits above everything via zIndex + elevation.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 100,
  },

  accentGlow: {
    position: 'absolute',
    top: -SH * 0.15,
    left: -SW * 0.3,
    width: SW * 1.6,
    height: SH * 0.5,
    borderRadius: SH * 0.25,
    transform: [{ rotate: '-12deg' }],
  },

  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  closeBtnInner: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },

  badgeWrap: { marginBottom: 16 },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },

  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logoCircle: {
    width: IS_SMALL ? 56 : 68,
    height: IS_SMALL ? 56 : 68,
    borderRadius: IS_SMALL ? 28 : 34,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: IS_SMALL ? 40 : 48,
    height: IS_SMALL ? 40 : 48,
  },

  titleWrap: { alignItems: 'center', marginBottom: 16, width: '100%' },
  title: {
    fontSize: IS_SMALL ? 26 : 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: IS_SMALL ? 32 : 40,
    marginBottom: 10,
  },
  hook: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 8,
    letterSpacing: 0.1,
  },
  subtitle: {
    color: 'rgba(255,220,150,0.65)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },

  // Stats row — quick credibility band
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  statsDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // "What you get" header
  youGetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    width: '100%',
  },
  youGetLine: {
    flex: 1,
    height: 1,
  },
  youGetText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },

  featuresWrap: {
    width: '100%',
    marginBottom: 18,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    marginTop: 1,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  featureDesc: {
    color: 'rgba(255,245,220,0.55)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginTop: 2,
  },

  // Testimonial
  testimonialCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 14,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  testimonialQuote: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 32,
    marginBottom: -4,
  },
  testimonialText: {
    color: 'rgba(255,245,220,0.9)',
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 6,
  },
  testimonialAuthor: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
  },

  // Value anchor (struck-through "worth X")
  valueAnchorWrap: {
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  valueAnchorOld: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  valueAnchorStrike: {
    position: 'absolute',
    left: 0, right: 0,
    top: '52%',
    height: 1,
    backgroundColor: 'rgba(255,100,100,0.55)',
    transform: [{ rotate: '-3deg' }],
  },

  priceWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  youPayLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceAmount: {
    fontSize: IS_SMALL ? 36 : 44,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  priceSuffix: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,220,160,0.5)',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.1,
    textAlign: 'center',
  },

  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    width: '100%',
  },
  errorText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600', flex: 1 },

  ctaWrap: {
    width: '100%',
    marginBottom: 12,
    position: 'relative',
  },
  ctaGlow: {
    position: 'absolute',
    top: 4, left: 16, right: 16, bottom: 4,
    borderRadius: 20,
  },
  ctaTouchable: {
    zIndex: 2,
  },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: IS_SMALL ? 14 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  ctaSub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 16,
    paddingHorizontal: 16,
  },

  // Guarantee row (money-back + instant access)
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  guaranteeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  guaranteeText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  securedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },  securedText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    fontWeight: '500',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  footerDot: { color: 'rgba(255,255,255,0.15)', fontSize: 10 },
  footerLink: { fontSize: 11, fontWeight: '600', paddingVertical: 8, paddingHorizontal: 4 },

  // Loading splash (shown while offerings load for subscription)
  loadingSplash: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
  },
});
