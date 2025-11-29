import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import Katex from 'react-native-katex';

export default function MathTestScreen() {
  const [loaded, setLoaded] = useState(false);

  // Mixed content strings: We put Text and Math together in one variable.
  // We use $$ to mark the start and end of the math section so we can separate it later.
  const mixedVerticalAddition = `Vertical Addition: $$\\begin{array}{r}2313_{x} \\\\ + 1013_{x} \\\\ + 2131_{x} \\\\ \\hline 11012_{x}\\end{array}$$, Yes it works! `;
  
  const mixedQuadratic = `Quadratic Formula: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$`;

  // Helper function to separate Text from Math
  const renderMixedContent = (content) => {
    // Split the string by the $$ delimiters
    const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);

    return parts.map((part, index) => {
      // If part starts/ends with $$, it's Math
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const mathExpression = part.slice(2, -2); // Remove the $$
        return (
          <View key={index} style={styles.mathContainer}>
            <Katex
                expression={mathExpression}
                style={styles.katex}
                inlineStyle={inlineStyle}
                displayMode={true}
                throwOnError={false}
                onLoad={() => setLoaded(true)}
            />
          </View>
        );
      } 
      // Otherwise, it's regular Text
      else if (part.trim()) {
        return (
          <Text key={index} style={styles.label}>
            {part.trim()}
          </Text>
        );
      }
      return null;
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Render the mixed content */}
      <View style={styles.section}>
        {renderMixedContent(mixedVerticalAddition)}
      </View>

      <View style={styles.separator} />

      <View style={styles.section}>
        {renderMixedContent(mixedQuadratic)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 50,
  },
  section: {
    marginBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  mathContainer: {
    // Give the container a minimum height to ensure it's visible
    minHeight: 120, 
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    marginTop: 5,
  },
  katex: {
    flex: 1,
    minHeight: 120,
  }
});

const inlineStyle = `
html, body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 10px;
  background-color: transparent;
}
.katex {
  font-size: 20px;
  text-align: center;
  color: #000;
}
`;