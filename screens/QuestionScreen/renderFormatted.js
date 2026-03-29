import React from 'react';
import { View, Text } from 'react-native';
import styles from './questionStyles';
import SmartMath from './SmartMath';

// ─── parseFormattedText ───────────────────────────────────────────────────────
// Takes a plain string and returns an array of <Text> elements with bold,
// italic, underline, strikethrough applied where the markup calls for it.
export const parseFormattedText = (text, baseStyle = {}) => {
  if (!text || !text.trim()) return null;

  const BIGGER_SIZE = (baseStyle.fontSize || 16) + 4;

  const patterns = [
    { regex: /\*\*\*(.+?)\*\*\*|<b><i>(.+?)<\/i><\/b>/g, style: { fontWeight: 'bold', fontStyle: 'italic', fontSize: BIGGER_SIZE, color: '#000' } },
    { regex: /\*\*(.+?)\*\*|\*(.+?)\*/g,                  style: { fontWeight: 'bold', fontSize: BIGGER_SIZE, color: '#000' } },
    { regex: /<i>(.+?)<\/i>|_(.+?)_/g,                    style: { fontStyle: 'italic', fontSize: BIGGER_SIZE } },
    { regex: /<u>(.+?)<\/u>/g,                             style: { textDecorationLine: 'underline' } },
    { regex: /<s>(.+?)<\/s>|~~(.+?)~~/g,                  style: { textDecorationLine: 'line-through', opacity: 0.6 } },
  ];

  const allMatches = [];
  patterns.forEach((pattern) => {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      allMatches.push({
        start: match.index,
        end: regex.lastIndex,
        text: match[1] || match[2],
        style: pattern.style,
      });
    }
  });

  allMatches.sort((a, b) => a.start - b.start);

  const segments = [];
  let lastIndex = 0;

  allMatches.forEach((match) => {
    if (match.start < lastIndex) return;
    if (match.start > lastIndex) {
      segments.push({ text: text.substring(lastIndex, match.start), style: {} });
    }
    segments.push({ text: match.text, style: match.style });
    lastIndex = match.end;
  });

  if (lastIndex < text.length) {
    segments.push({ text: text.substring(lastIndex), style: {} });
  }

  if (segments.length === 0) segments.push({ text, style: {} });

  return segments.map((segment, idx) => {
    if (!segment.text) return null;
    return (
      <Text key={idx} style={[styles.passageText, baseStyle, segment.style]}>
        {segment.text}
      </Text>
    );
  });
};

// ─── renderFormattedContent ───────────────────────────────────────────────────
// Splits content on $$...$$ math blocks. Math blocks go to SmartMath,
// everything else goes to parseFormattedText.
export const renderFormattedContent = (content, textStyle = {}) => {
  if (!content) return null;

  const mathParts = content.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <View style={{ flexDirection: 'column' }}>
      {mathParts.map((part, mathIndex) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2);
          return (
            <View key={`math-${mathIndex}`} style={{ marginVertical: 8 }}>
              <SmartMath latex={latex} inline={false} />
            </View>
          );
        }
        return (
          <View key={`text-${mathIndex}`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            {parseFormattedText(part, textStyle)}
          </View>
        );
      })}
    </View>
  );
};

// ─── renderContentWithMath ────────────────────────────────────────────────────
// Inline version — used for question text and answer options.
// Text and math sit side by side in a wrapping row.
export const renderContentWithMath = (content, textStyle = {}) => {
  if (!content) return null;
  const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const latex = part.slice(2, -2);
          return <SmartMath key={`math-${index}`} latex={latex} inline={true} />;
        } else if (part.trim()) {
          return (
            <Text key={`text-${index}`} style={[styles.label, textStyle]}>
              {part}
            </Text>
          );
        }
        return null;
      })}
    </View>
  );
};
