import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { WebView } from "react-native-webview";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- 0. UNICODE HELPER FUNCTION (THE FIX) ---
// This ensures that strings like "\u20a6" are converted to "₦" automatically
const fixUnicode = (str) => {
  if (!str || typeof str !== 'string') return str || "";

  // 1. Fix standard JSON unicode escapes (e.g. \u20a6 -> ₦)
  let decoded = str.replace(/\\u([0-9a-fA-F]{4})/gi, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });

  // 2. Fix Double-Escaped Naira specific edge cases if they exist
  decoded = decoded.replace("$$\\mathbb{N}$$", "₦");

  return decoded;
};

// --- 1. THE SMART MATH COMPONENT (Handles auto-sizing) ---
const SmartMath = ({ latex, inline = true }) => {
  const [dims, setDims] = useState({ h: 30, w: 60 });
  const [isReady, setIsReady] = useState(false);

  // Clean the LaTeX input before rendering
  const cleanLatex = fixUnicode(latex);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: transparent; 
            display: inline-block; 
            overflow: hidden; 
            white-space: nowrap; 
            /* System Font Stack for Mobile */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: ${isReady ? 1 : 0}; 
          }
          #m { display: inline-block; font-size: 15px; padding: 4px 8px; color: black; }
        </style>
      </head>
      <body>
        <div id="m"></div>
        <script>
          function measure() {
            var el = document.getElementById('m');
            var h = el.offsetHeight;
            var w = el.offsetWidth;
            if (h > 0 && w > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: h, width: w }));
            }
          }

          try {
            var el = document.getElementById('m');
            // Double escape backslashes for JS string safety
            var tex = "${cleanLatex.replace(/\\/g, "\\\\")}";
            katex.render(tex, el, { displayMode: ${!inline}, throwOnError: false });
            
            setTimeout(measure, 100);
            setTimeout(measure, 500);
          } catch (e) { window.ReactNativeWebView.postMessage("error"); }
        </script>
      </body>
    </html>
  `;

  return (
    <View
      style={{
        height: dims.h,
        width: inline ? dims.w : "100%",
        marginHorizontal: 2,
        opacity: isReady ? 1 : 0,
      }}
    >
      <WebView
        key={cleanLatex}
        originWhitelist={["*"]}
        source={{ html }}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            setDims({ h: data.height + 6, w: data.width + 8 });
            setIsReady(true);
          } catch (err) { }
        }}
        style={{ backgroundColor: "transparent" }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};
// --- 1.5 SMART HTML COMPONENT (For Tables) ---
const SmartHtml = ({ htmlContent }) => {
  const [height, setHeight] = useState(40);
  const [isReady, setIsReady] = useState(false);

  // We add some basic CSS so the table looks good instantly
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: transparent; 
            overflow: hidden; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            opacity: ${isReady ? 1 : 0};
          }
          /* TABLE STYLING */
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; color: #333; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="wrapper">${htmlContent}</div>
        <script>
          function measure() {
            var el = document.getElementById('wrapper');
            var h = el.offsetHeight;
            if (h > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: h }));
            }
          }
          // Measure repeatedly to catch render delays
          setTimeout(measure, 100);
          setTimeout(measure, 500);
          setTimeout(measure, 1000);
        </script>
      </body>
    </html>
  `;

  return (
    <View style={{ height: height, width: "100%", marginVertical: 10, opacity: isReady ? 1 : 0 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            setHeight(data.height + 10); // Add a little padding
            setIsReady(true);
          } catch (err) { }
        }}
        style={{ backgroundColor: "transparent" }}
        javaScriptEnabled={true}
      />
    </View>
  );
};
// --- 2. CONTENT RENDERER ---
const renderContentWithMath = (rawContent, textStyle = {}) => {
  if (!rawContent) return null;

  // STEP 1: Apply Unicode Fix globally before splitting
  const content = fixUnicode(rawContent);

  // Step 2: Split by LaTeX Math ($$...$$ OR $...$) and tables
  // Updated regex to capture both display ($$) and inline ($) math
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|<table[\s\S]*?<\/table>)/g);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
      {parts.map((part, index) => {
        // CASE A: Handle Display Math ($$...$$)
        if (part.startsWith("$$") && part.endsWith("$$")) {
          const latex = part.slice(2, -2).trim();
          return (
            <SmartMath key={`math-block-${index}`} latex={latex} inline={false} />
          );
        }
        
        // CASE B: Handle Inline Math ($...$)
        if (part.startsWith("$") && part.endsWith("$") && !part.startsWith("$$")) {
          const latex = part.slice(1, -1).trim();
          return (
            <SmartMath key={`math-inline-${index}`} latex={latex} inline={true} />
          );
        }
        
        // CASE C: Handle Tables
        if (part.startsWith("<table") && part.endsWith("</table>")) {
          return (
            <View key={`table-${index}`} style={{ width: '100%' }}>
              <SmartHtml htmlContent={part} />
            </View>
          );
        }
        
        // CASE D: Handle Text with Styles
        if (part) {
          // Split by Bold (**), Underline (__), or Color ({hex}...)
          const fragments = part.split(
            /(\*\*.*?\*\*|__.*?__|\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*?\{\/\})/g
          );

          return fragments.map((sub, subIndex) => {
            const key = `text-${index}-${subIndex}`;

            if (!sub || sub === "undefined") return null;

            // 1. Handle Bold (**text**)
            if (sub.startsWith("**") && sub.endsWith("**")) {
              return (
                <Text
                  key={key}
                  style={[styles.label, textStyle, { fontWeight: "bold" }]}
                  selectable={false}
                >
                  {sub.slice(2, -2)}
                </Text>
              );
            }
            
            // 2. Handle Underline (__text__)
            if (sub.startsWith("__") && sub.endsWith("__")) {
              return (
                <Text
                  key={key}
                  style={[
                    styles.label,
                    textStyle,
                    { textDecorationLine: "underline" },
                  ]}
                  selectable={false}
                >
                  {sub.slice(2, -2)}
                </Text>
              );
            }

            // 3. Handle Color ({#hex}text{/})
            if (sub.match(/^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}.*\{\/\}$/)) {
              const colorMatch = sub.match(
                /^\{(#[0-9a-fA-F]{3,6}|[a-z]+)\}(.*)\{\/\}$/
              );
              return (
                <Text
                  key={key}
                  style={[styles.label, textStyle, { color: colorMatch[1] }]}
                  selectable={false}
                >
                  {colorMatch[2]}
                </Text>
              );
            }

            // 4. Render Plain Text
            return (
              <Text key={key} style={[styles.label, textStyle]} selectable={false}>
                {sub}
              </Text>
            );
          });
        }
        return null;
      })}
    </View>
  );
};

