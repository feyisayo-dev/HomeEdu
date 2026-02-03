import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

// 1. THE DATA (Your exact JSON)
const QUIZ_DATA = {
  "Subtopic": "Conversion from base 10",
  "Generated_Questions": [
    {
      "content": "Convert 11011.01\u2082 to base 10.",
      "options": [
        "27.25",
        "27.5",
        "26.25",
        "26.5"
      ],
      "answer": "27.25",
      "narration": "11011.01\u2082 = (1 * 2\u2074) + (1 * 2\u00b3) + (0 * 2\u00b2) + (1 * 2\u00b9) + (1 * 2\u2070) + (0 * 2\u207b\u00b9) + (1 * 2\u207b\u00b2) = 16 + 8 + 0 + 2 + 1 + 0 + 0.25 = 27.25",
      "narration_payload": [
        {
          "type": "text",
          "value": "11011.01\u2082 = (1 * 2\u2074) + (1 * 2\u00b3) + (0 * 2\u00b2) + (1 * 2\u00b9) + (1 * 2\u2070) + (0 * 2\u207b\u00b9) + (1 * 2\u207b\u00b2) = 16 + 8 + 0 + 2 + 1 + 0 + 0.25 = 27.25"
        }
      ]
    },
    {
      "content": "What is the decimal equivalent of 345\u2088?",
      "options": [
        "229",
        "227",
        "230",
        "221"
      ],
      "answer": "229",
      "narration": "345\u2088 = (3 * 8\u00b2) + (4 * 8\u00b9) + (5 * 8\u2070) = (3 * 64) + (4 * 8) + (5 * 1) = 192 + 32 + 5 = 229",
      "narration_payload": [
        {
          "type": "text",
          "value": "345\u2088 = (3 * 8\u00b2) + (4 * 8\u00b9) + (5 * 8\u2070) = (3 * 64) + (4 * 8) + (5 * 1) = 192 + 32 + 5 = 229"
        }
      ]
    },
    {
      "content": "Convert 101110\u2081\u2082 to base 10.",
      "options": [
        "248832 + 1728 + 144 + 12",
        "248832+ 1728 + 144",
        "248832 + 1728 + 144 + 6",
        "248832 + 1728 + 12 + 6"
      ],
      "answer": "248832 + 1728 + 144 + 12",
      "narration": "101110\u2081\u2082 = (1 * 12\u2075) + (0 * 12\u2074) + (1 * 12\u00b3) + (1 * 12\u00b2) + (1 * 12\u00b9) + (0 * 12\u2070) = 248832 + 0 + 1728 + 144 + 12 + 0 = 248832 + 1728 + 144 + 12",
      "narration_payload": [
        {
          "type": "text",
          "value": "101110\u2081\u2082 = (1 * 12\u2075) + (0 * 12\u2074) + (1 * 12\u00b3) + (1 * 12\u00b2) + (1 * 12\u00b9) + (0 * 12\u2070) = 248832 + 0 + 1728 + 144 + 12 + 0 = 248832 + 1728 + 144 + 12"
        }
      ]
    },
    {
      "content": "Convert 2A.4\u2081\u2086 to base 10.",
      "options": [
        "42.25",
        "42.4",
        "42.5",
        "42.6"
      ],
      "answer": "42.25",
      "narration": "2A.4\u2081\u2086 = (2 * 16\u00b9) + (10 * 16\u2070) + (4 * 16\u207b\u00b9) = 32 + 10 + 0.25 = 42.25",
      "narration_payload": [
        {
          "type": "text",
          "value": "2A.4\u2081\u2086 = (2 * 16\u00b9) + (10 * 16\u2070) + (4 * 16\u207b\u00b9) = 32 + 10 + 0.25 = 42.25"
        }
      ]
    }
  ]
};

// 2. THE RENDERER COMPONENT
// This handles the \n splitting and styling the unicode math lines
const UnicodeRenderer = ({ text }) => {
  if (!text) return null;

  // Split by newline to handle each step on its own line
  const lines = text.split('\n');

  return (
    <View style={styles.narrationBox}>
      <Text style={styles.narrationLabel}>Explanation:</Text>
      {lines.map((line, index) => {
        // We can detect if a line is a "Math Step" (contains division or equals)
        // and give it a different font style (Monospace looks better for math steps)
        const isMathStep = line.includes('\u00f7') || line.includes('=') || line.includes(' R ');

        return (
          <Text
            key={index}
            style={[
              styles.textLine,
              isMathStep && styles.mathLine // Apply special style if it's a math step
            ]}
          >
            {line}
          </Text>
        );
      })}
    </View>
  );
};

// 3. MAIN SCREEN
export default function JsonTestScreen() {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (index) => {
    setExpandedId(expandedId === index ? null : index);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{QUIZ_DATA.Subtopic}</Text>

      {QUIZ_DATA.Generated_Questions.map((q, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.questionText}>Q{index + 1}. {q.content}</Text>

          {/* Options Grid */}
          <View style={styles.optionsContainer}>
            {q.options.map((opt, i) => (
              <View key={i} style={[styles.optionBadge, opt === q.answer && styles.correctBadge]}>
                <Text style={[styles.optionText, opt === q.answer && styles.correctText]}>{opt}</Text>
              </View>
            ))}
          </View>

          {/* Toggle Narration Button */}
          <TouchableOpacity onPress={() => toggleExpand(index)} style={styles.revealBtn}>
            <Text style={styles.revealBtnText}>
              {expandedId === index ? "Hide Solution" : "Show Solution"}
            </Text>
          </TouchableOpacity>

          {/* The Unicode Renderer */}
          {expandedId === index && (
            <UnicodeRenderer text={q.narration} />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { padding: 16, paddingTop: 60 },
  header: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  questionText: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 15 },

  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  optionBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0'
  },
  correctBadge: { backgroundColor: '#e6f4ea', borderColor: '#34a853' },
  optionText: { fontSize: 14, color: '#555' },
  correctText: { color: '#1e8e3e', fontWeight: 'bold' },

  revealBtn: { alignSelf: 'flex-start', marginBottom: 10 },
  revealBtnText: { color: '#007AFF', fontWeight: '600' },

  // Narration Styles
  narrationBox: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  narrationLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 8, textTransform: 'uppercase' },

  textLine: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    marginBottom: 4
  },
  // This makes the division steps look like code/math
  mathLine: {
    fontFamily: 'Menlo',
    color: '#2c3e50',
    fontSize: 14,
    backgroundColor: '#eef',
    alignSelf: 'flex-start', // Only take up necessary width
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden' // required for borderRadius on text in some android versions
  }
});