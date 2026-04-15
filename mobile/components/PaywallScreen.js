/**
 * PaywallScreen v5 — Grahachara Premium Paywall
 *
 * Context-aware: different content for onboarding, report, and porondam.
 * - onboarding = monthly subscription (LKR 280/month)
 * - report = one-time per report (LKR 380)
 * - porondam = one-time per check (LKR 100)
 *
 * FIT TO SCREEN — no ScrollView. All content fits within the device viewport.
 *
 * Props:
 *   visible, onClose, onPurchased, source ('onboarding' | 'report' | 'porondam')
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, StatusBar,
  Dimensions, ActivityIndicator, Linking, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown, FadeInUp, FadeIn, ZoomIn,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSequence, withDelay, interpolate, Easing,
} from 'react-native-reanimated';
import { boxShadow, textShadow } from '../utils/shadow';
import { useLanguage } from '../contexts/LanguageContext';
import { usePricing } from '../contexts/PricingContext';
import {
  getOfferings,
  purchasePackage,
  purchaseOneTimeProduct,
  restorePurchases,
  PRODUCT_IDS,
} from '../services/revenuecat';
import AwesomeRashiChakra from './AwesomeRashiChakra';

var { width: SW, height: SH } = Dimensions.get('window');
var IS_SMALL = SH < 700;
var IS_MEDIUM = SH < 800;
var CHAKRA_SIZE = Math.min(SW * 0.55, IS_SMALL ? 160 : IS_MEDIUM ? 200 : 260);
var LOGO_SIZE = IS_SMALL ? 60 : IS_MEDIUM ? 72 : 92;

// ─── Context-specific content ────────────────────────────────────

var CONTENT = {
  onboarding: {
    en: {
      badge: '� LIMITED LAUNCH OFFER',
      title: 'Your Destiny Chart\nIs Ready! ✨',
      subtitle: 'We\'ve already decoded your birth chart — don\'t let this cosmic reading vanish forever!',
      features: [
        '🔮 Your full birth chart, explained simply',
        '⚠️ Get warned before bad planetary periods hit',
        '🪐 See how planets affect your daily life',
        '💬 Chat with our AI Astrologer anytime',
        '💍 Marriage, wealth & career timing revealed',
      ],
      cta: 'Unlock My Complete Destiny 🔓',
      ctaSub: 'Cancel anytime • No hidden charges • Protected by Google Play',
    },
    si: {
      badge: '� සීමිත පිරිනැමීමක්',
      title: 'ඔයාගේ කේන්දරේ\nසූදානම්! ✨',
      subtitle: 'ඔයාගේ කේන්දරේ දැනටමත් සකස් කළා — මේ ග්‍රහ කියවීම සදහටම අහිමි වෙන්න දෙන්න එපා!',
      features: [
        '🔮 කේන්දරේ සම්පූර්ණ විස්තරය සිංහලෙන්ම',
        '⚠️ මාරක, අපල එන කාල කලින්ම දැනගමු',
        '🪐 දවසේ සහ සතියේ පලාපල ඔයාටම',
        '💬 ඕනෑම ප්‍රශ්නයක් අපේ AI එකෙන් අහන්න',
        '💍 විවාහය, ධනය, රස්සාව — සියල්ල',
      ],
      cta: '🔓 මගේ සම්පූර්ණ ඉරණම අගුළු අරින්න',
      ctaSub: 'ඕනෑම වෙලාවක නවතන්න • Google Play ආරක්ෂිතයි',
    },
  },
  report: {
    en: {
      badge: '🔥 MOST POPULAR CHOICE',
      title: 'Your Complete\nLife Blueprint 📖',
      subtitle: 'Get a highly accurate, 15+ page deep dive into your entire life. Don\'t leave your future to chance!',
      features: [
        '📜 Detailed breakdown of all 12 houses (Bhavas)',
        '💍 Marriage, wealth & exact career secrets',
        '⏳ Timelines for success, property & travel',
        '💎 Your lucky colors, numbers & gemstones',
        '⚠️ Hidden obstacles and how to beat them',
        '📥 Beautiful 15+ page PDF report to keep!',
      ],
      cta: 'Get My Full Life Report',
      ctaSub: 'Price per report • Yours instantly',
    },
    si: {
      badge: '🔥 ගොඩක් අය ගත්තු රිපෝට් එක',
      title: 'ඔයාගේ ජීවිතයේ\nසම්පූර්ණ කතාව 📖',
      subtitle: 'පිටු 15කට වඩා තියෙන, ඔයාගේ මුළු ජීවිතේම ගැන කියන විශේෂ රිපෝට් එක දැන්ම අරගෙන බලන්න!',
      features: [
        '📜 ලග්නය හා භාව 12 ගැන ගැඹුරු විස්තර',
        '💍 විවාහය, රස්සාව සහ සල්ලි ලැබෙන විදිහ',
        '⏳ දියුණු වෙන කාල, වාහන සහ විදේශ ගමන්',
        '💎 ඔයාට සුබ පාට, අංක සහ පළඳින්න ඕන මැණික්',
        '⚠️ ජීවිතේට එන බාධක සහ ඒවා මඟහරින විදිහ',
        '📥 පිටු 15කට වැඩි ලස්සන PDF එකක් ෆෝන් එකටම!',
      ],
      cta: 'මගේ රිපෝට් එක දැන්ම ගන්න',
      ctaSub: 'එක රිපෝට් එකකට මිල • ක්ෂණිකව ලැබේ',
    },
  },
  porondam: {
    en: {
      badge: '💖 ARE YOU MEANT TO BE?',
      title: 'True Soulmate\nCheck 💑',
      subtitle: 'Find out if you two are truly a match made in heaven before taking the next big step!',
      features: [
        '💫 All 7 traditional Porondam matched',
        '📊 Accurate compatibility score out of 20',
        '✅ Honest "Go or No-Go" straight advice',
        '📥 Beautiful PDF result to easily share',
      ],
      cta: 'Check Our Match Now',
      ctaSub: 'Only one payment • Instant results',
    },
    si: {
      badge: '💖 ඔයාලා ඇත්තටම ගැලපෙනවාද?',
      title: 'හොඳම සහකරු\nතෝරාගමු 💑',
      subtitle: 'ජීවිතේ ලොකුම තීරණේ ගන්න කලින්, සාම්ප්‍රදායික පදනමෙන් ඔයාලා කොච්චර ගැලපෙනවද කියලා හරියටම බලමු!',
      features: [
        '💫 පරම්පරාවෙන් එන පොරොන්දම් 7ම පරීක්ෂාව',
        '📊 හරියටම ලකුණු 20න් කීයක් එනවද කියල බලමු',
        '✅ පැටලෙන්නෙ නැතුව අවසාන තීරණය පැහැදිලිවම',
        '📥 පවුලේ අයටත් පෙන්නන්න ලස්සන PDF එකක්',
      ],
      cta: 'අපේ ගැලපීම දැන්ම බලන්න',
      ctaSub: 'එක පාරක් විතරක් ගෙවන්න • ප්‍රතිඵල එවේලේම',
    },
  },
};

// Theme accent per source
var ACCENTS = {
  onboarding: { primary: '#FFB800', gradient: ['#FFD700', '#FFB800', '#FF8C00', '#FF6D00'] },
  report:     { primary: '#34D399', gradient: ['#34D399', '#10B981', '#059669', '#047857'] },
  porondam:   { primary: '#F472B6', gradient: ['#F472B6', '#EC4899', '#DB2777', '#BE185D'] },
};

// Shared strings
var SHARED = {
  en: {
    restore: 'Restore', terms: 'Terms', privacy: 'Privacy',
    secured: 'Secured by Google Play',
    noSub: 'No active subscription found',
    purchaseFail: 'Purchase failed. Please try again.',
    restoreFail: 'Restore failed.',
    oneTime: 'one-time',
    perMonth: '/month',
    perReport: '/report',
  },
  si: {
    restore: 'ප්‍රතිස්ථාපනය', terms: 'කොන්දේසි', privacy: 'රහස්‍යතාව',
    secured: 'Google Play මඟින් ආරක්ෂිතයි',
    noSub: 'දායකත්වයක් හමු නොවීය',
    purchaseFail: 'මිලදී ගැනීම අසාර්ථකයි.',
    restoreFail: 'ප්‍රතිස්ථාපනය අසාර්ථකයි.',
    oneTime: 'එක් වරක්',
    perMonth: '/මාසයට',
    perReport: '/රිපෝට් එකට',
  },
};

// ─── Floating Particles (fewer for perf) ─────────────────────────

var PARTICLE_DATA = [];
for (var _pi = 0; _pi < 12; _pi++) {
  PARTICLE_DATA.push({
    id: _pi,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1.5 + Math.random() * 2,
    dur: 3000 + Math.random() * 4000,
    delay: Math.random() * 2000,
    color: _pi % 3 === 0 ? '#FFB800' : _pi % 3 === 1 ? '#9333EA' : '#5FA8D4',
  });
}

// ─── Paywall Testimonials ─────────────────────────────────────
var PW_TESTIMONIALS = {
  en: [
    { name: 'Amaya K.', text: '"The danger period warning literally saved my career!"', stars: 5 },
    { name: 'Dinesh R.', text: '"Marriage chart accuracy was unreal. Mind blown."', stars: 5 },
    { name: 'Priya M.', text: '"Worth every rupee. AI caught what no astrologer did."', stars: 5 },
  ],
  si: [
    { name: 'අමායා කේ.', text: '"අවදානම් කාල ඇඟවීම නිසා රස්සාව බේරුණා!"', stars: 5 },
    { name: 'දිනේෂ් ආර්.', text: '"විවාහ කේන්දරේ 100% හරි ගියා. ඇදහිය නොහැකියි."', stars: 5 },
    { name: 'ප්‍රියා එම්.', text: '"AI එකෙන් ජ්‍යෝතිෂවේදියෙක්වත් නොකියපු දේ කිව්වා."', stars: 5 },
  ],
};

function SingleParticle({ p }) {
  var anim = useSharedValue(0);
  useEffect(function () {
    anim.value = withDelay(p.delay,
      withRepeat(withTiming(1, { duration: p.dur, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, []);
  var style = useAnimatedStyle(function () {
    return {
      opacity: interpolate(anim.value, [0, 0.5, 1], [0, 0.5, 0]),
      transform: [
        { translateY: interpolate(anim.value, [0, 1], [0, -15]) },
        { scale: interpolate(anim.value, [0, 0.5, 1], [0.5, 1, 0.5]) },
      ],
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

// ─── Main Paywall Component ─────────────────────────────────────

export default function PaywallScreen({ visible, onClose, onPurchased, source }) {
  var insets = useSafeAreaInsets();
  var { language } = useLanguage();
  var lang = language === 'si' ? 'si' : 'en';
  var { priceLabel, isInternational, subscriptionLabel } = usePricing();

  var src = source || 'onboarding';
  var content = CONTENT[src] ? CONTENT[src][lang] : CONTENT.onboarding[lang];
  var shared = SHARED[lang];
  var accent = ACCENTS[src] || ACCENTS.onboarding;
  var isOneTime = src === 'report' || src === 'porondam';

  var [offerings, setOfferings] = useState(null);
  var [loadingOfferings, setLoadingOfferings] = useState(true);
  var [purchasing, setPurchasing] = useState(false);
  var [restoring, setRestoring] = useState(false);
  var [error, setError] = useState('');

  // ── Countdown Timer ──
  var [countdown, setCountdown] = useState(14 * 60 + 59);
  useEffect(function () {
    if (!visible) return;
    var timer = setInterval(function () {
      setCountdown(function (prev) { return prev > 0 ? prev - 1 : 14 * 60 + 59; });
    }, 1000);
    return function () { clearInterval(timer); };
  }, [visible]);
  var countdownMin = Math.floor(countdown / 60);
  var countdownSec = countdown % 60;
  var countdownStr = (countdownMin < 10 ? '0' : '') + countdownMin + ':' + (countdownSec < 10 ? '0' : '') + countdownSec;

  // ── Live user counter ──
  var [liveUsers, setLiveUsers] = useState(2847);
  useEffect(function () {
    if (!visible) return;
    var userTimer = setInterval(function () {
      setLiveUsers(function (prev) { return prev + Math.floor(Math.random() * 3) + 1; });
    }, 3000 + Math.random() * 5000);
    return function () { clearInterval(userTimer); };
  }, [visible]);

  // ── Rotating testimonial ──
  var [testimonialIdx, setTestimonialIdx] = useState(0);
  useEffect(function () {
    if (!visible) return;
    var tTimer = setInterval(function () {
      setTestimonialIdx(function (prev) { return (prev + 1) % PW_TESTIMONIALS.en.length; });
    }, 4000);
    return function () { clearInterval(tTimer); };
  }, [visible]);
  var pwTestimonials = lang === 'si' ? PW_TESTIMONIALS.si : PW_TESTIMONIALS.en;
  var currentTestimonial = pwTestimonials[testimonialIdx];

  // Animations
  var btnGlow = useSharedValue(0);
  var btnPulse = useSharedValue(0);
  var chakraRotate = useSharedValue(0);
  var timerFlash = useSharedValue(0);
  var liveDotPulse = useSharedValue(0);

  useEffect(function () {
    btnGlow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    btnPulse.value = withRepeat(withSequence(
      withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 800, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 1000 })
    ), -1, false);
    chakraRotate.value = withRepeat(withTiming(360, { duration: 90000, easing: Easing.linear }), -1, false);
    timerFlash.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
    liveDotPulse.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);

  var btnGlowStyle = useAnimatedStyle(function () {
    return { transform: [{ scale: interpolate(btnGlow.value, [0, 1], [1, 1.02]) }] };
  });

  var btnShadowStyle = useAnimatedStyle(function () {
    return {
      opacity: interpolate(btnPulse.value, [0, 1], [0.15, 0.6]),
      transform: [{ scale: interpolate(btnPulse.value, [0, 1], [1, 1.15]) }],
    };
  });

  var chakraStyle = useAnimatedStyle(function () {
    return { transform: [{ rotate: chakraRotate.value + 'deg' }] };
  });

  var timerPulseStyle = useAnimatedStyle(function () {
    return { opacity: interpolate(timerFlash.value, [0, 0.5, 1], [0.8, 1, 0.8]) };
  });

  var liveDotStyle = useAnimatedStyle(function () {
    return {
      transform: [{ scale: interpolate(liveDotPulse.value, [0, 1], [0.8, 1.3]) }],
      opacity: interpolate(liveDotPulse.value, [0, 1], [0.5, 1]),
    };
  });

  // Load offerings
  useEffect(function () {
    if (!visible) return;
    setLoadingOfferings(true);
    setError('');
    getOfferings()
      .then(function (off) { setOfferings(off); })
      .catch(function () { })
      .finally(function () { setLoadingOfferings(false); });
  }, [visible]);

  var getMonthlyPackage = useCallback(function () {
    if (!offerings || !offerings.current) return null;
    var pkgs = offerings.current.availablePackages;
    return pkgs.find(function (p) {
      return p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly' ||
        (p.product && p.product.identifier && p.product.identifier.indexOf('monthly') !== -1);
    });
  }, [offerings]);

  // Get the display price based on source
  var getDisplayPrice = function () {
    if (isOneTime) {
      // One-time pricing from PricingContext (geo-aware: LKR or USD)
      return priceLabel(src);
    }
    // Monthly subscription — try RevenueCat first (store-localized price)
    if (offerings && offerings.current) {
      var monthly = offerings.current.availablePackages.find(function (p) {
        return p.packageType === 'MONTHLY' || p.identifier === '$rc_monthly';
      });
      if (monthly && monthly.product) return monthly.product.priceString;
    }
    // Fallback: geo-aware price from PricingContext (LKR 280 or $4.99)
    return subscriptionLabel();
  };

  var getPriceSuffix = function () {
    if (src === 'report') return shared.perReport;
    if (isOneTime) return '  (' + shared.oneTime + ')';
    return shared.perMonth;
  };

  var handlePurchase = async function () {
    setPurchasing(true);
    setError('');
    try {
      if (isOneTime) {
        // One-time purchase: report or porondam
        var productId = src === 'report' ? PRODUCT_IDS.full_report : PRODUCT_IDS.porondam_check;
        var otResult = await purchaseOneTimeProduct(productId);
        if (otResult && otResult.purchased) {
          if (onPurchased) onPurchased(otResult);
        }
      } else {
        // Subscription purchase (monthly)
        var pkg = getMonthlyPackage();
        if (!pkg) { setError(shared.purchaseFail); setPurchasing(false); return; }
        var result = await purchasePackage(pkg);
        if (result && result.isProActive) {
          if (onPurchased) onPurchased(result);
        }
      }
    } catch (e) {
      var msg = e && e.message ? e.message : '';
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

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={s.container}>

        {/* ─── Background gradient — unique per source ─── */}
        <LinearGradient
          colors={src === 'porondam' ? ['#1A0A1E', '#120818', '#0A0515', '#06020F']
                : src === 'report'   ? ['#0A1A15', '#081510', '#060F0A', '#04080F']
                :                      ['#08051A', '#0A0620', '#06031A', '#04020F']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />

        {/* ─── Particles ─── */}
        <FloatingParticles />

        {/* ─── Close ─── */}
        {onClose ? (
          <Animated.View entering={FadeIn.delay(800).duration(400)} style={[s.closeBtn, { top: insets.top + 8 }]}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
              <View style={s.closeBtnInner}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* ─── Fixed content — flex fills screen ─── */}
        <View style={[s.fixedContent, { paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>

          {/* ── TOP: Rashi Chakra + Logo ── */}
          <View style={s.topSection}>
            <Animated.View entering={FadeIn.delay(100).duration(800)} style={s.chakraLogoWrap}>
              <Animated.View style={[s.chakraAbsolute, chakraStyle]}>
                <View style={{ opacity: 0.22 }}>
                  <AwesomeRashiChakra size={CHAKRA_SIZE} />
                </View>
              </Animated.View>
              <View style={[s.logoCircle, { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2, borderColor: accent.primary + '40' }]}>
                <Image
                  source={require('../assets/logo.png')}
                  style={{ width: LOGO_SIZE - 10, height: LOGO_SIZE - 10, borderRadius: (LOGO_SIZE - 10) / 2 }}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>
          </View>

          {/* ── MIDDLE: Badge + Title + Features + Price ── */}
          <View style={s.middleSection}>
            {/* Urgency Countdown Timer */}
            <Animated.View entering={FadeInDown.delay(150).duration(400)} style={s.badgeWrap}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,60,60,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,60,60,0.2)' }}>
                <Ionicons name="timer-outline" size={13} color="#FF6B6B" />
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#FF6B6B', letterSpacing: 0.5 }}>
                  {lang === 'si' ? 'පිරිනැමීම අවසන් වෙයි:' : 'OFFER ENDS IN:'}
                </Text>
                <Animated.View style={[{ backgroundColor: 'rgba(255,60,60,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }, timerPulseStyle]}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#FF4444', fontVariant: ['tabular-nums'], letterSpacing: 1 }}>{countdownStr}</Text>
                </Animated.View>
              </View>
            </Animated.View>

            {/* Live Counter */}
            <Animated.View entering={FadeInDown.delay(200).duration(350)} style={{ marginBottom: IS_SMALL ? 6 : 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' }, liveDotStyle]} />
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#34D399', letterSpacing: 0.3 }}>
                  {lang === 'si' ? 'අද ' + liveUsers.toLocaleString() + ' දෙනෙක් එක්වුණා' : liveUsers.toLocaleString() + ' people joined today'}
                </Text>
              </View>
            </Animated.View>

            {/* Title */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={s.titleWrap}>
              <Text style={s.heroTitle}>{content.title}</Text>
              <Text style={s.heroSub}>{content.subtitle}</Text>
            </Animated.View>

            {/* Features */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)} style={s.featCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.04)', 'rgba(147,51,234,0.03)', 'rgba(255,184,0,0.015)']}
                style={s.featCardInner}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {content.features.map(function (feat, i) {
                  return (
                    <View key={i} style={s.featRow}>
                      <View style={[s.featDot, { backgroundColor: accent.primary }]} />
                      <Text style={s.featText} numberOfLines={2}>{feat}</Text>
                    </View>
                  );
                })}
              </LinearGradient>
            </Animated.View>

            {/* Testimonial */}
            {src === 'onboarding' ? (
              <Animated.View entering={FadeInDown.delay(450).duration(400)} style={{ width: '100%', marginBottom: IS_SMALL ? 2 : 4 }}>
                <View style={{ backgroundColor: 'rgba(167,139,250,0.05)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.10)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                    {[0, 1, 2, 3, 4].map(function (s) { return <Ionicons key={s} name="star" size={9} color="#FFB800" />; })}
                    <Text style={{ fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.35)', marginLeft: 3 }}>{currentTestimonial.name}</Text>
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', lineHeight: 14 }} numberOfLines={2}>{currentTestimonial.text}</Text>
                </View>
              </Animated.View>
            ) : null}

          </View>

          {/* ── BOTTOM: Price + Error + CTA + Footer ── */}
          <View style={s.bottomSection}>
            {/* Price */}
            <Animated.View entering={ZoomIn.delay(550).duration(400).springify()} style={s.priceWrap}>
              {loadingOfferings && !isOneTime ? (
                <ActivityIndicator size="small" color={accent.primary} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  {/* Anchoring: show comparison to real astrologer */}
                  {!isOneTime ? (
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4, textAlign: 'center' }}>
                      {lang === 'si' ? '🔮 සාමාන්‍ය ජ්‍යෝතිෂවේදියෙක්ගෙන් රු. 3,000+' : '🔮 A real astrologer costs ' + (isInternational ? '$50+' : 'LKR 3,000+') + ' per visit'}
                    </Text>
                  ) : null}
                  <View style={s.priceRow}>
                    {/* Crossed-out anchor price */}
                    {!isOneTime ? (
                      <Text style={{ fontSize: 13, fontWeight: '600', color: 'rgba(255,100,100,0.5)', textDecorationLine: 'line-through', marginRight: 6 }}>{isInternational ? '$9.99' : 'රු.500'}</Text>
                    ) : null}
                    <Text style={[s.priceAmount, { color: accent.primary }]}>{getDisplayPrice()}</Text>
                    <Text style={s.pricePeriod}>{getPriceSuffix()}</Text>
                  </View>
                  {/* Per-day breakdown */}
                  {!isOneTime ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 8, fontWeight: '800', color: '#34D399' }}>
                          {isInternational ? 'SAVE 50%' : 'SAVE 44%'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 9, color: 'rgba(52,211,153,0.7)', fontWeight: '600' }}>
                        {lang === 'si' ? 'දවසට රු. 9 — තේ එකකටත් වඩා අඩුයි ☕' : 'Only ' + (isInternational ? '$0.17' : 'LKR 9') + '/day ☕'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </Animated.View>

            {/* Error */}
            {error ? (
              <View style={s.errorWrap}>
                <Ionicons name="alert-circle" size={13} color="#FF6B6B" />
                <Text style={s.errorText} numberOfLines={2}>{error}</Text>
              </View>
            ) : null}

            {/* CTA Button */}
            <Animated.View entering={FadeInUp.delay(650).duration(500)} style={s.ctaOuter}>
              <Animated.View style={[s.ctaHalo, btnShadowStyle, { backgroundColor: accent.primary + '1F' }]} />
              <Animated.View style={btnGlowStyle}>
                <TouchableOpacity
                  onPress={handlePurchase}
                  disabled={purchasing || (!isOneTime && loadingOfferings)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={purchasing ? ['#555', '#444'] : accent.gradient}
                    style={s.ctaBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    {purchasing ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <View style={s.ctaInner}>
                        <Ionicons name={src === 'porondam' ? 'heart' : src === 'report' ? 'document-text' : 'lock-open'} size={18} color="#FFF" />
                        <Text style={s.ctaText}>{content.cta}</Text>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* Sub-CTA */}
            <Text style={s.ctaSub}>{content.ctaSub}</Text>

            {/* Footer */}
            <View style={s.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={10} color="#34D399" />
              <Text style={s.footerText}>
                {Platform.OS === 'ios' ? shared.secured.replace('Google Play', 'App Store') : shared.secured}
              </Text>
            </View>
            <View style={s.footerLinksRow}>
              {!isOneTime ? (
                <>
                  <TouchableOpacity onPress={handleRestore} disabled={restoring}>
                    <Text style={[s.footerLink, { color: accent.primary + '80' }]}>{restoring ? '...' : shared.restore}</Text>
                  </TouchableOpacity>
                  <Text style={s.footerDot}>{'\u00B7'}</Text>
                </>
              ) : null}
              <TouchableOpacity onPress={function () { Linking.openURL('https://grahachara.com/legal/terms.html'); }}>
                <Text style={[s.footerLink, { color: accent.primary + '80' }]}>{shared.terms}</Text>
              </TouchableOpacity>
              <Text style={s.footerDot}>{'\u00B7'}</Text>
              <TouchableOpacity onPress={function () { Linking.openURL('https://grahachara.com/legal/privacy.html'); }}>
                <Text style={[s.footerLink, { color: accent.primary + '80' }]}>{shared.privacy}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

var s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08051A',
  },

  closeBtn: { position: 'absolute', right: 14, zIndex: 100 },
  closeBtnInner: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Fixed layout — fills screen
  fixedContent: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
  },

  // ── TOP ──
  topSection: {
    alignItems: 'center',
  },
  chakraLogoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHAKRA_SIZE,
    height: CHAKRA_SIZE,
    alignSelf: 'center',
  },
  chakraAbsolute: {
    position: 'absolute',
    width: CHAKRA_SIZE,
    height: CHAKRA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.6, 24),
    zIndex: 2,
    backgroundColor: 'rgba(8,5,26,0.6)',
  },

  // ── MIDDLE ──
  middleSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 0,
  },
  badgeWrap: { alignItems: 'center', marginBottom: IS_SMALL ? 4 : 6 },
  badgePill: {
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: IS_SMALL ? 8 : 9,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },

  titleWrap: { alignItems: 'center', marginBottom: IS_SMALL ? 6 : 8 },
  heroTitle: {
    fontSize: IS_SMALL ? 20 : IS_MEDIUM ? 24 : 30,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: IS_SMALL ? 26 : IS_MEDIUM ? 30 : 38,
    ...textShadow('rgba(147,51,234,0.3)', { width: 0, height: 3 }, 14),
  },
  heroSub: {
    color: 'rgba(255,220,150,0.50)',
    fontSize: IS_SMALL ? 10 : 11,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: IS_SMALL ? 14 : 16,
    paddingHorizontal: 8,
  },

  featCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: IS_SMALL ? 2 : 4,
    ...boxShadow('rgba(147,51,234,0.12)', { width: 0, height: 4 }, 0.4, 12),
  },
  featCardInner: {
    paddingVertical: IS_SMALL ? 2 : 4,
    paddingHorizontal: 4,
  },
  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: IS_SMALL ? 3 : 4,
    paddingHorizontal: 10,
  },
  featDot: {
    width: 4, height: 4, borderRadius: 2,
    marginRight: 10,
    ...boxShadow('#FFB800', { width: 0, height: 0 }, 0.8, 3),
  },
  featText: {
    color: 'rgba(255,245,220,0.90)',
    fontSize: IS_SMALL ? 11 : 12,
    fontWeight: '600',
    letterSpacing: 0.15,
    lineHeight: IS_SMALL ? 14 : 17,
    flex: 1,
  },

  priceWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: IS_SMALL ? 3 : 5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  priceAmount: {
    fontSize: IS_SMALL ? 26 : IS_MEDIUM ? 32 : 38,
    fontWeight: '900',
    letterSpacing: -1,
    ...textShadow('rgba(255,184,0,0.45)', { width: 0, height: 0 }, 16),
  },
  pricePeriod: {
    fontSize: IS_SMALL ? 11 : 13,
    fontWeight: '700',
    color: 'rgba(255,220,160,0.55)',
    marginBottom: IS_SMALL ? 3 : 5,
  },

  // ── BOTTOM ──
  bottomSection: {
    alignItems: 'center',
    zIndex: 2,
  },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
    width: '100%',
  },
  errorText: { color: '#FCA5A5', fontSize: 11, fontWeight: '600', flex: 1 },

  ctaOuter: {
    position: 'relative',
    marginBottom: 4,
    width: '100%',
  },
  ctaHalo: {
    position: 'absolute',
    top: -4,
    left: 8,
    right: 8,
    bottom: -4,
    borderRadius: 24,
  },
  ctaBtn: {
    borderRadius: 20,
    paddingVertical: IS_SMALL ? 12 : 14,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFF',
    fontSize: IS_SMALL ? 14 : 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  ctaSub: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: IS_SMALL ? 4 : 6,
    letterSpacing: 0.2,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontWeight: '500',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerDot: { color: 'rgba(255,255,255,0.15)', fontSize: 10 },
  footerLink: { fontSize: 10, fontWeight: '600' },
});
