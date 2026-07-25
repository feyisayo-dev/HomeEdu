import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import styles from './explanationStyles';

// --- SMART MATH (LaTeX Rendering) ---
const SmartMath = ({ latex, inline = true }) => {
    const [dims, setDims] = useState({ h: 40, w: 100 });
    const [isReady, setIsReady] = useState(false);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
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
              opacity: ${isReady ? 1 : 0};
            }
            #m { display: inline-block; font-size: 18px; padding: 4px 8px; color: black; font-family: sans-serif; }
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
              var tex = "${latex.replace(/\\/g, "\\\\")}";
              katex.render(tex, el, { displayMode: ${!inline}, throwOnError: false });
              setTimeout(measure, 100);
              setTimeout(measure, 500);
            } catch (e) { window.ReactNativeWebView.postMessage("error"); }
          </script>
        </body>
      </html>
    `;

    return (
        <View style={{
            height: dims.h,
            width: inline ? dims.w : '100%',
            opacity: isReady ? 1 : 0,
            marginVertical: 4
        }}>
            <WebView
                key={latex}
                originWhitelist={["*"]}
                source={{ html }}
                scrollEnabled={false}
                onMessage={(e) => {
                    try {
                        const data = JSON.parse(e.nativeEvent.data);
                        setDims({ h: data.height + 10, w: data.width + 10 });
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

// --- TEXT FORMATTING PARSER ---
const parseFormattedText = (text, baseStyle = {}) => {
    if (!text || !text.trim()) return null;

    const BIGGER_SIZE = (baseStyle.fontSize || 16) + 2;

    const patterns = [
        { regex: /\*\*(.+?)\*\*|\*(.+?)\*/g, style: { fontWeight: "bold", fontSize: BIGGER_SIZE, color: "#000" } },
        { regex: /<i>(.+?)<\/i>|_(.+?)_/g, style: { fontStyle: "italic", fontSize: BIGGER_SIZE } },
        { regex: /<u>(.+?)<\/u>/g, style: { textDecorationLine: "underline" } },
        { regex: /<b><i>(.+?)<\/i><\/b>|\*\*\*(.+?)\*\*\*/g, style: { fontWeight: "bold", fontStyle: "italic", fontSize: BIGGER_SIZE, color: "#000" } },
        { regex: /<s>(.+?)<\/s>|~~(.+?)~~/g, style: { textDecorationLine: "line-through", opacity: 0.6 } },
    ];

    const segments = [];
    let lastIndex = 0;
    const allMatches = [];

    patterns.forEach((pattern) => {
        let match;
        const regex = new RegExp(pattern.regex.source, "g");
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
        return <Text key={idx} style={[baseStyle, segment.style]}>{segment.text}</Text>;
    });
};

// --- MAIN CONTENT RENDERER (tables, math, formatted paragraphs) ---
const renderContentWithMath = (content) => {
    if (Array.isArray(content) && content.length === 2 && Array.isArray(content[0])) {
        const headers = content[0];
        const columns = content[1];
        return (
            <ScrollView horizontal style={styles.tableScroll}>
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        {headers.map((h, i) => (
                            <View key={`h-${i}`} style={styles.headerCell}><Text style={styles.headerText}>{h}</Text></View>
                        ))}
                    </View>
                    <View style={styles.tableRow}>
                        {columns.map((col, i) => (
                            <View key={`c-${i}`} style={styles.tableCell}>
                                {col.map((item, j) => <View key={j} style={styles.cellBox}><Text style={styles.cellText}>{item}</Text></View>)}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    }

    if (!content || typeof content !== 'string') return null;

    const mathParts = content.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <View style={{ flexDirection: "column", width: '100%' }}>
            {mathParts.map((part, mathIndex) => {
                if (part.startsWith("$$") && part.endsWith("$$")) {
                    const latex = part.slice(2, -2);
                    return <SmartMath key={`math-${mathIndex}`} latex={latex} inline={false} />;
                }
                if (!part.trim()) return null;
                return (
                    <View key={`text-${mathIndex}`} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                        {parseFormattedText(part, styles.paragraphText)}
                    </View>
                );
            })}
        </View>
    );
};

const TextCard = ({ value }) => (
    <View style={{ width: '100%' }}>
        {renderContentWithMath(value)}
    </View>
);

export default TextCard;
