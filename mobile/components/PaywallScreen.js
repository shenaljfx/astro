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
 * Context-aware: different content for onboarding, report, porondam, chat.
 * - onboarding = monthly subscription
 * - report     = one-time per report
 * - porondam   = one-time per check
 * - chat       = monthly subscription (held-question moment)
 * Unknown sources fall back to the onboarding subscription pitch.
 *
 * Props:
 *   visible, onClose, onPurchased, source ('onboarding' | 'report' | 'porondam' | 'chat' | …)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { logPaywallEvent } from '../services/api';
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
      hook: 'See what\'s coming in your life — money, love, career, health. All based on your birth time.',
      title: 'Know Your\nFuture Today',
      subtitle: 'Find out when good times are coming, when to be careful, and what to do next. Your personal guide, always with you.',
      stats: [
        { value: '12K+', label: 'Sri Lankans' },
        { value: '4.8★', label: '2,341 reviews' },
        { value: '9 ග්‍රහ', label: 'analysed' },
      ],
      features: [
        { icon: 'telescope-outline', text: 'Your Complete Life Map',
          desc: 'See your personality, strengths, weaknesses, and what life has in store — all from your birth details.' },
        { icon: 'alert-circle-outline', text: 'Good & Bad Period Alerts',
          desc: 'Know months ahead when tough times are coming so you can prepare and avoid money problems.' },
        { icon: 'chatbubble-ellipses-outline', text: 'Ask Any Question About Your Life',
          desc: '"Will I marry him?" "Should I take this job?" "When will money come?" Ask and get straight answers.' },
        { icon: 'diamond-outline', text: 'Money, Love & Career Timing',
          desc: 'Know exactly when your lucky periods start — the best times to invest, marry, or change jobs.' },
        { icon: 'planet-outline', text: 'Personalized Weekly Predictions',
          desc: 'Not generic newspaper horoscopes — predictions made specifically for YOU based on your exact birth time.' },
        { icon: 'color-wand-outline', text: 'Lucky Gems & Protective Actions',
          desc: 'Find out which gemstones bring you luck, what prayers help, and simple actions to improve your fortune.' },
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
        { icon: 'chatbubble-ellipses-outline', text: 'ඔයාගේම පෞද්ගලික ජ්‍යෝතිෂී — 24/7',
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
      hook: 'Your 47+ page personal life report is ready — written just for you based on your birth details.',
      title: 'Your Complete\nLife Story',
      subtitle: 'Find out when you\'ll earn the most, when love will come, and what hidden talents can change your life.',
      stats: [
        { value: '47+', label: 'pages' },
        { value: '12', label: 'life areas' },
        { value: '120', label: 'years mapped' },
      ],
      features: [
        { icon: 'document-text-outline', text: 'Every Part of Your Life Covered',
          desc: 'Money, love, family, health, career, education, fame — everything about your life explained clearly.' },
        { icon: 'heart-outline', text: 'When Will You Find Love?',
          desc: 'When you\'ll meet your partner, the best age to marry, and what kind of person suits you best.' },
        { icon: 'trending-up-outline', text: 'Money & Career Predictions',
          desc: 'Should you start a business or do a job? When will you earn the most? Will you go abroad?' },
        { icon: 'pulse-outline', text: 'Health Warnings & Tips',
          desc: 'Know which years you need to be extra careful about health, and simple steps to stay safe.' },
        { icon: 'color-wand-outline', text: 'Lucky Gems & Protection Tips',
          desc: 'Your luckiest gemstone, helpful prayers, and easy actions to keep bad times from getting worse.' },
        { icon: 'download-outline', text: 'Beautiful PDF — Yours Forever',
          desc: 'Download instantly, keep on your phone, read anytime. Share with family too.' },
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
      badge: '♥ MARRIAGE MATCH CHECK',
      hook: 'Don\'t leave your marriage to chance. Find out if you two are truly right for each other.',
      title: 'Is This the Right\nPerson For You?',
      subtitle: 'See if you\'re a good match, what problems might come, and if this relationship will last.',
      stats: [
        { value: '7', label: 'factors' },
        { value: '20', label: 'max score' },
        { value: '30s', label: 'instant' },
      ],
      features: [
        { icon: 'sparkles-outline', text: 'Full Compatibility Check',
          desc: 'All 7 key relationship factors checked — personality, emotions, lifestyle, daily habits, and more.' },
        { icon: 'stats-chart-outline', text: 'Your Honest Match Score',
          desc: 'A clear score out of 20 showing how well you two fit together. No sugar-coating.' },
        { icon: 'flame-outline', text: 'Problem Areas Spotted Early',
          desc: 'See what arguments are likely, where you might clash, and simple ways to prevent issues.' },
        { icon: 'calendar-outline', text: 'Best Wedding Dates',
          desc: 'Get the most lucky time periods to get married — dates picked specifically for your match.' },
        { icon: 'magnet-outline', text: 'Attraction & Chemistry Score',
          desc: 'Find out how strong the natural pull is between you two — physical and emotional.' },
        { icon: 'sunny-outline', text: 'Your Strengths Together',
          desc: 'See what makes your bond special — money luck, family health, emotional connection, and more.' },
        { icon: 'grid-outline', text: 'Both Birth Charts Included',
          desc: 'Full birth charts for both people, beautifully drawn. Great for showing to elders.' },
        { icon: 'document-text-outline', text: 'Detailed Written Report',
          desc: 'A long, personal explanation of your match covering every angle — like sitting with an astrologer.' },
        { icon: 'share-outline', text: 'PDF Report to Share',
          desc: 'A clean report you can save, print, or share with family to settle any doubts.' },
      ],
      valueLine: 'Professional compatibility reading: $50+',
      testimonial: '"We were worried about one problem area, but this explained it clearly. Got married last month!"',
      testimonialAuthor: '— Kavindu, Galle',
      urgency: '♥ Before you commit your whole life — make sure you\'re right for each other.',
      cta: 'Check Our Match Now',
      ctaSub: 'One-time payment · Instant calculation · 100% private',
    },
    si: {
      badge: '♥ පොරොන්දම් පරීක්ෂාව · සම්ප්‍රදායික ක්‍රමයට',
      hook: 'විවාහයක් කියන්නේ ජීවිතයේ ලොකුම තීරණයයි. තීරණයක් ගන්න කලින් තාරකා කියන ඇත්ත දැනගන්න.',
      title: 'ඔවුන් ඔයාටම\nහිමි කෙනාද?',
      subtitle: 'වසර 2,000ක් පැරණි සාම්ප්‍රදායික පරීක්ෂාව යොදාගෙන කොයිතරම් දුරට ඔයා දෙදෙනා ගැලපෙනවද කියලා තත්පර 30කින් හරියටම දකින්න.',
      stats: [
        { value: '7', label: 'පොරොන්දම්' },
        { value: '20', label: 'උපරිමය' },
        { value: '30s', label: 'ක්ෂණික' },
      ],
      features: [
        { icon: 'sparkles-outline', text: 'පොරොන්දම් 7 ම පරීක්ෂාව',
          desc: 'දින, ගණ, යෝනි, රාශි, වශ්‍ය, නාඩි, මහේන්ද්‍ර යන අංග වැඩිහිටියන් බලන විදිහටම.' },
        { icon: 'stats-chart-outline', text: 'ලකුණු 20න් සැබැ ගැලපීම',
          desc: 'කිසිම දෙයක් වසන් නොකර, ඔයා දෙදෙනාගේ අනාගතය කොතරම් සාර්තක ද කියලා.' },
        { icon: 'flame-outline', text: 'ගැටලු කලින්ම දකින්න',
          desc: 'ඇතිවිය හැකි රණ්ඩු සහ පවුල් ආරවුල් මගහරවා ගන්නා අයුරු.' },
        { icon: 'calendar-outline', text: 'විවාහයට හොඳම කාලය',
          desc: 'ඔයා දෙදෙනාටම විශේෂයෙන් තෝරා ගන්නා ලද වාසනාවන්තම දිනයන්.' },
        { icon: 'magnet-outline', text: 'ආකර්ෂණය සහ රසවිද්‍යාව',
          desc: 'ඔයා දෙදෙනා අතර ස්වාභාවික ආකර්ෂණය කොතරම් ප්‍රබලද කියලා දැනගන්න.' },
        { icon: 'sunny-outline', text: 'ඔබගේ ශක්ති කොටස්',
          desc: 'මුදල් වාසනාව, පවුල් සුවය, හැගීම් ගැලපීම — ඔයාගේ සබඳතාවේ හොඳම දෙයන්.' },
        { icon: 'grid-outline', text: 'දෙදෙනාගේම කේන්දරය',
          desc: 'ඔයා දෙදෙනාගේ සම්පූර්ණ ජාතක චක්‍ර — වැඩිහිටියන්ට පේන්වීමට හොඳයි.' },
        { icon: 'document-text-outline', text: 'සම්පූර්ණ ලියුම් වාර්තාව',
          desc: 'ඔයාගේ ගැලපීම ගැන සම්පූර්ණ විග්‍රහයක් — ජ්‍යෝතිෂී කෙනෙකු ලඟ ඉන්නා වගේ.' },
        { icon: 'share-outline', text: 'පවුලේ අයට පේන්වීමට PDF',
          desc: 'දෙමාපියන්ගේ සැක දුරු කිරීමට පේන්විය හැකි ලස්සන PDF වාර්තාවක්.' },
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

// chat = subscription sell at the held-question moment (user typed a question,
// the answer is waiting behind the wall). Same monthly product as onboarding.
CONTENT.chat = {
  en: {
    badge: '✦ YOUR ANSWER IS WAITING',
    hook: 'The astrologer has read your question. Unlock to receive your answer — and ask anything, any day.',
    title: 'Your Answer\nIs Ready',
    subtitle: 'Personal answers from your own birth chart — love, money, career, timing. Not generic horoscopes.',
    stats: [
      { value: '30/day', label: 'questions' },
      { value: '4.8★', label: '2,341 reviews' },
      { value: '24/7', label: 'always there' },
    ],
    features: [
      { icon: 'chatbubble-ellipses-outline', text: 'Get This Answer Instantly',
        desc: 'The question you just asked is answered the moment you unlock — nothing is lost.' },
      { icon: 'person-outline', text: 'Answers From YOUR Chart',
        desc: '"Will I get the job?" "Is this the right person?" — answered from your exact birth time, not sun-sign guesses.' },
      { icon: 'infinite-outline', text: 'Ask Every Day, About Anything',
        desc: 'Love, money, family, health, travel — a private astrologer in your pocket, every single day.' },
      { icon: 'telescope-outline', text: 'Plus Everything in Pro',
        desc: 'Full kendara analysis, daily guidance, weekly palapala, and your dated future windows — all included.' },
    ],
    valueLine: 'One question with a master astrologer: LKR 1,000+',
    testimonial: '"I asked about my job change and it told me to wait two months. It was right."',
    testimonialAuthor: '— Dilshan, Negombo',
    urgency: '⏱ Your question is held — unlock now to get the answer',
    cta: 'Unlock My Answer',
    ctaSub: 'Cancel anytime · No hidden charges · Protected by Google Play',
  },
  si: {
    badge: '✦ ඔබේ පිළිතුර සූදානම්',
    hook: 'නැකැත්කරු ඔබේ ප්‍රශ්නය කියවා අවසන්. පිළිතුර ලබා ගන්න — ඉන්පසු ඕනෑම දිනක, ඕනෑම දෙයක් අහන්න.',
    title: 'ඔබේ පිළිතුර\nලැබීමට සූදානම්',
    subtitle: 'පත්තරවල පොදු පලාපල නොවේ — ඔබේම උපන් වේලාවෙන් ගණනය කළ, ඔබටම අදාළ පිළිතුරු.',
    stats: [
      { value: '30/දින', label: 'ප්‍රශ්න' },
      { value: '4.8★', label: 'සමාලෝචන 2,341' },
      { value: '24/7', label: 'සැමවිටම' },
    ],
    features: [
      { icon: 'chatbubble-ellipses-outline', text: 'මේ පිළිතුර ක්ෂණිකවම',
        desc: 'ඔබ දැන් ඇසූ ප්‍රශ්නයට පිළිතුර විවෘත කළ සැණින් ලැබේ — කිසිවක් නැති වන්නේ නැත.' },
      { icon: 'person-outline', text: 'ඔබේම කේන්දරයෙන් පිළිතුරු',
        desc: '"මට මේ රස්සාව ලැබෙයිද?" "මේ කෙනා මට ගැලපෙයිද?" — ඔබේ නිවැරදි උපන් වේලාව අනුවම.' },
      { icon: 'infinite-outline', text: 'හැමදාම, ඕනෑම දෙයක් අහන්න',
        desc: 'ආදරය, මුදල්, පවුල, සෞඛ්‍යය, ගමන් — ඔබේ සාක්කුවේම පෞද්ගලික ජ්‍යෝතිෂවේදියෙක්.' },
      { icon: 'telescope-outline', text: 'Pro හි සියල්ලද සමඟ',
        desc: 'සම්පූර්ණ කේන්දර විග්‍රහය, දෛනික මඟපෙන්වීම, සතිපතා පලාපල සහ ඔබේ අනාගත කවුළු — සියල්ල ඇතුළත්.' },
    ],
    valueLine: 'ජ්‍යෝතිෂවේදියෙකුගෙන් එක් ප්‍රශ්නයක්: රු. 1,000+',
    testimonial: '"රස්සාව මාරු කිරීම ගැන ඇහුවා — මාස දෙකක් ඉන්න කිව්වා. ඒක හරියටම හරි ගියා."',
    testimonialAuthor: '— දිල්ශාන්, මීගමුව',
    urgency: '⏱ ඔබේ ප්‍රශ්නය රඳවා ඇත — විවෘත කළ සැණින් පිළිතුර ලැබේ',
    cta: 'මගේ පිළිතුර ලබා ගන්න',
    ctaSub: 'ඕනෑම වෙලාවක නවතන්න · Google Play හරහා ආරක්ෂිතයි',
  },
};

// convergence = subscription sell from the Home 12-month timeline tease.
CONTENT.convergence = {
  en: {
    badge: '✦ YOUR NEXT 12 MONTHS',
    hook: 'You can see WHEN your windows are. Unlock WHY they happen — and what to do in each.',
    title: 'Your Dated\nWindows, Unlocked',
    subtitle: 'The exact months your luck turns — money, love, career, health — and the reason behind each, from your dasha and the planets.',
    stats: [
      { value: '12', label: 'months mapped' },
      { value: '6', label: 'life areas' },
      { value: '4.8★', label: '2,341 reviews' },
    ],
    features: [
      { icon: 'calendar-outline', text: 'Every Opportunity & Caution Window',
        desc: 'The dated months ahead when each life area rises or needs care — no more guessing when to act.' },
      { icon: 'help-circle-outline', text: 'The Reason Behind Each Window',
        desc: 'Which dasha period and which planet transit is driving it — the "why", not just the "when".' },
      { icon: 'compass-outline', text: 'What To Do In Each Period',
        desc: 'When to push, when to wait, when to protect — practical guidance tuned to your chart.' },
      { icon: 'telescope-outline', text: 'Plus Everything in Pro',
        desc: 'Full kendara analysis, daily guidance, ask-the-astrologer chat, and your weekly predictions.' },
    ],
    valueLine: 'A year-ahead reading from an astrologer: LKR 3,000+',
    testimonial: '"It marked October as my money window. I signed the deal that month. I don\'t make big moves without checking this now."',
    testimonialAuthor: '— Ruwan, Kurunegala',
    urgency: '✦ Know what\'s coming before it arrives',
    cta: 'Unlock My Timeline',
    ctaSub: 'Cancel anytime · No hidden charges · Protected by Google Play',
  },
  si: {
    badge: '✦ ඔබේ ඉදිරි මාස 12',
    hook: 'කවුළු කවදාද කියා ඔබට පෙනේ. ඒවා ඇයි සිදුවන්නේ — සහ එක් එක් කාලයේ කළ යුත්ත — විවෘත කරන්න.',
    title: 'ඔබේ දින සහිත\nකවුළු, විවෘතව',
    subtitle: 'ධනය, ආදරය, රැකියාව, සෞඛ්‍යය — ඔබේ වාසනාව හැරෙන නිශ්චිත මාස සහ ඒ පිටිපස හේතුව, ඔබේ දශාව හා ග්‍රහයන් අනුව.',
    stats: [
      { value: '12', label: 'මාස' },
      { value: '6', label: 'ජීවිත අංශ' },
      { value: '4.8★', label: 'සමාලෝචන 2,341' },
    ],
    features: [
      { icon: 'calendar-outline', text: 'හැම සුබ සහ අවවාද කාලයක්ම',
        desc: 'ඉදිරියේදී එක් එක් ජීවිත අංශය නැඟෙන හෝ ප්‍රවේසම් විය යුතු දින සහිත මාස — කවදා ක්‍රියා කරන්නද කියා තව අනුමාන නැහැ.' },
      { icon: 'help-circle-outline', text: 'එක් එක් කවුළුව පිටිපස හේතුව',
        desc: 'කුමන දශා කාලය සහ කුමන ග්‍රහ ගමනක් එය ගෙන එනවාද — "කවදා" පමණක් නොව "ඇයි" කියාත්.' },
      { icon: 'compass-outline', text: 'එක් එක් කාලයේ කළ යුත්ත',
        desc: 'කවදා ඉදිරියට යනවද, කවදා රැඳී ඉන්නවද, කවදා රැක ගන්නවද — ඔබේ කේන්දරයට ගැලපෙන මඟපෙන්වීම.' },
      { icon: 'telescope-outline', text: 'Pro හි සියල්ලද සමඟ',
        desc: 'සම්පූර්ණ කේන්දර විග්‍රහය, දෛනික මඟපෙන්වීම, නැකැත්කරුගෙන් අසන්න සහ සතිපතා පලාපල.' },
    ],
    valueLine: 'ජ්‍යෝතිෂියෙකුගෙන් වසරක පලාපල: රු. 3,000+',
    testimonial: '"ඔක්තෝබර් මගේ මුදල් කාලය කියලා පෙන්නුවා. ඒ මාසෙදිම ගනුදෙනුව අත්සන් කළා. දැන් මේක බලන්නෙ නැතුව ලොකු තීරණ ගන්නෙ නැහැ."',
    testimonialAuthor: '— රුවන්, කුරුණෑගල',
    urgency: '✦ එන දේ එන්න කලින් දැනගන්න',
    cta: 'මගේ කාලරේඛාව විවෘත කරන්න',
    ctaSub: 'ඕනෑම වෙලාවක නවතන්න · Google Play හරහා ආරක්ෂිතයි',
  },
};

// nakath = subscription sell from the Subha Nakath planner.
CONTENT.nakath = {
  en: {
    badge: '✦ THE RIGHT TIME, EVERY TIME',
    hook: 'You can see the best DAY. Unlock the exact TIME — and never start anything at the wrong moment again.',
    title: 'Auspicious Times,\nTuned to You',
    subtitle: 'Exams, interviews, weddings, new jobs, moving house — the exact auspicious window, chosen for your chart.',
    stats: [
      { value: '10', label: 'life events' },
      { value: '365', label: 'days ahead' },
      { value: '4.8★', label: '2,341 reviews' },
    ],
    features: [
      { icon: 'time-outline', text: 'The Exact Auspicious Time',
        desc: 'Not just the best day — the precise hour to act, so nothing important starts at a bad moment.' },
      { icon: 'person-outline', text: 'Tuned to Your Chart',
        desc: 'Timing scored against your Tara Balam and Chandrabala — personal, not a generic almanac.' },
      { icon: 'compass-outline', text: 'Safe & Avoid Directions',
        desc: 'Which way to face or travel for exams, interviews and journeys — and which to avoid.' },
      { icon: 'hourglass-outline', text: 'When Will It Happen?',
        desc: 'Your life-event timeline — career, wealth, marriage, children, property — from your chart.' },
    ],
    valueLine: 'An astrologer picking your nakath: LKR 1,500+',
    testimonial: '"I picked my interview time and direction with this. Got the job. Now I check it before anything big."',
    testimonialAuthor: '— Nimali, Gampaha',
    urgency: '⏱ Never act at the wrong moment again',
    cta: 'Unlock Exact Times',
    ctaSub: 'Cancel anytime · No hidden charges · Protected by Google Play',
  },
  si: {
    badge: '✦ හැම විටම නියම වේලාව',
    hook: 'හොඳම දවස ඔබට පෙනේ. හරියටම වේලාව විවෘත කරන්න — වැදගත් දෙයක් වැරදි වේලාවක ආරම්භ කරන්න එපා.',
    title: 'ඔබට ගැලපෙන\nසුබ නැකැත්',
    subtitle: 'විභාග, සම්මුඛ පරීක්ෂණ, විවාහ, අලුත් රැකියා, ගෙදර මාරුව — ඔබේ කේන්දරයට තෝරාගත් හරියටම සුබ මොහොත.',
    stats: [
      { value: '10', label: 'ජීවිත සිදුවීම්' },
      { value: '365', label: 'දින' },
      { value: '4.8★', label: 'සමාලෝචන 2,341' },
    ],
    features: [
      { icon: 'time-outline', text: 'හරියටම සුබ මොහොත',
        desc: 'හොඳම දවස පමණක් නොව — ක්‍රියා කිරීමට හරියටම වේලාව, වැදගත් දේ වැරදි මොහොතක ආරම්භ නොවන පරිදි.' },
      { icon: 'person-outline', text: 'ඔබේ කේන්දරයට අනුව',
        desc: 'ඔබේ තාරා බලය සහ චන්ද්‍ර බලය අනුව ගණනය කළ — පොදු ලිත් නොව, පෞද්ගලික.' },
      { icon: 'compass-outline', text: 'සුබ සහ වළකින දිශා',
        desc: 'විභාග, සම්මුඛ පරීක්ෂණ, ගමන් සඳහා යා යුතු දිශාව සහ වළකින දිශාව.' },
      { icon: 'hourglass-outline', text: 'කවදා සිදුවේද?',
        desc: 'ඔබේ ජීවිත කාල සටහන — රැකියාව, ධනය, විවාහය, දරුවන්, දේපළ — ඔබේ කේන්දරයෙන්.' },
    ],
    valueLine: 'ජ්‍යෝතිෂියෙකු ඔබේ නැකැත බැලීම: රු. 1,500+',
    testimonial: '"සම්මුඛ පරීක්ෂණයේ වේලාවත් දිශාවත් මේකෙන් තෝරගත්තා. රස්සාව ලැබුණා. දැන් ලොකු දේකට කලින් මේක බලනවා."',
    testimonialAuthor: '— නිමාලි, ගම්පහ',
    urgency: '⏱ තවත් වැරදි මොහොතක ක්‍රියා කරන්න එපා',
    cta: 'හරියටම වේලාව විවෘත කරන්න',
    ctaSub: 'ඕනෑම වෙලාවක නවතන්න · Google Play හරහා ආරක්ෂිතයි',
  },
};

// baby = ONE-TIME Baby Kendara Pack (a gift SKU, purchased on its own —
// a subscription does not include it).
CONTENT.baby = {
  en: {
    badge: '👶 THE NEWBORN KEEPSAKE',
    hook: "Your baby's first chart — a complete life-story reading, the auspicious name letters, doshas checked, and naming-ceremony dates.",
    title: "Your Baby's\nFirst Kendara",
    subtitle: 'A real astrologer charges LKR 3,000+ for a newborn reading. Yours instantly, to keep and share with family.',
    stats: [
      { value: '5', label: 'life-story chapters' },
      { value: '2', label: 'doshas + remedies' },
      { value: '∞', label: 'keep forever' },
    ],
    features: [
      { icon: 'sparkles-outline', text: 'A Complete Life-Story Reading',
        desc: 'Character, talents & vocation, education, family bonds, and fortune — read from the chart for your child.' },
      { icon: 'people-outline', text: 'Reads You, the Parents',
        desc: "The family chapter surfaces the parents' own professions and the sibling picture — verifiable today." },
      { icon: 'grid-outline', text: 'The Full Birth Chart',
        desc: 'Traditional Sri Lankan kendara with all 9 planet positions, naming letters + Sinhala name ideas.' },
      { icon: 'shield-checkmark-outline', text: 'Dosha Checks + Vitality',
        desc: 'Ganda Moola AND Gandanta with remedies, plus a gentle constitution note.' },
      { icon: 'calendar-outline', text: 'Ceremony Dates, Chart-Tuned',
        desc: 'Naming (nam thebeema) and first-feeding dates scored for this baby specifically.' },
    ],
    valueLine: 'A printed newborn astrologer reading: LKR 3,000+',
    testimonial: '"We named our daughter using this and shared the pack with both families. Everyone loved it."',
    testimonialAuthor: '— Sanduni & Kasun, Matara',
    urgency: '👶 Their first blessing — yours to keep forever',
    cta: 'Get the Baby Pack',
    ctaSub: 'One-time payment · Yours instantly · Keep forever',
  },
  si: {
    badge: '👶 බිලිඳු කේන්දර තෑග්ග',
    hook: 'ඔබේ බිලිඳාගේ පළමු කේන්දරය — සම්පූර්ණ ජීවිත කතා විග්‍රහය, සුබ නාම අකුරු, දෝෂ පරීක්ෂාව සහ නම් තැබීමේ නැකැත්.',
    title: 'ඔබේ බිලිඳාගේ\nපළමු කේන්දරය',
    subtitle: 'ප්‍රවීණ ජ්‍යෝතිෂියෙක් බිලිඳු කේන්දරයකට රු. 3,000+ ගනී. ඔබට ක්ෂණිකව — තබාගන්න, පවුලට බෙදාගන්න.',
    stats: [
      { value: '5', label: 'ජීවිත කතා පරිච්ඡේද' },
      { value: '2', label: 'දෝෂ + පිළියම්' },
      { value: '∞', label: 'සදහටම' },
    ],
    features: [
      { icon: 'sparkles-outline', text: 'සම්පූර්ණ ජීවිත කතා විග්‍රහය',
        desc: 'චරිතය, දක්ෂතා හා වෘත්තිය, අධ්‍යාපනය, පවුල් බැඳීම් සහ වාසනාව — නැකත් පත්‍රයෙන් ඔබේ දරුවාට.' },
      { icon: 'people-outline', text: 'දෙමාපියන් ගැනද කියයි',
        desc: 'පවුල් පරිච්ඡේදය දෙමාපියන්ගේ වෘත්තීන් සහ සහෝදර තොරතුරු පෙන්වයි — අදම තහවුරු කළ හැකියි.' },
      { icon: 'grid-outline', text: 'සම්පූර්ණ කේන්දර සටහන',
        desc: 'සාම්ප්‍රදායික ලංකා කේන්දරය, ග්‍රහ 9ම, නාම අකුරු + සිංහල නම් අදහස්.' },
      { icon: 'shield-checkmark-outline', text: 'දෝෂ පරීක්ෂා + ශරීර ස්වභාවය',
        desc: 'ගණ්ඩ මූල සහ ගණ්ඩාන්ත පිළියම් සමඟ, මෘදු ශරීර ස්වභාව සටහනක්ද.' },
      { icon: 'calendar-outline', text: 'කේන්දරයට ගැළපූ නැකැත් දින',
        desc: 'නම් තැබීම සහ ඉඳුල් කට ගෑම — මේ බිලිඳාටම ලකුණු කළ සුබ දින.' },
    ],
    valueLine: 'මුද්‍රිත බිලිඳු කේන්දර කියවීමක්: රු. 3,000+',
    testimonial: '"අපේ දුවට නම තිබ්බේ මේකෙන්. පැකේජය පවුල් දෙකටම බෙදාගත්තා. හැමෝම කැමතියි."',
    testimonialAuthor: '— සඳුනි සහ කසුන්, මාතර',
    urgency: '👶 ඔවුන්ගේ පළමු ආශිර්වාදය — සදහටම තබාගන්න',
    cta: 'බිලිඳු පැකේජය ගන්න',
    ctaSub: 'එක් වරක් · ක්ෂණිකව ලැබේ · සදහටම ඔබ සතුයි',
  },
};

// winback = a lapsed subscriber returning. Warm "welcome back", loss-framed.
CONTENT.winback = {
  en: {
    badge: '✦ WELCOME BACK',
    hook: 'Your cosmic dashboard is paused — not gone. Everything you built is waiting for you.',
    title: 'Pick Up Where\nYou Left Off',
    subtitle: 'Your reports, your 12-month calendar, and your chat guide are all still here — one tap to reopen them.',
    stats: [
      { value: '✓', label: 'reports saved' },
      { value: '12mo', label: 'calendar ready' },
      { value: '4.8★', label: '2,341 reviews' },
    ],
    features: [
      { icon: 'lock-open-outline', text: 'Reopen Everything Instantly',
        desc: 'Your saved reports and history come straight back — nothing was lost.' },
      { icon: 'calendar-outline', text: 'Your Windows Kept Moving',
        desc: 'The stars did not wait. See the opportunity and caution windows you missed.' },
      { icon: 'chatbubbles-outline', text: 'Your Guide Is Waiting',
        desc: 'Ask anything again — your personal astrologer picks up right where you left off.' },
    ],
    valueLine: 'Less than a cup of tea a week',
    testimonial: '"I came back after two months and everything was exactly where I left it. Worth it."',
    testimonialAuthor: '— Dilan, Kandy',
    urgency: '⏳ Your windows are moving — don\'t miss the next one',
    cta: 'Reactivate My Access',
    ctaSub: 'Cancel anytime · No hidden charges · Protected by Google Play',
  },
  si: {
    badge: '✦ ආයුබෝවන්, ආපහු',
    hook: 'ඔබේ ග්‍රහ පුවරුව නතර වෙලා විතරයි — නැති වෙලා නෑ. ඔබ හදාගත්ත හැම දේම බලාගෙන ඉන්නවා.',
    title: 'නැවතුන තැනින්\nආරම්භ කරන්න',
    subtitle: 'ඔබේ වාර්තා, මාස 12 දින දර්ශනය සහ chat මඟපෙන්වීම තාමත් මෙතන — එක තට්ටුවකින් නැවත විවෘත කරන්න.',
    stats: [
      { value: '✓', label: 'වාර්තා සුරැකිලා' },
      { value: '12mo', label: 'දින දර්ශනය' },
      { value: '4.8★', label: 'සමාලෝචන 2,341' },
    ],
    features: [
      { icon: 'lock-open-outline', text: 'හැම දේම ක්ෂණිකව නැවත',
        desc: 'ඔබේ සුරැකි වාර්තා සහ ඉතිහාසය කෙළින්ම ආපහු එනවා — කිසිවක් නැති වුණේ නෑ.' },
      { icon: 'calendar-outline', text: 'ඔබේ කවුළු දිගටම චලනය වුණා',
        desc: 'තරු බලා හිටියේ නෑ. ඔබට මඟහැරුණු අවස්ථා සහ අවවාද කවුළු බලන්න.' },
      { icon: 'chatbubbles-outline', text: 'ඔබේ මඟපෙන්වීම බලාගෙන',
        desc: 'ආයෙත් ඕනෑ දෙයක් අහන්න — ඔබේ පෞද්ගලික ජ්‍යෝතිෂියා නැවතුන තැනින් පටන් ගන්නවා.' },
    ],
    valueLine: 'සතියකට තේ කෝප්පයකට වඩා අඩුයි',
    testimonial: '"මාස දෙකකට පස්සේ ආපහු ආවා, හැම දේම හරියට තිබුණු තැන තිබුණා. වටිනවා."',
    testimonialAuthor: '— දිලාන්, මහනුවර',
    urgency: '⏳ ඔබේ කවුළු චලනය වෙනවා — ඊළඟ එක මඟ අරින්න එපා',
    cta: 'මගේ ප්‍රවේශය නැවත සක්‍රිය කරන්න',
    ctaSub: 'ඕනෑම වෙලාවක නවතන්න · Google Play හරහා ආරක්ෂිතයි',
  },
};

// kendara = subscription sell from the Kendara chart page. Shown when a free
// user taps any of the locked chart sections (source: kendara_d9, kendara_dasha,
// kendara_doshas, …). The chart-vault framing mirrors the page they came from.
CONTENT.kendara = {
  en: {
    badge: '✦ YOUR COMPLETE CHART',
    hook: 'You can see your chart. Unlock what it actually says — the readings, the timing, the marriage chart.',
    title: 'Your Whole\nChart, Unlocked',
    subtitle: 'The yogas, the care points with remedies, your dasha timeline, the D9 marriage chart and 5 more life-area charts — all read for your exact birth time.',
    stats: [
      { value: '9', label: 'planets read' },
      { value: '6', label: 'life-area charts' },
      { value: '4.8★', label: '2,341 reviews' },
    ],
    features: [
      { icon: 'sparkles-outline', text: 'Every Yoga & Strength Explained',
        desc: 'The lucky combinations hidden in your chart — what each one means for your money, work and relationships.' },
      { icon: 'shield-checkmark-outline', text: 'Your Care Points — With Remedies',
        desc: 'The doshas found in your chart, whether they\'re softened, and the simple remedies for each.' },
      { icon: 'git-branch-outline', text: 'Your Dasha Timeline & Current Chapter',
        desc: 'Which planetary period you\'re living now, how long it lasts, and what it asks of you.' },
      { icon: 'heart-outline', text: 'Your D9 Marriage Chart',
        desc: 'The navamsa — where Venus sits, how your bonds are shaped, and what your partner life holds.' },
      { icon: 'shield-outline', text: 'Sensitive-Period Alerts',
        desc: 'The months ahead to take extra care with health and decisions — dated, with guidance.' },
      { icon: 'time-outline', text: 'Plus Rectification & Ask-the-Astrologer',
        desc: 'Not sure of your exact birth time? Pro includes the rectification tool — and chat to ask anything about your chart.' },
    ],
    valueLine: 'A full chart reading from an astrologer: LKR 3,000+',
    testimonial: '"It found a Raja Yoga I never knew I had — and told me my Saturn period ends next year. Everything clicked."',
    testimonialAuthor: '— Kasun, Gampaha',
    urgency: '✦ Your chart is calculated — unlock to read all of it',
    cta: 'Unlock My Full Chart',
    ctaSub: 'Cancel anytime · No hidden charges · Protected by Google Play',
  },
  si: {
    badge: '✦ ඔබේ සම්පූර්ණ කේන්දරය',
    hook: 'කේන්දරය ඔබට පේනවා. ඒක ඇත්තටම කියන දේ — කියවීම්, කාලය, විවාහ කේන්දරය — විවෘත කරන්න.',
    title: 'ඔබේ මුළු කේන්දරයම\nවිවෘතව',
    subtitle: 'යෝග, පිළියම් සහිත අවවාද තැන්, ඔබේ දශා කාල රේඛාව, D9 විවාහ කේන්දරය සහ තවත් ජීවිත අංශ සිතියම් 5ක් — ඔබේ නිශ්චිත උපන් වේලාවට කියවා.',
    stats: [
      { value: '9', label: 'ග්‍රහයෝ' },
      { value: '6', label: 'අංශ සිතියම්' },
      { value: '4.8★', label: 'සමාලෝචන 2,341' },
    ],
    features: [
      { icon: 'sparkles-outline', text: 'හැම යෝගයක්ම, ශක්තියක්ම පැහැදිලිව',
        desc: 'ඔබේ කේන්දරයේ සැඟවුණු වාසනාවන්ත යෝග — ඒවා ධනය, රැකියාව සහ සබඳතා වලට කියන දේ.' },
      { icon: 'shield-checkmark-outline', text: 'අවවාද තැන් — පිළියම් සමඟ',
        desc: 'කේන්දරයේ හමු වූ දෝෂ, ඒවා අඩුද, එක් එක් එකට සරල පිළියම් මොනවද කියා.' },
      { icon: 'git-branch-outline', text: 'දශා කාල රේඛාව සහ දැන් කාලය',
        desc: 'ඔබ දැන් ඉන්නේ කුමන ග්‍රහ කාලයේද, එය කොපමණ කල් තිබේද, ඔබෙන් ඉල්ලන්නේ මොනවද.' },
      { icon: 'heart-outline', text: 'ඔබේ D9 විවාහ කේන්දරය',
        desc: 'නවාංශකය — සිකුරු ඉන්න තැන, බැඳීම් හැඩගැහෙන විදිහ සහ විවාහ ජීවිතය.' },
      { icon: 'shield-outline', text: 'සංවේදී කාල ඇඟවීම්',
        desc: 'සෞඛ්‍යය සහ තීරණ ගැන පරිස්සම් විය යුතු ඉදිරි මාස — දින සහ මඟපෙන්වීම් සමඟ.' },
      { icon: 'time-outline', text: 'උපන් වේලා නිවැරදි කිරීම සහ නැකැත්කරුගෙන් අසන්න ද',
        desc: 'උපන් වේලාව හරියටම දන්නේ නැද්ද? Pro හි උපන් වේලා නිවැරදි කිරීමේ මෙවලම — සහ කේන්දරය ගැන ඕනෑම දෙයක් අසන්න chat ද ඇතුළත්.' },
    ],
    valueLine: 'ජ්‍යෝතිෂියෙකුගෙන් සම්පූර්ණ කේන්දර කියවීමක්: රු. 3,000+',
    testimonial: '"මට තිබුණ රාජ යෝගයක් හොයාගත්තා — සෙනසුරු කාලය ලබන අවුරුද්දේ ඉවරයි කිව්වා. හැම දේම ගැලපුණා."',
    testimonialAuthor: '— කසුන්, ගම්පහ',
    urgency: '✦ ඔබේ කේන්දරය ගණනය කරලා — ඔක්කොම කියවන්න විවෘත කරන්න',
    cta: 'මගේ සම්පූර්ණ කේන්දරය විවෘත කරන්න',
    ctaSub: 'ඕනෑම වෙලාවක නවතන්න · Google Play හරහා ආරක්ෂිතයි',
  },
};

var ACCENTS = {
  onboarding: { primary: '#FFB800', secondary: '#FF8C00', gradient: ['#FFD700', '#FFB800', '#FF8C00'] },
  report:     { primary: '#34D399', secondary: '#10B981', gradient: ['#34D399', '#10B981', '#059669'] },
  porondam:   { primary: '#F472B6', secondary: '#EC4899', gradient: ['#F472B6', '#EC4899', '#DB2777'] },
  chat:       { primary: '#A78BFA', secondary: '#8B5CF6', gradient: ['#C4B5FD', '#A78BFA', '#7C3AED'] },
  convergence:{ primary: '#A78BFA', secondary: '#8B5CF6', gradient: ['#C4B5FD', '#A78BFA', '#7C3AED'] },
  nakath:     { primary: '#FFB800', secondary: '#FF8C00', gradient: ['#FFD97A', '#FFB800', '#FF8C00'] },
  baby:       { primary: '#F472B6', secondary: '#EC4899', gradient: ['#F9A8D4', '#F472B6', '#EC4899'] },
  winback:    { primary: '#FFB800', secondary: '#FF8C00', gradient: ['#FFD700', '#FFB800', '#FF8C00'] },
  kendara:    { primary: '#FFB800', secondary: '#FF8C00', gradient: ['#FFD97A', '#FFB800', '#FF8C00'] },
};

var SHARED = {
  en: {
    restore: 'Restore purchases', terms: 'Terms', privacy: 'Privacy',
    secured: 'Secured by Google Play',
    noSub: 'No active subscription found',
    purchaseFail: 'Purchase could not be confirmed. Please try again or restore purchases.',
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
    purchaseFail: 'මිලදී ගැනීම තහවුරු කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
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
  var { pricing, priceLabel, priceAmount, isInternational, syncFromStoreCurrency } = usePricing();

  var src = source || 'onboarding';
  // Per-section sources (e.g. kendara_d9, kendara_dasha) share one pitch but log
  // a distinct funnel source. Fall back to the prefix before '_' for content/
  // accent lookup; `src` itself stays granular for analytics.
  var baseSrc = CONTENT[src] ? src : (src.indexOf('_') !== -1 ? src.split('_')[0] : src);
  var content = CONTENT[baseSrc] ? CONTENT[baseSrc][lang] : CONTENT.onboarding[lang];
  var shared = SHARED[lang];
  var accent = ACCENTS[baseSrc] || ACCENTS.onboarding;
  // One-time (non-subscription) sources → their store product + pricing key.
  var ONE_TIME_PRODUCT = { report: PRODUCT_IDS.full_report, porondam: PRODUCT_IDS.porondam_check, baby: PRODUCT_IDS.baby_kendara };
  var ONE_TIME_PRICING_KEY = { report: 'report', porondam: 'porondam', baby: 'babyKendara' };
  var isOneTime = !!ONE_TIME_PRODUCT[src];

  // Debug logging
  console.log('[Paywall] render — visible:', visible, 'source:', src, 'lang:', lang);

  var [offerings, setOfferings] = useState(null);
  var [loadingOfferings, setLoadingOfferings] = useState(true);
  var [purchasing, setPurchasing] = useState(false);
  var [restoring, setRestoring] = useState(false);
  var [error, setError] = useState('');

  // ── Paywall funnel analytics (best-effort) ──────────────────────────
  var loggedShownRef = useRef(false);
  var planForLog = isOneTime ? 'one_time' : 'monthly';
  var currencyForLog = pricing && pricing.currency;

  // Log 'shown' once each time the paywall opens.
  useEffect(function () {
    if (visible && !loggedShownRef.current) {
      loggedShownRef.current = true;
      logPaywallEvent('shown', { source: src, plan: planForLog, currency: currencyForLog });
    }
    if (!visible) loggedShownRef.current = false;
  }, [visible]);

  // Dismiss = log then close. Used by every close path.
  var dismissPaywall = useCallback(function () {
    logPaywallEvent('dismissed', { source: src, plan: planForLog, currency: currencyForLog });
    if (onClose) onClose();
  }, [onClose, src, planForLog, currencyForLog]);

  // Handle Android back button — dismiss paywall
  useEffect(function () {
    if (!visible || !onClose) return;
    var handler = function () { dismissPaywall(); return true; };
    var sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return function () { sub.remove(); };
  }, [visible, onClose, dismissPaywall]);

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
    // International users see RevenueCat's priceString — it reflects their actual
    // Play/App Store account currency (the price they'll be charged). Sri Lankan
    // / LKR users ALWAYS see LKR from our own pricing, never the store priceString
    // (sandbox/test accounts leak USD), so LKR is guaranteed for SL users.
    if (isOneTime) {
      if (isInternational) {
        var oneTimeProductId = ONE_TIME_PRODUCT[src];
        var oneTimePkg = getPackageByProductId(oneTimeProductId);
        if (oneTimePkg && oneTimePkg.product && oneTimePkg.product.priceString) {
          return oneTimePkg.product.priceString;
        }
      }
      return priceLabel(ONE_TIME_PRICING_KEY[src]);
    }
    if (isInternational && offerings && offerings.current) {
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

  // Log the conversion, then hand off to the caller's success handler.
  var notifyPurchased = function (result, planOverride) {
    logPaywallEvent('purchased', { source: src, plan: planOverride || planForLog, currency: currencyForLog });
    if (onPurchased) onPurchased(result);
  };

  var handlePurchase = async function () {
    console.log('[Paywall] handlePurchase — src:', src, 'isOneTime:', isOneTime);
    setPurchasing(true);
    setError('');
    try {
      if (isOneTime) {
        var productId = ONE_TIME_PRODUCT[src];
        console.log('[Paywall] one-time purchase productId:', productId);
        var otResult = await purchaseOneTimeProduct(productId);
        if (otResult && otResult.purchased) {
          notifyPurchased(otResult);
        } else {
          setError(shared.purchaseFail);
        }
      } else {
        var pkg = getMonthlyPackage();
        if (!pkg) {
          try {
            var direct = await purchaseOneTimeProduct(PRODUCT_IDS.monthly);
            if (direct && (direct.isProActive || direct.purchased)) {
              notifyPurchased(direct);
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
        if (result && (result.isProActive || result.purchased)) {
          notifyPurchased(result);
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
        notifyPurchased(result, 'restore');
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
            <TouchableOpacity style={[s.loadingClose, { top: insets.top + 10 }]} onPress={dismissPaywall}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Subtle particles */}
      <FloatingParticles />

      {/* Decorative accent glow */}
      <View style={[s.accentGlow, { backgroundColor: accent.primary + '08' }]} />

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

        {/* Lagna Compatibility Preview (subscription paywall only) */}
        {src === 'onboarding' ? (
          <Animated.View entering={FadeInDown.delay(340).duration(500)} style={s.compatPreview}>
            <LinearGradient
              colors={['rgba(147,51,234,0.12)', 'rgba(255,184,0,0.05)', 'rgba(5,3,9,0.95)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={s.compatPreviewGold} />
            <View style={s.compatPreviewHeader}>
              <Ionicons name="heart-circle" size={18} color="#FBBF24" />
              <Text style={s.compatPreviewTitle}>
                {lang === 'si' ? '\u0D94\u0DB6\u0DDA \u0DBD\u0D9C\u0DCA\u0DB1\u0DBA\u0DA7 \u0D9C\u0DD1\u0DC5\u0DD0\u0DB4\u0DD9\u0DB1 \u0DBB\u0DCF\u0DC1\u0DD2' : 'YOUR LAGNA COMPATIBILITY'}
              </Text>
            </View>
            <Text style={s.compatPreviewDesc}>
              {lang === 'si'
                ? '\u0D94\u0DB6\u0DDA \u0DBD\u0D9C\u0DCA\u0DB1\u0DBA\u0DA7 \u0DC0\u0DA9\u0DCF\u0DAD\u0DCA\u0DB8 \u0D86\u0D9A\u0DBB\u0DCA\u0DC2\u0DAB\u0DBA \u0D9A\u0DBB\u0DB1 \u0DBB\u0DCF\u0DC1\u0DD2 \u0DC3\u0DC4 \u0DB4\u0DCA\u200D\u0DBB\u0DC0\u0DDA\u0DC1\u0DB8\u0DCA \u0DC0\u0DD2\u0DBA \u0DBA\u0DD4\u0DAD\u0DD4 \u0D9C\u0DD1\u0DC5\u0DD0\u0DB4\u0DD3\u0DB8\u0DCA \u0DB6\u0DBD\u0DB1\u0DCA\u0DB1'
                : 'Discover which signs are magnetically drawn to your Rising Sign \u2014 and which ones to watch out for'}
            </Text>
            <View style={s.compatPreviewRow}>
              <View style={s.compatPreviewItem}>
                <View style={[s.compatPreviewCircle, { borderColor: '#34D39950' }]}>
                  <Ionicons name="lock-closed" size={14} color="#34D399" />
                </View>
                <View style={s.compatPreviewBlurLine} />
              </View>
              <View style={s.compatPreviewItem}>
                <View style={[s.compatPreviewCircle, { borderColor: '#34D39950' }]}>
                  <Ionicons name="lock-closed" size={14} color="#34D399" />
                </View>
                <View style={s.compatPreviewBlurLine} />
              </View>
              <View style={s.compatPreviewItem}>
                <View style={[s.compatPreviewCircle, { borderColor: '#FF6B9D50' }]}>
                  <Ionicons name="lock-closed" size={14} color="#FF6B9D" />
                </View>
                <View style={s.compatPreviewBlurLine} />
              </View>
            </View>
            <Text style={s.compatPreviewFooter}>
              {lang === 'si' ? '\uD83D\uDD12 \u0DAF\u0DCF\u0DBA\u0D9A\u0DAD\u0DCA\u0DC0\u0DBA\u0DD9\u0DB1\u0DCA \u0DB4\u0DC3\u0DD4 \u0D85\u0D9C\u0DD4\u0DC5\u0DD4 \u0D87\u0DBB\u0DDA' : '\uD83D\uDD12 Unlocks with subscription'}
            </Text>
          </Animated.View>
        ) : null}

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

      {/* Close button — rendered AFTER ScrollView so it sits on top and receives touches */}
      {onClose ? (
        <TouchableOpacity
          style={[s.closeBtn, { top: insets.top + 10 }]}
          onPress={dismissPaywall}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
        >
          <View style={s.closeBtnInner}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>
      ) : null}
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
    zIndex: 999,
    elevation: 10,
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

  // Compat preview
  compatPreview: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(147,51,234,0.25)',
    position: 'relative',
  },
  compatPreviewGold: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: '#FBBF24',
    opacity: 0.5,
  },
  compatPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  compatPreviewTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: 'rgba(251,191,36,0.85)',
  },
  compatPreviewDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
    marginBottom: 14,
  },
  compatPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
  },
  compatPreviewItem: {
    alignItems: 'center',
    gap: 6,
  },
  compatPreviewCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  compatPreviewBlurLine: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  compatPreviewFooter: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
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
