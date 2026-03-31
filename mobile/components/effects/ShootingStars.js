// ═══════════════════════════════════════════════════════════════════════
//  ShootingStars.js — Lightweight Shooting Star Overlay (Reanimated)
//
//  Port of the website CSS shooting-star animation to React Native.
//  Uses react-native-reanimated for 60fps native-thread animations.
//
//  Each star is a small bright dot with a golden gradient trail,
//  spawned from top/right edges and animated diagonally (315deg) with
//  fade-in/fade-out. Random timing, duration, and trail length.
//
//  Runs as a pure RN overlay — NO Three.js, NO WebGL, NO R3F Canvas.
//  Extremely lightweight compared to the old particle system.
//
//  Usage: <ShootingStarsOverlay />   (place above background, below content)
// ═══════════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, runOnJS, Easing, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

var { width: SW, height: SH } = Dimensions.get('window');
var IS_MOBILE = SW < 768;

// ══════════════════════════════════════════════════════════════════
//  CONFIG — matches website shooting-stars.js timing
// ══════════════════════════════════════════════════════════════════
var SPAWN_MIN = IS_MOBILE ? 4000 : 3000;    // ms between stars
var SPAWN_MAX = IS_MOBILE ? 12000 : 9000;
var MAX_ACTIVE = IS_MOBILE ? 2 : 3;         // max visible at once
var DUR_MIN = 800;                           // animation duration ms
var DUR_MAX = 2800;
var TAIL_MIN = 120;                          // trail length px
var TAIL_MAX = 300;

// ── Helpers ──
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

// ══════════════════════════════════════════════════════════════════
//  SINGLE STAR COMPONENT — animated via Reanimated
// ══════════════════════════════════════════════════════════════════

function ShootingStar({ id, top, right, duration, tailLength, onDone }) {
  var progress = useSharedValue(0);
  var opacity = useSharedValue(0);

  // Diagonal travel distance (matching website translateX(-1500px) on 315deg rotate)
  var travelDist = Math.min(SW, SH) * 1.8;

  useEffect(function () {
    // Fade in fast, stay visible, fade out at end
    opacity.value = withSequence(
      withTiming(1, { duration: duration * 0.05, easing: Easing.linear }),
      withTiming(1, { duration: duration * 0.65, easing: Easing.linear }),
      withTiming(0, { duration: duration * 0.30, easing: Easing.linear })
    );

    // Linear travel from start to end
    progress.value = withTiming(1, {
      duration: duration,
      easing: Easing.linear,
    }, function (finished) {
      if (finished) {
        runOnJS(onDone)(id);
      }
    });
  }, []);

  // 315deg diagonal = down-left direction: dx negative, dy positive
  var starStyle = useAnimatedStyle(function () {
    var t = progress.value;
    var dx = -t * travelDist * 0.707;
    var dy = t * travelDist * 0.707;

    return {
      opacity: opacity.value,
      transform: [
        { translateX: dx },
        { translateY: dy },
      ],
    };
  });

  // Trail is a rotated gradient line behind the star head
  var trailStyle = useMemo(function () {
    return {
      width: tailLength,
      height: 1,
      position: 'absolute',
      top: 1,
      left: 4,
    };
  }, [tailLength]);

  // Outer glow trail (wider, softer)
  var outerTrailStyle = useMemo(function () {
    return {
      width: tailLength * 0.6,
      height: 3,
      borderRadius: 2,
      position: 'absolute',
      top: 0,
      left: 4,
    };
  }, [tailLength]);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: top,
          right: right,
          transform: [{ rotate: '315deg' }],
        },
        starStyle,
      ]}
    >
      {/* HEAD — bright dot with golden glow */}
      <View style={styles.starHead} />

      {/* TRAIL — golden gradient line */}
      <LinearGradient
        colors={['rgba(255,230,130,0.85)', 'rgba(255,200,80,0.4)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={trailStyle}
      />

      {/* OUTER GLOW TRAIL — wider, softer */}
      <LinearGradient
        colors={['rgba(255,210,80,0.35)', 'rgba(255,180,50,0.12)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={outerTrailStyle}
      />
    </Animated.View>
  );
}


// ══════════════════════════════════════════════════════════════════
//  OVERLAY — manages spawn timing + pool of star components
// ══════════════════════════════════════════════════════════════════

function ShootingStarsOverlay() {
  var [stars, setStars] = useState([]);
  var nextId = useRef(0);
  var activeCount = useRef(0);
  var timer1 = useRef(null);
  var timer2 = useRef(null);
  var mounted = useRef(true);

  var removeStar = useCallback(function (id) {
    if (!mounted.current) return;
    activeCount.current = Math.max(0, activeCount.current - 1);
    setStars(function (prev) { return prev.filter(function (s) { return s.id !== id; }); });
  }, []);

  var spawnStar = useCallback(function () {
    if (!mounted.current) return;
    if (activeCount.current >= MAX_ACTIVE) {
      scheduleNext(timer1);
      return;
    }

    var id = nextId.current++;
    var topVal = randInt(0, Math.min(300, SH * 0.4));
    var rightVal = randInt(0, Math.max(SW - 200, 200));
    var dur = rand(DUR_MIN, DUR_MAX);
    var tail = randInt(TAIL_MIN, TAIL_MAX);

    activeCount.current++;
    setStars(function (prev) {
      return prev.concat([{
        id: id,
        top: topVal,
        right: rightVal,
        duration: dur,
        tailLength: tail,
      }]);
    });

    scheduleNext(timer1);
  }, []);

  var scheduleNext = useCallback(function (timerRef) {
    if (!mounted.current) return;
    var gap = rand(SPAWN_MIN, SPAWN_MAX);
    if (timerRef) {
      timerRef.current = setTimeout(spawnStar, gap);
    } else {
      setTimeout(spawnStar, gap);
    }
  }, [spawnStar]);

  useEffect(function () {
    mounted.current = true;

    // Kick off — first star after a short wait
    timer1.current = setTimeout(spawnStar, rand(500, 2000));

    // Stagger a second spawn stream for variety
    timer2.current = setTimeout(function () {
      if (mounted.current) scheduleNext(timer2);
    }, rand(2000, 5000));

    return function () {
      mounted.current = false;
      if (timer1.current) clearTimeout(timer1.current);
      if (timer2.current) clearTimeout(timer2.current);
    };
  }, []);

  return (
    <View style={styles.layer} pointerEvents="none">
      {stars.map(function (s) {
        return (
          <ShootingStar
            key={s.id}
            id={s.id}
            top={s.top}
            right={s.right}
            duration={s.duration}
            tailLength={s.tailLength}
            onDone={removeStar}
          />
        );
      })}
    </View>
  );
}


// ══════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════

var styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 5,
  },
  starHead: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    // Golden glow — matches website box-shadow
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 20px rgba(255,220,100,0.9), 0 0 40px rgba(255,180,50,0.4)',
        }
      : {
          shadowColor: 'rgba(255,220,100,1)',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
          elevation: 6,
        }),
  },
});


// ── Export both the overlay (new) and legacy name for compatibility ──
export default ShootingStarsOverlay;
export { ShootingStarsOverlay };
