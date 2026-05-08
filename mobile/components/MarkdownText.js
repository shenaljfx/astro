/**
 * Lightweight Markdown renderer for React Native — Enhanced Edition
 * Supports: **bold**, *italic*, ## headings, - bullet lists,
 * numbered lists, --- dividers, > blockquotes, > 💡/🔥/⚠️ callouts,
 * and emoji. No external dependencies beyond react-native.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Parse inline markdown (**bold**, *italic*) into Text elements
 */
function parseInline(text, baseStyle, inlineStyles) {
  if (!text) return null;
  var inline = inlineStyles || styles;
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
      parts.push(<Text key={'t' + key++} style={[baseStyle, inline.boldItalic]}>{match[2]}</Text>);
    } else if (match[3]) {
      parts.push(<Text key={'t' + key++} style={[baseStyle, inline.bold]}>{match[3]}</Text>);
    } else if (match[4]) {
      parts.push(<Text key={'t' + key++} style={[baseStyle, inline.italic]}>{match[4]}</Text>);
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
export default function MarkdownText({ children, style, variant }) {
  // Fallback: if not a string, render as plain text
  if (!children) return null;
  var raw = typeof children === 'string' ? children : String(children);
  var md = variant === 'report' || variant === 'readable' ? readableStyles : styles;

  var text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  var lines = text.split('\n');
  var elements = [];
  var k = 0;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();

    // Empty line → spacer
    if (trimmed === '') {
      elements.push(<View key={k++} style={md.spacer} />);
      continue;
    }

    // --- Horizontal divider
    if (/^[-*_]{3,}$/.test(trimmed)) {
      elements.push(<View key={k++} style={md.divider} />);
      continue;
    }

    // ### Heading 3
    if (/^###\s+/.test(trimmed)) {
      elements.push(
        <Text key={k++} style={md.h3}>{parseInline(trimmed.replace(/^###\s+/, ''), md.h3, md)}</Text>
      );
      continue;
    }

    // ## Heading 2
    if (/^##\s+/.test(trimmed)) {
      elements.push(
        <View key={k++} style={md.h2Wrap}>
          <Text style={md.h2}>{parseInline(trimmed.replace(/^##\s+/, ''), md.h2, md)}</Text>
          <View style={md.h2Line} />
        </View>
      );
      continue;
    }

    // # Heading 1
    if (/^#\s+/.test(trimmed)) {
      elements.push(
        <View key={k++} style={md.h1Wrap}>
          <Text style={md.h1}>{parseInline(trimmed.replace(/^#\s+/, ''), md.h1, md)}</Text>
          <View style={md.h1Line} />
        </View>
      );
      continue;
    }

    // > Blockquote — with callout detection
    if (/^>\s*/.test(trimmed)) {
      var bqContent = trimmed.replace(/^>\s*/, '');
      // Detect callout type from leading emoji
      var calloutType = 'default';
      if (/^[🔥💡⚠️⭐✨🎯💎❤️💪🍀💰💼💍]/.test(bqContent)) {
        calloutType = 'highlight';
      } else if (/^[⛔❌🚫]/.test(bqContent)) {
        calloutType = 'warning';
      }
      var bqColors = calloutType === 'highlight'
        ? { bar: '#FFB800', bg: 'rgba(255,184,0,0.08)', border: 'rgba(255,184,0,0.15)' }
        : calloutType === 'warning'
        ? { bar: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' }
        : { bar: '#D4A020', bg: 'rgba(255,184,0,0.06)', border: 'rgba(255,184,0,0.10)' };
      elements.push(
        <View key={k++} style={[md.blockquote, { backgroundColor: bqColors.bg, borderColor: bqColors.border, borderWidth: 1 }]}>
          <View style={[md.bqBar, { backgroundColor: bqColors.bar }]} />
          <Text style={[md.bqText, calloutType === 'highlight' && { color: variant === 'report' || variant === 'readable' ? '#FFF8EA' : '#FFE8B0' }]}>{parseInline(bqContent, md.bqText, md)}</Text>
        </View>
      );
      continue;
    }

    // Bullet list: - item or * item or • item
    // But NOT ** (bold) — only match single * followed by space
    if (/^[-•]\s+/.test(trimmed) || /^\*\s+/.test(trimmed)) {
      var bulletContent = trimmed.replace(/^[-•*]\s+/, '');
      elements.push(
        <View key={k++} style={md.bulletRow}>
          <Text style={md.bulletDot}>{'\u2726'}</Text>
          <Text style={md.bulletText}>{parseInline(bulletContent, md.bulletTextInline, md)}</Text>
        </View>
      );
      continue;
    }

    // Numbered list: 1. or 1)
    var numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numMatch) {
      elements.push(
        <View key={k++} style={md.bulletRow}>
          <View style={md.numBadge}>
            <Text style={md.numText}>{numMatch[1]}</Text>
          </View>
          <Text style={md.bulletText}>{parseInline(numMatch[2], md.bulletTextInline, md)}</Text>
        </View>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <Text key={k++} style={md.para}>{parseInline(trimmed, md.paraInline, md)}</Text>
    );
  }

  return <View style={style}>{elements}</View>;
}

var styles = StyleSheet.create({
  spacer: { height: 8 },

  // Divider — enhanced with gradient feel
  divider: {
    height: 1, marginVertical: 18, marginHorizontal: 8,
    backgroundColor: 'rgba(255,184,0,0.15)',
  },

  // Heading 1 — dramatic reveal
  h1Wrap: { marginTop: 22, marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: '900', color: '#FFE8A0', letterSpacing: -0.3 },
  h1Line: { height: 2.5, backgroundColor: 'rgba(255,184,0,0.45)', borderRadius: 1.5, marginTop: 6, width: '60%' },

  // Heading 2 — section anchors
  h2Wrap: { marginTop: 20, marginBottom: 10 },
  h2: { fontSize: 18, fontWeight: '800', color: '#FFD98E', letterSpacing: -0.2 },
  h2Line: { height: 2, backgroundColor: 'rgba(255,184,0,0.30)', borderRadius: 1, marginTop: 5, width: '40%' },

  // Heading 3
  h3: { fontSize: 16, fontWeight: '700', color: '#FBBF24', marginTop: 16, marginBottom: 8 },

  // Paragraph — improved readability
  para: { color: 'rgba(255,241,208,0.88)', fontSize: 14.5, lineHeight: 24, marginBottom: 6 },
  paraInline: { color: 'rgba(255,241,208,0.88)', fontSize: 14.5, lineHeight: 24 },

  // Inline styles — punchier
  bold: { fontWeight: '800', color: '#FFE8A0' },
  italic: { fontStyle: 'italic', color: 'rgba(255,220,160,0.9)' },
  boldItalic: { fontWeight: '800', fontStyle: 'italic', color: '#FFE8A0' },

  // Bullet list — enhanced with better spacing
  bulletRow: { flexDirection: 'row', paddingLeft: 4, marginBottom: 8, alignItems: 'flex-start' },
  bulletDot: { color: '#FBBF24', fontSize: 11, marginRight: 10, marginTop: 5, width: 16, textAlign: 'center' },
  bulletText: { flex: 1, color: 'rgba(255,241,208,0.88)', fontSize: 14, lineHeight: 23 },
  bulletTextInline: { color: 'rgba(255,241,208,0.88)', fontSize: 14, lineHeight: 23 },

  // Numbered list — badge style
  numBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,184,0,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 2,
    borderWidth: 1, borderColor: 'rgba(255,184,0,0.22)',
  },
  numText: { color: '#FBBF24', fontSize: 11, fontWeight: '800' },

  // Blockquote — callout style
  blockquote: {
    flexDirection: 'row', marginVertical: 10, paddingVertical: 12,
    paddingHorizontal: 14, backgroundColor: 'rgba(255,184,0,0.06)',
    borderRadius: 12,
  },
  bqBar: { width: 3, backgroundColor: '#D4A020', borderRadius: 2, marginRight: 12 },
  bqText: { flex: 1, color: 'rgba(255,220,160,0.9)', fontSize: 14, lineHeight: 23, fontStyle: 'italic' },
});

var readableStyles = StyleSheet.create({
  spacer: { height: 10 },

  divider: {
    height: 1, marginVertical: 20, marginHorizontal: 2,
    backgroundColor: 'rgba(218,165,86,0.22)',
  },

  h1Wrap: { marginTop: 24, marginBottom: 14 },
  h1: { fontSize: 24, fontWeight: '900', color: '#FFF6DC', letterSpacing: 0, lineHeight: 31 },
  h1Line: { height: 3, backgroundColor: 'rgba(218,165,86,0.55)', borderRadius: 2, marginTop: 8, width: '54%' },

  h2Wrap: { marginTop: 22, marginBottom: 12 },
  h2: { fontSize: 19, fontWeight: '800', color: '#FFE7AA', letterSpacing: 0, lineHeight: 26 },
  h2Line: { height: 2, backgroundColor: 'rgba(218,165,86,0.40)', borderRadius: 1, marginTop: 7, width: '38%' },

  h3: { fontSize: 16.5, fontWeight: '800', color: '#F7D38B', marginTop: 18, marginBottom: 9, lineHeight: 23 },

  para: { color: '#F8EED8', fontSize: 15.5, lineHeight: 27, marginBottom: 9, letterSpacing: 0 },
  paraInline: { color: '#F8EED8', fontSize: 15.5, lineHeight: 27, letterSpacing: 0 },

  bold: { fontWeight: '900', color: '#FFF8EA' },
  italic: { fontStyle: 'italic', color: '#EBD8B3' },
  boldItalic: { fontWeight: '900', fontStyle: 'italic', color: '#FFF8EA' },

  bulletRow: { flexDirection: 'row', paddingLeft: 2, marginBottom: 11, alignItems: 'flex-start' },
  bulletDot: { color: '#D9A856', fontSize: 12, marginRight: 10, marginTop: 6, width: 17, textAlign: 'center' },
  bulletText: { flex: 1, color: '#F8EED8', fontSize: 15.25, lineHeight: 26 },
  bulletTextInline: { color: '#F8EED8', fontSize: 15.25, lineHeight: 26, letterSpacing: 0 },

  numBadge: {
    width: 25, height: 25, borderRadius: 12.5, backgroundColor: 'rgba(218,165,86,0.16)',
    alignItems: 'center', justifyContent: 'center', marginRight: 11, marginTop: 2,
    borderWidth: 1, borderColor: 'rgba(218,165,86,0.35)',
  },
  numText: { color: '#F7D38B', fontSize: 11, fontWeight: '900' },

  blockquote: {
    flexDirection: 'row', marginVertical: 12, paddingVertical: 14,
    paddingHorizontal: 15, borderRadius: 12,
  },
  bqBar: { width: 3, backgroundColor: '#D9A856', borderRadius: 2, marginRight: 12 },
  bqText: { flex: 1, color: '#EBD8B3', fontSize: 15, lineHeight: 25, fontStyle: 'italic' },
});
