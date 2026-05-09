import { boxShadow, textShadow } from '../../utils/shadow';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function SectionHeader({
  title,
  subtitle,
  icon,
  iconName,
  iconColor,
  delay = 0,
  style,
}) {
  var { colors } = useTheme();
  var resolvedIconColor = iconColor || colors.accent || '#DAA520';
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={[styles.container, style]}
    >
      <View style={styles.row}>
        {iconName ? (
          <View style={[styles.iconBadge, { borderColor: resolvedIconColor + '44', backgroundColor: resolvedIconColor + '14' }]}>
            <Ionicons name={iconName} size={15} color={resolvedIconColor} />
          </View>
        ) : icon ? <Text style={styles.icon}>{icon}</Text> : null}
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
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
