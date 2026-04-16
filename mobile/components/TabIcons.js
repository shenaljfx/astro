import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, RadialGradient, Line, Ellipse, Rect } from 'react-native-svg';

// ─── Sun / Today ─────────────────────────────────────────
export function SunIcon({ size = 24, color = '#D4A056', focused }) {
  var s = size;
  var op = focused ? 1 : 0.35;
  var rayColor = focused ? '#FFD700' : color;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      <Defs>
        <RadialGradient id="sunG" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFF3C4" stopOpacity={op} />
          <Stop offset="40%" stopColor="#FFD700" stopOpacity={op} />
          <Stop offset="100%" stopColor={color} stopOpacity={op * 0.8} />
        </RadialGradient>
      </Defs>
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(function (angle, i) {
        var rad = (angle * Math.PI) / 180;
        var x1 = 20 + Math.cos(rad) * 11;
        var y1 = 20 + Math.sin(rad) * 11;
        var x2 = 20 + Math.cos(rad) * 17;
        var y2 = 20 + Math.sin(rad) * 17;
        var isLong = i % 2 === 0;
        return (
          <Line key={i} x1={x1} y1={y1} x2={isLong ? 20 + Math.cos(rad) * 18 : x2} y2={isLong ? 20 + Math.sin(rad) * 18 : y2}
            stroke={rayColor} strokeWidth={isLong ? 2.2 : 1.5} strokeLinecap="round" opacity={op * 0.9} />
        );
      })}
      {/* Core */}
      <Circle cx="20" cy="20" r="8.5" fill="url(#sunG)" />
      <Circle cx="20" cy="20" r="8.5" fill="none" stroke={color} strokeWidth="1" opacity={op * 0.6} />
      {/* Inner shine */}
      <Circle cx="18" cy="18" r="3" fill="white" opacity={focused ? 0.25 : 0.1} />
    </Svg>
  );
}

// ─── Chart / Kendara ─────────────────────────────────────
export function ChartIcon({ size = 24, color = '#7B9CC4', focused }) {
  var s = size;
  var op = focused ? 1 : 0.35;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="chartG" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#A8D0F0" stopOpacity={op} />
          <Stop offset="100%" stopColor={color} stopOpacity={op} />
        </LinearGradient>
      </Defs>
      {/* Diamond / rhombus chart frame */}
      <Path d="M20 4 L36 20 L20 36 L4 20 Z" fill="none" stroke="url(#chartG)" strokeWidth="1.8" />
      {/* Inner diamond */}
      <Path d="M20 12 L28 20 L20 28 L12 20 Z" fill="none" stroke={color} strokeWidth="1" opacity={op * 0.5} />
      {/* Cross lines */}
      <Line x1="20" y1="4" x2="20" y2="36" stroke={color} strokeWidth="0.8" opacity={op * 0.3} />
      <Line x1="4" y1="20" x2="36" y2="20" stroke={color} strokeWidth="0.8" opacity={op * 0.3} />
      {/* Planet dots */}
      <Circle cx="20" cy="8" r="2" fill={color} opacity={op * 0.8} />
      <Circle cx="28" cy="16" r="1.5" fill={color} opacity={op * 0.6} />
      <Circle cx="14" cy="24" r="1.8" fill={color} opacity={op * 0.7} />
      <Circle cx="24" cy="28" r="1.3" fill={color} opacity={op * 0.5} />
      {/* Center dot */}
      <Circle cx="20" cy="20" r="2.5" fill={focused ? '#A8D0F0' : color} opacity={op} />
    </Svg>
  );
}

// ─── Report / Compass ────────────────────────────────────
export function CompassIcon({ size = 24, color = '#D4A056', focused }) {
  var s = size;
  var op = focused ? 1 : 0.35;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="compG" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFE8B0" stopOpacity={op} />
          <Stop offset="100%" stopColor={color} stopOpacity={op} />
        </LinearGradient>
      </Defs>
      {/* Outer ring */}
      <Circle cx="20" cy="20" r="16" fill="none" stroke="url(#compG)" strokeWidth="1.8" />
      {/* Tick marks */}
      {[0, 90, 180, 270].map(function (a, i) {
        var rad = (a * Math.PI) / 180;
        return (
          <Line key={i}
            x1={20 + Math.cos(rad) * 13.5} y1={20 + Math.sin(rad) * 13.5}
            x2={20 + Math.cos(rad) * 16} y2={20 + Math.sin(rad) * 16}
            stroke={color} strokeWidth="2" strokeLinecap="round" opacity={op * 0.8} />
        );
      })}
      {/* Compass needle - North (gold) */}
      <Path d="M20 8 L22 20 L18 20 Z" fill={focused ? '#FFD700' : color} opacity={op * 0.9} />
      {/* Compass needle - South (dim) */}
      <Path d="M20 32 L22 20 L18 20 Z" fill={color} opacity={op * 0.35} />
      {/* Center jewel */}
      <Circle cx="20" cy="20" r="2.5" fill={focused ? '#FFE8B0' : color} opacity={op} />
      <Circle cx="20" cy="20" r="1.2" fill="white" opacity={focused ? 0.4 : 0.15} />
      {/* Inner ring */}
      <Circle cx="20" cy="20" r="10" fill="none" stroke={color} strokeWidth="0.5" opacity={op * 0.3} strokeDasharray="2,3" />
    </Svg>
  );
}

