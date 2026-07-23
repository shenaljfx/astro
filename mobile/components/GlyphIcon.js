/**
 * Glyph — the onboarding's hand-drawn gold icon pack. A drop-in replacement for
 * <Ionicons>: same props (name, size, color, style). Fine even-weight line icons
 * in a clean celestial style that reads premium in gold over the shadow-box art.
 * Unknown names fall back to a small star so nothing ever renders blank.
 */
import React from 'react';
import Svg, { Path, Circle, Line, Rect, Ellipse, G, Polyline } from 'react-native-svg';

// Ionicons name → glyph key (so existing name="…" strings keep working)
var ALIAS = {
  'globe-outline': 'globe', 'globe': 'globe',
  'flower-outline': 'lotus', 'flower': 'lotus',
  'sparkles': 'sparkles', 'sparkles-outline': 'sparkles',
  'arrow-forward': 'arrow', 'arrow-forward-outline': 'arrow',
  'chevron-forward': 'chevron', 'chevron-forward-circle': 'chevronCircle',
  'calendar-outline': 'calendar', 'calendar': 'calendar',
  'time-outline': 'clock', 'timer-outline': 'clock',
  'location': 'pin', 'location-outline': 'pin',
  'sunny-outline': 'sun', 'sunny': 'sun',
  'moon-outline': 'moon', 'moon': 'moon',
  'star': 'star', 'star-outline': 'star',
  'hourglass-outline': 'hourglass', 'hourglass': 'hourglass',
  'heart-outline': 'heart', 'heart': 'heart',
  'briefcase-outline': 'briefcase',
  'flame-outline': 'flame', 'flame': 'flame',
  'rocket-outline': 'rocket', 'rocket': 'rocket',
  'eye-outline': 'eye', 'eye': 'eye',
  'eye-off': 'eyeOff', 'eye-off-outline': 'eyeOff',
  'trending-up-outline': 'trend', 'trending-up': 'trend',
  'telescope-outline': 'telescope', 'telescope': 'telescope',
  'gift-outline': 'gift', 'gift': 'gift',
  'lock-closed': 'lock', 'lock-closed-outline': 'lock',
  'lock-open': 'lockOpen', 'lock-open-outline': 'lockOpen',
  'shield-checkmark': 'shield', 'shield-checkmark-outline': 'shield',
  'reload-outline': 'reload', 'reload': 'reload', 'sync-outline': 'reload',
  'planet': 'planet', 'planet-outline': 'planet',
  'medal-outline': 'medal', 'medal': 'medal',
  'alert-circle': 'alert', 'alert-circle-outline': 'alert',
  'cloud-offline-outline': 'cloudOff',
};

