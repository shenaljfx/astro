/**
 * Cross-platform shadow utility for React Native + Web.
 *
 * React Native Web (v0.19+) deprecated the `shadow*` / `textShadow*` shorthand
 * props in favour of the CSS `boxShadow` / `textShadow` strings.
 * This helper emits both formats so the style works everywhere without warnings.
 *
 * Usage:
 *   import { boxShadow, textShadow } from '../utils/shadow';
 *   <View style={[myStyle, boxShadow('#000', 0, 4, 12, 0.3)]} />
 *   <Text style={[myStyle, textShadow('rgba(0,0,0,0.5)', 0, 2, 10)]} />
 */
var { Platform } = require('react-native');

/**
 * @param {string} color   – shadow colour (hex / rgba)
 * @param {number} [ox=0]  – horizontal offset
 * @param {number} [oy=0]  – vertical offset
 * @param {number} [radius=10] – blur radius
 * @param {number} [opacity=1] – shadow opacity (native only; bake into color for web)
 * @param {number} [elevation] – Android elevation (defaults to radius * 0.5)
 * @returns {object} style object
 */
function boxShadow(color, ox, oy, radius, opacity, elevation) {
  if (ox === undefined) ox = 0;
  if (oy === undefined) oy = 0;
  if (radius === undefined) radius = 10;
  if (opacity === undefined) opacity = 1;
  if (elevation === undefined) elevation = Math.round(radius * 0.5);

  if (Platform.OS === 'web') {
    // Convert hex + opacity to rgba for web boxShadow string
    var webColor = _toRgba(color, opacity);
    return { boxShadow: ox + 'px ' + oy + 'px ' + radius + 'px ' + webColor };
  }

  return {
    shadowColor: color,
    shadowOffset: { width: ox, height: oy },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: elevation,
  };
}

/**
 * @param {string} color  – text shadow colour (hex / rgba)
 * @param {number} [ox=0] – horizontal offset
 * @param {number} [oy=0] – vertical offset
 * @param {number} [radius=8] – blur radius
 * @returns {object} style object
 */
function textShadow(color, ox, oy, radius) {
  if (ox === undefined) ox = 0;
  if (oy === undefined) oy = 0;
  if (radius === undefined) radius = 8;

  if (Platform.OS === 'web') {
    return { textShadow: ox + 'px ' + oy + 'px ' + radius + 'px ' + color };
  }

  return {
    textShadowColor: color,
    textShadowOffset: { width: ox, height: oy },
    textShadowRadius: radius,
  };
}

/* ── internal ────────────────────────────────────────────────── */

function _toRgba(color, opacity) {
  if (opacity >= 1 && color.indexOf('rgba') === 0) return color;
  if (color.indexOf('rgba') === 0) {
    // Already rgba – multiply alpha
    return color.replace(/,\s*[\d.]+\)/, ', ' + opacity + ')');
  }
  if (color.indexOf('rgb(') === 0) {
    return color.replace('rgb(', 'rgba(').replace(')', ', ' + opacity + ')');
  }
  // Hex
  var hex = color.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
}

module.exports = { boxShadow: boxShadow, textShadow: textShadow };