// --- 3. SUB-COMPONENTS ---

const AnimatedOption = ({
  option,
  isSelected,
  onPress,
  isCorrect,
  isSubmitted,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const selectedAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(selectedAnim, {
      toValue: isSelected ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isSelected]);

  const finalBg = selectedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#FFFFFF", "#F7F3FF"],
  });
  const finalBorder = selectedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E2E8F0", "#864AF9"],
  });

  let bg = finalBg;
  let brd = finalBorder;
  if (isSubmitted) {
    if (isCorrect) {
      bg = "#F0FFF4";
      brd = "#48BB78";
    } else if (isSelected) {
      bg = "#FFF5F5";
      brd = "#F56565";
    }
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 12 }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={isSubmitted}
        activeOpacity={1}
        onPressIn={() =>
          Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
      >
        <Animated.View
          style={[
            styles.optionContainer,
            { backgroundColor: bg, borderColor: brd },
          ]}
        >
          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected,
                isSubmitted && isCorrect && styles.radioOuterCorrect,
                isSubmitted &&
                !isCorrect &&
                isSelected &&
                styles.radioOuterIncorrect,
              ]}
            >
              {isSelected && (
                <View
                  style={[
                    styles.radioInner,
                    isSubmitted && isCorrect && styles.radioInnerCorrect,
                    isSubmitted &&
                    !isCorrect &&
                    isSelected &&
                    styles.radioInnerIncorrect,
                  ]}
                />
              )}
            </View>
          </View>
          <View style={styles.optionTextContainer}>
            {/* Note: renderContentWithMath internally calls fixUnicode now */}
            {renderContentWithMath(option, styles.optionText)}
          </View>
          {isSubmitted && isCorrect && (
            <Text style={styles.correctIcon}>✓</Text>
          )}
          {isSubmitted && !isCorrect && isSelected && (
            <Text style={styles.incorrectIcon}>✗</Text>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ObjectiveQuestion = ({
  question,
  selectedOption,
  onSelection,
  isSubmitted,
}) => (
  <View style={styles.questionContainer}>
    {question.image && (
      <View style={styles.imageContainer}>
        <Image source={{ uri: question.image }} style={styles.questionImage} />
      </View>
    )}
    <View style={styles.questionTextContainer}>
      {renderContentWithMath(question.content, styles.questionText)}
    </View>
    <View style={styles.optionsWrapper}>
      {question.options.map((opt, i) => (
        <AnimatedOption
          key={i}
          option={opt}
          isSelected={selectedOption === opt}
          onPress={() => onSelection(opt)}
          isCorrect={isSubmitted ? opt === question.answer : null}
          isSubmitted={isSubmitted}
        />
      ))}
    </View>
  </View>
);

const TheoryQuestion = ({ question, onAnswerChange, value, isSubmitted }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.questionContainer}>
      {question.image && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: question.image }}
            style={styles.questionImage}
          />
        </View>
      )}
      <View style={styles.questionTextContainer}>
        {renderContentWithMath(question.content, styles.questionText)}
      </View>
      <TextInput
        style={[
          styles.textArea,
          isFocused && styles.textAreaFocused,
          isSubmitted && styles.textAreaSubmitted,
        ]}
        placeholder="Write your answer here..."
        multiline
        numberOfLines={6}
        onChangeText={onAnswerChange}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!isSubmitted}
      />
    </View>
  );
};

