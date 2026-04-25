/**
 * <Stack> / <Inline> — flex layout helpers using Spacing tokens.
 *
 * Removes the inline gap literals scattered everywhere. Use
 * <Stack gap='md'> instead of <View style={{ gap: 16 }}>.
 */

import React from 'react';
import { View } from 'react-native';
import { Spacing } from '../../constants/theme';

function resolveGap(gap) {
  if (typeof gap === 'number') return gap;
  if (typeof gap === 'string' && Spacing[gap] != null) return Spacing[gap];
  return Spacing.md;
}

export function Stack(props) {
  var style = {
    flexDirection: 'column',
    gap: resolveGap(props.gap),
    alignItems: props.align,
    justifyContent: props.justify,
  };
  return <View style={[style, props.style]}>{props.children}</View>;
}

export function Inline(props) {
  var style = {
    flexDirection: 'row',
    gap: resolveGap(props.gap),
    alignItems: props.align == null ? 'center' : props.align,
    justifyContent: props.justify,
    flexWrap: props.wrap ? 'wrap' : 'nowrap',
  };
  return <View style={[style, props.style]}>{props.children}</View>;
}

export default { Stack: Stack, Inline: Inline };