// Each glyph: (P) => <>…</>  where P spreads the shared stroke props. viewBox 24.
var G_ = {
  globe: (P) => (<><Circle cx="12" cy="12" r="9" {...P} /><Line x1="3" y1="12" x2="21" y2="12" {...P} /><Ellipse cx="12" cy="12" rx="3.6" ry="9" {...P} /></>),
  lotus: (P) => (<><Path d="M12 4c-1.6 3.3-1.6 9 0 13 1.6-4 1.6-9.7 0-13Z" {...P} /><Path d="M12 17C9 16.4 6.6 13.8 6 10.2c2.6 1.9 5 4.2 6 6.8Z" {...P} /><Path d="M12 17c3-.6 5.4-3.2 6-6.8-2.6 1.9-5 4.2-6 6.8Z" {...P} /><Path d="M12 17c-2.7.2-6.6-1-8.4-3.4 3.1-.3 6.3.8 8.4 3.4Z" {...P} /><Path d="M12 17c2.7.2 6.6-1 8.4-3.4-3.1-.3-6.3.8-8.4 3.4Z" {...P} /></>),
  sparkles: (P) => (<><Path d="M9.5 4.5l1.4 4.1 4.1 1.4-4.1 1.4-1.4 4.1-1.4-4.1L4 10l4.1-1.4z" {...P} /><Path d="M17 13.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" {...P} /></>),
  arrow: (P) => (<><Line x1="4" y1="12" x2="19" y2="12" {...P} /><Path d="M13 6l6 6-6 6" {...P} /></>),
  chevron: (P) => (<Path d="M9 6l6 6-6 6" {...P} />),
  chevronCircle: (P) => (<><Circle cx="12" cy="12" r="9" {...P} /><Path d="M10.5 8.5l3.5 3.5-3.5 3.5" {...P} /></>),
  calendar: (P) => (<><Rect x="3.5" y="5" width="17" height="15.5" rx="2.5" {...P} /><Line x1="3.5" y1="9.5" x2="20.5" y2="9.5" {...P} /><Line x1="8" y1="3" x2="8" y2="6.5" {...P} /><Line x1="16" y1="3" x2="16" y2="6.5" {...P} /></>),
  clock: (P) => (<><Circle cx="12" cy="12" r="9" {...P} /><Path d="M12 7.5V12l3.2 2" {...P} /></>),
  pin: (P) => (<><Path d="M12 21.5s-6.5-6.7-6.5-11a6.5 6.5 0 0 1 13 0c0 4.3-6.5 11-6.5 11Z" {...P} /><Circle cx="12" cy="10.3" r="2.4" {...P} /></>),
  sun: (P) => (<><Circle cx="12" cy="12" r="4" {...P} /><Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" {...P} /></>),
  moon: (P) => (<Path d="M20.5 14.5A8.5 8.5 0 1 1 10 3.8a6.6 6.6 0 0 0 10.5 10.7Z" {...P} />),
  star: (P) => (<Path d="M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9z" {...P} />),
  hourglass: (P) => (<><Line x1="6" y1="3" x2="18" y2="3" {...P} /><Line x1="6" y1="21" x2="18" y2="21" {...P} /><Path d="M7 3c0 5.5 5 6.2 5 9 0-2.8 5-3.5 5-9" {...P} /><Path d="M7 21c0-5.5 5-6.2 5-9 0 2.8 5 3.5 5 9" {...P} /></>),
  heart: (P) => (<Path d="M12 20S4 14.5 4 8.9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.9C20 14.5 12 20 12 20Z" {...P} />),
  briefcase: (P) => (<><Rect x="3" y="7.5" width="18" height="12.5" rx="2.2" {...P} /><Path d="M8.5 7.5V5.8A2 2 0 0 1 10.5 3.8h3A2 2 0 0 1 15.5 5.8V7.5" {...P} /><Line x1="3" y1="12.5" x2="21" y2="12.5" {...P} /></>),
  flame: (P) => (<Path d="M12 3s5 4.4 5 9a5 5 0 0 1-10 0c0-1.7 1-3 1-3 .3 1 1.2 1.6 2 1.6 0-2.2-1-3.4 2-7.6z" {...P} />),
  rocket: (P) => (<><Path d="M12 3c3 3 4 6.5 4 10l-8 0c0-3.5 1-7 4-10Z" {...P} /><Circle cx="12" cy="9" r="1.6" {...P} /><Path d="M8 13l-2 4M16 13l2 4M10 19.5c1-1.5 3-1.5 4 0" {...P} /></>),
  eye: (P) => (<><Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" {...P} /><Circle cx="12" cy="12" r="3" {...P} /></>),
  eyeOff: (P) => (<><Path d="M6.2 6.6C3.9 8.2 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.8-.4 3.9-1M17.6 15.2C20 13.6 21.5 12 21.5 12S18 5.5 12 5.5c-.7 0-1.4.1-2 .3" {...P} /><Path d="M9.8 9.9a3 3 0 0 0 4.3 4.2" {...P} /><Line x1="4" y1="4" x2="20" y2="20" {...P} /></>),
  trend: (P) => (<><Polyline points="3,16 9,10 13,14 21,6" {...P} /><Path d="M15.5 6H21v5.5" {...P} /></>),
  telescope: (P) => (<><Path d="M3.5 15l10.5-7 2 3-10.5 7z" {...P} /><Path d="M14 8l3.5-2.4 1.6 2.4" {...P} /><Path d="M9 15l-1 6M11.5 14l4 7" {...P} /></>),
  gift: (P) => (<><Rect x="3.5" y="9" width="17" height="11.5" rx="1.5" {...P} /><Line x1="3.5" y1="13" x2="20.5" y2="13" {...P} /><Line x1="12" y1="9" x2="12" y2="20.5" {...P} /><Path d="M12 9C10 9 8 7.4 9 5.6 9.8 4.2 12 6 12 9c0-3 2.2-4.8 3-3.4 1 1.8-1 3.4-3 3.4Z" {...P} /></>),
  lock: (P) => (<><Rect x="5" y="11" width="14" height="9.5" rx="2.2" {...P} /><Path d="M8 11V8a4 4 0 0 1 8 0v3" {...P} /></>),
  lockOpen: (P) => (<><Rect x="5" y="11" width="14" height="9.5" rx="2.2" {...P} /><Path d="M8 11V8a4 4 0 0 1 7.7-1.5" {...P} /></>),
  shield: (P) => (<><Path d="M12 3l8 3v5.2c0 5-3.6 8.5-8 9.8-4.4-1.3-8-4.8-8-9.8V6z" {...P} /><Path d="M8.8 12l2.2 2.2 4.2-4.4" {...P} /></>),
  reload: (P) => (<><Path d="M20 12a8 8 0 1 1-2.4-5.7" {...P} /><Path d="M20 4v4.2h-4.2" {...P} /></>),
  planet: (P) => (<><Circle cx="12" cy="11.5" r="5.2" {...P} /><G rotation="-22" origin="12,11.5"><Ellipse cx="12" cy="11.5" rx="9.4" ry="3.1" {...P} /></G></>),
  medal: (P) => (<><Path d="M8.5 3l2 5M15.5 3l-2 5" {...P} /><Circle cx="12" cy="15" r="5" {...P} /><Path d="M12 12.5l1 2 2 .2-1.5 1.4.4 2L12 17.2 10.1 18l.4-2L9 14.7l2-.2z" {...P} /></>),
  alert: (P) => (<><Circle cx="12" cy="12" r="9" {...P} /><Line x1="12" y1="7.5" x2="12" y2="13" {...P} /><Circle cx="12" cy="16.3" r="0.6" fill={P.stroke} stroke="none" /></>),
  cloudOff: (P) => (<><Path d="M7 18h9a3.5 3.5 0 0 0 .8-6.9A5 5 0 0 0 8.4 8.6" {...P} /><Path d="M7 18a3.5 3.5 0 0 1-.9-6.9" {...P} /><Line x1="3.5" y1="4" x2="20.5" y2="20.5" {...P} /></>),
};

export default function Glyph({ name, size, color, style }) {
  var key = ALIAS[name] || (G_[name] ? name : 'star');
  var s = size || 22;
  var col = color || '#E8B54D';
  var P = { fill: 'none', stroke: col, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  var draw = G_[key] || G_.star;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" style={style}>
      {draw(P)}
    </Svg>
  );
}
