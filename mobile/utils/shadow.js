/**
 * Cross-platform shadow utility for React Native + Web
 *
 * react-native-web deprecated individual shadow* style props in favour of
 * the CSS `boxShadow` shorthand and the `textShadow` shorthand.
 *
 * Usage:
 *   import { boxShadow, textShadow } from '../utils/shadow';
 *
 *   const styles = StyleSheet.create({
 *     card: {
 *       ...boxShadow('#FF8C00', { width: 0, height: 4 }, 0.7, 18),
 *       elevation: 6,
 *     },
 *     title: {
 *       ...textShadow('rgba(255,184,0,0.3)', { width: 0, height: 2 }, 8),
 *     },
 *   });
 */
import { Platform } from 'react-native';

/**
 * Generate cross-platform box shadow styles.
 * On web, outputs `boxShadow` CSS string. On native, outputs individual shadow* props.
 *
 * @param {string} color - shadow colour (hex or rgba)
 * @param {{ width: number, height: number }} offset
 * @param {number} opacity - 0–1
 * @param {number} radius - blur radius
 * @returns {object} style object
 */
export function boxShadow(color, offset = { width: 0, height: 4 }, opacity = 0.5, radius = 10) {
  if (Platform.OS === 'web') {
    // Parse colour to inject opacity
    var c = _colorWithOpacity(color, opacity);
    return {
      boxShadow: offset.width + 'px ' + offset.height + 'px ' + radius + 'px ' + c,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
  };
}

/**
 * Generate cross-platform text shadow styles.
 * On web, outputs `textShadow` CSS string. On native, outputs individual textShadow* props.
 *
 * @param {string} color - shadow colour
 * @param {{ width: number, height: number }} offset
 * @param {number} radius - blur radius
 * @returns {object} style object
 */
export function textShadow(color, offset = { width: 0, height: 0 }, radius = 8) {
  if (Platform.OS === 'web') {
    return {
      textShadow: offset.width + 'px ' + offset.height + 'px ' + radius + 'px ' + color,
    };
  }
  return {
    textShadowColor: color,
    textShadowOffset: offset,
    textShadowRadius: radius,
  };
}

/**
 * Internal: inject opacity into a colour string.
 * If the colour is already rgba, we multiply the existing alpha by opacity.
 * If hex, we convert to rgba.
 */
function _colorWithOpacity(color, opacity) {
  if (!color) return 'rgba(0,0,0,' + opacity + ')';

  // Already rgba — extract and multiply alpha
  var rgbaMatch = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    var existingAlpha = rgbaMatch[4] != null ? parseFloat(rgbaMatch[4]) : 1;
    return 'rgba(' + rgbaMatch[1] + ',' + rgbaMatch[2] + ',' + rgbaMatch[3] + ',' + (existingAlpha * opacity).toFixed(3) + ')';
  }

  // 3-digit hex
  var hex3 = color.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (hex3) {
    var r = parseInt(hex3[1] + hex3[1], 16);
    var g = parseInt(hex3[2] + hex3[2], 16);
    var b = parseInt(hex3[3] + hex3[3], 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
  }

  // 6-digit hex
  var hex6 = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex6) {
    var r2 = parseInt(hex6[1], 16);
    var g2 = parseInt(hex6[2], 16);
    var b2 = parseInt(hex6[3], 16);
    return 'rgba(' + r2 + ',' + g2 + ',' + b2 + ',' + opacity + ')';
  }

  // Fallback — just use colour as-is with opacity note
  return color;
}
