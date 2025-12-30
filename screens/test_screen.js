import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MathBlock = ({ latex, inline = false }) => {
  // Start with a small default size
  const [dims, setDims] = useState({ h: 40, w: 50 });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: transparent; 
            display: inline-block; 
            overflow: hidden;
            white-space: nowrap;
          }
          #m { 
            display: inline-block;
            font-size: 16px; 
            padding: 2px 6px; 
          }
        </style>
      </head>
      <body>
        <div id="m"></div>
        <script>
          try {
            var el = document.getElementById('m');
            var tex = "${latex.replace(/\\/g, '\\\\')}";
            katex.render(tex, el, { 
              displayMode: ${!inline}, 
              throwOnError: false 
            });

            var counts = 0;
            var interval = setInterval(function() {
              // Measure both offsetHeight AND offsetWidth
              var h = el.offsetHeight;
              var w = el.offsetWidth;
              if (h > 0 && w > 0) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ height: h, width: w }));
              }
              if (counts++ > 15) clearInterval(interval);
            }, 150);
          } catch (e) { window.ReactNativeWebView.postMessage("error"); }
        </script>
      </body>
    </html>
  `;

  return (
    <View style={{
      height: dims.h,
      width: inline ? dims.w : SCREEN_WIDTH - 40,
      marginHorizontal: 2,
      marginBottom: inline ? 0 : 10,
    }}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        scrollEnabled={false}
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.height && data.width) {
              setDims({ h: data.height + 8, w: data.width + 10 });
            }
          } catch (err) { }
        }}
        style={{ backgroundColor: 'transparent' }}
        javaScriptEnabled={true}
      />
    </View>
  );
};

export default function MathTestScreen() {
  const mixedVerticalAddition = `Vertical Addition: $$\\begin{array}{r}2313_{x} \\\\ + 1013_{x} \\\\ + 2131_{x} \\\\ \\hline 11012_{x}\\end{array}$$, Yes it works!`;
  const mixedQuadratic = `Quadratic Formula: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$`;
  const testQuestion = `Add $$1101_2$$, $$10111_2$$ and $$111_2$$`;

  const renderMixedContent = (content) => {
    const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);
    return (
      <View style={styles.section}>
        {parts.map((part, index) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            return <MathBlock key={index} latex={part.slice(2, -2)} inline={true} />;
          } else if (part.trim()) {
            return <Text key={index} style={styles.label}>{part}</Text>;
          }
          return null;
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {renderMixedContent(mixedVerticalAddition)}
      <View style={styles.separator} />
      {renderMixedContent(mixedQuadratic)}
      <View style={styles.separator} />
      {renderMixedContent(testQuestion)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingTop: 60 },
  section: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  separator: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
});