/**
 * Lightweight Markdown renderer for React Native
 * Supports: **bold**, *italic*, ## headings, - bullet lists,
 * numbered lists, --- dividers, > blockquotes, and emoji.
 * No external dependencies beyond react-native.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Parse inline markdown (**bold**, *italic*) into Text elements
 */
function parseInline(text, baseStyle) {
  if (!text) return null;
  var parts = [];
  // Match ***bolditalic***, **bold**, *italic* — non-greedy, single line
  var regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*]+?)\*)/g;
  var lastIndex = 0;
  var match;
  var key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<Text key={'t' + key++} style={baseStyle}>{text.slice(lastIndex, match.index)}</Text>);
    }
    if (match[2]) {
      parts.push(<Text key={'t' + key++} style={[baseStyle, styles.boldItalic]}>{match[2]}</Text>);
    } else if (match[3]) {
      parts.push(<Text key={'t' + key++} style={[baseStyle, styles.bold]}>{match[3]}</Text>);
    } else if (match[4]) {
      parts.push(<Text key={'t' + key++} style={[baseStyle, styles.italic]}>{match[4]}</Text>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<Text key={'t' + key++} style={baseStyle}>{text.slice(lastIndex)}</Text>);
  }
  if (parts.length === 0) {
    return <Text style={baseStyle}>{text}</Text>;
  }
  return parts;
}

/**
 * MarkdownText component
 * @param {string} children - the markdown string to render
 * @param {object} style - additional container style
 */
export default function MarkdownText({ children, style }) {
  // Fallback: if not a string, render as plain text
  if (!children) return null;
  var raw = typeof children === 'string' ? children : String(children);

  var text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var lines = text.split('\n');
  var elements = [];
  var k = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    // Empty line → spacer
    if (trimmed === '') {
      elements.push(<View key={k++} style={styles.spacer} />);
      continue;
    }

    // --- Horizontal divider
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<View key={k++} style={styles.divider} />);
      continue;
    }

    // ### Heading 3
    if (/^###\s+/.test(trimmed)) {
      elements.push(
        <Text key={k++} style={styles.h3}>{parseInline(trimmed.replace(/^###\s+/, ''), styles.h3)}</Text>
      );
      continue;
    }

    // ## Heading 2
    if (/^##\s+/.test(trimmed)) {
      elements.push(
        <View key={k++} style={styles.h2Wrap}>
          <Text style={styles.h2}>{parseInline(trimmed.replace(/^##\s+/, ''), styles.h2)}</Text>
          <View style={styles.h2Line} />
        </View>
      );
      continue;
    }

    // # Heading 1
    if (/^#\s+/.test(trimmed)) {
      elements.push(
        <View key={k++} style={styles.h1Wrap}>
          <Text style={styles.h1}>{parseInline(trimmed.replace(/^#\s+/, ''), styles.h1)}</Text>
          <View style={styles.h1Line} />
        </View>
      );
      continue;
    }

    // > Blockquote
    if (/^>\s*/.test(trimmed)) {
      elements.push(
        <View key={k++} style={styles.blockquote}>
          <View style={styles.bqBar} />
          <Text style={styles.bqText}>{parseInline(trimmed.replace(/^>\s*/, ''), styles.bqText)}</Text>
        </View>
      );
      continue;
    }

    // Bullet list: - item or * item or • item
    // But NOT ** (bold) — only match single * followed by space
    if (/^[-•]\s+/.test(trimmed) || /^\*\s+/.test(trimmed)) {
      var bulletContent = trimmed.replace(/^[-•*]\s+/, '');
      elements.push(
        <View key={k++} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>{'\u2726'}</Text>
          <Text style={styles.bulletText}>{parseInline(bulletContent, styles.bulletTextInline)}</Text>
        </View>
      );
      continue;
    }

    // Numbered list: 1. or 1)
    var numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      elements.push(
        <View key={k++} style={styles.bulletRow}>
          <View style={styles.numBadge}>
            <Text style={styles.numText}>{numMatch[1]}</Text>
          </View>
          <Text style={styles.bulletText}>{parseInline(numMatch[2], styles.bulletTextInline)}</Text>
        </View>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={k++} style={styles.para}>{parseInline(trimmed, styles.paraInline)}</Text>
    );
  }

  return <View style={style}>{elements}</View>;
}

var styles = StyleSheet.create({
  spacer: { height: 8 },

  // Divider
  divider: {
    height: 1, marginVertical: 16, marginHorizontal: 8,
    backgroundColor: 'rgba(192,132,252,0.2)',
  },

  // Heading 1
  h1Wrap: { marginTop: 20, marginBottom: 10 },
  h1: { fontSize: 22, fontWeight: '900', color: '#f0e7ff', letterSpacing: -0.3 },
  h1Line: { height: 2, backgroundColor: 'rgba(192,38,211,0.4)', borderRadius: 1, marginTop: 6, width: '60%' },

  // Heading 2
  h2Wrap: { marginTop: 18, marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '800', color: '#e0d4fc', letterSpacing: -0.2 },
  h2Line: { height: 1.5, backgroundColor: 'rgba(192,38,211,0.3)', borderRadius: 1, marginTop: 5, width: '40%' },

  // Heading 3
  h3: { fontSize: 16, fontWeight: '700', color: '#d4bffc', marginTop: 14, marginBottom: 6 },

  // Paragraph
  para: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 23, marginBottom: 4 },
  paraInline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 23 },

  // Inline styles
  bold: { fontWeight: '800', color: '#f0e7ff' },
  italic: { fontStyle: 'italic', color: 'rgba(224,211,252,0.9)' },
  boldItalic: { fontWeight: '800', fontStyle: 'italic', color: '#f0e7ff' },

  // Bullet list
  bulletRow: { flexDirection: 'row', paddingLeft: 4, marginBottom: 6, alignItems: 'flex-start' },
  bulletDot: { color: '#c084fc', fontSize: 11, marginRight: 10, marginTop: 4, width: 16, textAlign: 'center' },
  bulletText: { flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22 },
  bulletTextInline: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 22 },

  // Numbered list
  numBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(192,38,211,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2,
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.2)',
  },
  numText: { color: '#c084fc', fontSize: 11, fontWeight: '800' },

  // Blockquote
  blockquote: {
    flexDirection: 'row', marginVertical: 8, paddingVertical: 10,
    paddingHorizontal: 14, backgroundColor: 'rgba(192,38,211,0.06)',
    borderRadius: 10,
  },
  bqBar: { width: 3, backgroundColor: '#c026d3', borderRadius: 2, marginRight: 12 },
  bqText: { flex: 1, color: 'rgba(224,211,252,0.9)', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});