// ─── Guide / Sparkle Star ────────────────────────────────
export function GuideIcon({ size = 24, color = '#7B9CC4', focused }) {
  var s = size;
  var op = focused ? 1 : 0.35;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      <Defs>
        <RadialGradient id="guideG" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="white" stopOpacity={focused ? 0.5 : 0.15} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Main 4-point star */}
      <Path d="M20 3 L22.5 16 L36 20 L22.5 24 L20 37 L17.5 24 L4 20 L17.5 16 Z"
        fill="url(#guideG)" stroke={color} strokeWidth="1.2" opacity={op} />
      {/* Inner glow */}
      <Path d="M20 10 L21.5 17.5 L28 20 L21.5 22.5 L20 30 L18.5 22.5 L12 20 L18.5 17.5 Z"
        fill={focused ? '#A8D0F0' : color} opacity={op * 0.4} />
      {/* Small companion stars */}
      <Path d="M32 8 L32.8 11 L35 12 L32.8 13 L32 16 L31.2 13 L29 12 L31.2 11 Z"
        fill={color} opacity={op * 0.5} />
      <Path d="M9 28 L9.6 30 L11 30.5 L9.6 31 L9 33 L8.4 31 L7 30.5 L8.4 30 Z"
        fill={color} opacity={op * 0.4} />
      {/* Center dot */}
      <Circle cx="20" cy="20" r="1.8" fill="white" opacity={focused ? 0.5 : 0.2} />
    </Svg>
  );
}

// ─── Match / Heart ───────────────────────────────────────
export function MatchIcon({ size = 24, color = '#9B8ABF', focused }) {
  var s = size;
  var op = focused ? 1 : 0.35;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="matchG" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E0B0FF" stopOpacity={op} />
          <Stop offset="100%" stopColor={color} stopOpacity={op} />
        </LinearGradient>
        <RadialGradient id="matchGlow" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor="white" stopOpacity={focused ? 0.2 : 0.05} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Orbital ring behind */}
      <Ellipse cx="20" cy="22" rx="15" ry="6" fill="none" stroke={color} strokeWidth="0.6" opacity={op * 0.25} strokeDasharray="3,4" />
      {/* Heart shape */}
      <Path d="M20 34 C14 28, 4 22, 4 14 C4 8, 10 4, 14.5 4 C17 4, 19 6, 20 8 C21 6, 23 4, 25.5 4 C30 4, 36 8, 36 14 C36 22, 26 28, 20 34 Z"
        fill="url(#matchGlow)" stroke="url(#matchG)" strokeWidth="1.5" />
      {/* Inner heart shine */}
      <Path d="M16 12 C16 10, 18 8, 20 10" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity={focused ? 0.3 : 0.1} />
      {/* Sparkle dots */}
      <Circle cx="10" cy="10" r="1" fill={color} opacity={op * 0.4} />
      <Circle cx="31" cy="9" r="0.8" fill={color} opacity={op * 0.3} />
    </Svg>
  );
}

// ─── Aura / Profile ──────────────────────────────────────
export function AuraIcon({ size = 24, color = '#7B9CC4', focused }) {
  var s = size;
  var op = focused ? 1 : 0.35;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40">
      <Defs>
        <RadialGradient id="auraG" cx="50%" cy="40%" r="60%">
          <Stop offset="0%" stopColor="#A8D0F0" stopOpacity={focused ? 0.3 : 0.1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="auraBody" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#A8D0F0" stopOpacity={op} />
          <Stop offset="100%" stopColor={color} stopOpacity={op * 0.7} />
        </LinearGradient>
      </Defs>
      {/* Aura rings */}
      <Circle cx="20" cy="16" r="14" fill="none" stroke={color} strokeWidth="0.5" opacity={op * 0.15} />
      <Circle cx="20" cy="16" r="11" fill="none" stroke={color} strokeWidth="0.6" opacity={op * 0.2} />
      {/* Glow behind head */}
      <Circle cx="20" cy="14" r="10" fill="url(#auraG)" />
      {/* Head */}
      <Circle cx="20" cy="14" r="6" fill="none" stroke="url(#auraBody)" strokeWidth="1.5" />
      {/* Body / shoulders arc */}
      <Path d="M8 36 C8 26, 14 22, 20 22 C26 22, 32 26, 32 36"
        fill="none" stroke="url(#auraBody)" strokeWidth="1.5" />
      {/* Third eye dot */}
      <Circle cx="20" cy="12" r="1.2" fill={focused ? '#A8D0F0' : color} opacity={op * 0.6} />
      {/* Small stars around */}
      {focused && (
        <G>
          <Circle cx="8" cy="10" r="0.8" fill={color} opacity={0.4} />
          <Circle cx="33" cy="12" r="0.6" fill={color} opacity={0.3} />
          <Circle cx="12" cy="6" r="0.5" fill={color} opacity={0.35} />
        </G>
      )}
    </Svg>
  );
}

export var TAB_ICON_MAP = {
  index: SunIcon,
  kendara: ChartIcon,
  report: CompassIcon,
  chat: GuideIcon,
  porondam: MatchIcon,
  profile: AuraIcon,
};