const FillInTheGapsQuestion = ({
  question,
  onAnswerChange,
  value,
  isSubmitted,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isCorrect =
    value?.toLowerCase().trim() === question.answer?.toLowerCase().trim();

  return (
    <View style={styles.questionContainer}>
      {question.image && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: question.image }}
            style={styles.questionImage}
          />
        </View>
      )}
      <View style={styles.questionTextContainer}>
        {renderContentWithMath(question.content, styles.questionText)}
      </View>

      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          isSubmitted &&
          (isCorrect
            ? { borderColor: "#48BB78", backgroundColor: "#F0FFF4" }
            : { borderColor: "#F56565", backgroundColor: "#FFF5F5" }),
        ]}
        placeholder="Type your answer..."
        onChangeText={onAnswerChange}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!isSubmitted}
      />

      {isSubmitted && !isCorrect && (
        <View
          style={{
            marginTop: 8,
            padding: 8,
            backgroundColor: "#E6FFFA",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#2C7A7B", fontWeight: "bold" }}>
            Correct Answer: {fixUnicode(question.answer)}
          </Text>
        </View>
      )}
    </View>
  );
};

// --- 4. MAIN RENDERER SWITCH ---
const QuestionRenderer = ({
  question,
  onAnswerSelected,
  selectedAnswer,
  isSubmitted,
}) => {
  const handleSelection = (val) =>
    !isSubmitted && onAnswerSelected(question.QuestionId, val);
  const handleAnswerChange = (val) =>
    !isSubmitted && onAnswerSelected(question.QuestionId, val);

  switch (question.type) {
    case "multiple_choice":
    case "true_false":
      return (
        <ObjectiveQuestion
          question={question}
          selectedOption={selectedAnswer}
          onSelection={handleSelection}
          isSubmitted={isSubmitted}
        />
      );
    case "theory":
      return (
        <TheoryQuestion
          question={question}
          onAnswerChange={handleAnswerChange}
          value={selectedAnswer || ""}
          isSubmitted={isSubmitted}
        />
      );
    case "short_answer":
      return (
        <FillInTheGapsQuestion
          question={question}
          onAnswerChange={handleAnswerChange}
          value={selectedAnswer || ""}
          isSubmitted={isSubmitted}
        />
      );
    default:
      return (
        <View style={styles.unsupportedContainer}>
          <Text style={styles.unsupportedText}>
            Unsupported: {question.type}
          </Text>
        </View>
      );
  }
};

// --- STYLES ---
const styles = StyleSheet.create({
  questionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    marginBottom: 20,
  },
  imageContainer: { marginBottom: 20, borderRadius: 12, overflow: "hidden" },
  questionImage: { width: "100%", height: 200, resizeMode: "contain" },
  questionTextContainer: { marginBottom: 20 },
  questionText: { fontSize: 18, fontWeight: "600", color: "#2D3748" },
  optionsWrapper: { marginTop: 8 },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 60,
  },
  radioContainer: { marginRight: 12 },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E0",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: { borderColor: "#864AF9" },
  radioOuterCorrect: { borderColor: "#48BB78" },
  radioOuterIncorrect: { borderColor: "#F56565" },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#864AF9",
  },
  radioInnerCorrect: { backgroundColor: "#48BB78" },
  radioInnerIncorrect: { backgroundColor: "#F56565" },
  optionTextContainer: { flex: 1 },
  optionText: { fontSize: 15, color: "#2D3748", lineHeight: 20 },
  label: { fontSize: 16, color: "#333" },
  correctIcon: { fontSize: 20, color: "#48BB78", marginLeft: 8 },
  incorrectIcon: { fontSize: 20, color: "#F56565", marginLeft: 8 },
  textArea: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    textAlignVertical: "top",
    minHeight: 120,
  },
  textAreaFocused: { borderColor: "#864AF9" },
  textAreaSubmitted: { backgroundColor: "#F7F9FC" },
  input: {
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
  },
  inputFocused: { borderColor: "#864AF9" },
  inputSubmitted: { backgroundColor: "#F7F9FC" },
  unsupportedContainer: { padding: 20, backgroundColor: "#FFF5F5" },
  unsupportedText: { color: "#C53030", textAlign: "center" },
});

export default QuestionRenderer;