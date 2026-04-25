import { boxShadow, textShadow } from '../../utils/shadow';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function SectionHeader({
  title,
  subtitle,
  icon,
  delay = 0,
  style,
}) {
  var { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={[styles.container, style]}
    >
      <View style={styles.row}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    ...Typography.title3,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginTop: 12,
  },
});
