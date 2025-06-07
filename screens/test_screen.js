import React, { useState } from 'react';
import { View, Button, StyleSheet, SafeAreaView, Text } from 'react-native';
import Katex from 'react-native-katex';

export default function MathTestScreen() {
  const inlineText = 'inline text';
  const [loaded, setLoaded] = useState(false);
  const [expression, setExpression] = useState(`\\text{${inlineText} }c=\\pm\\e+b\\text{ still}`);
  // setTimeout(() => setExpression(`\\text{${inlineText} }d=\\pm\\sqrt{a^2 + b^2}\\text{ still}`), 2000);

  return (
    <Katex
      expression={expression}
      style={styles.katex}
      inlineStyle={inlineStyle}
      displayMode={false}
      throwOnError={false}
      errorColor="#f00"
      macros={{}}
      colorIsTextColor={false}
      onLoad={() => setLoaded(true)}
      onError={() => console.error('Error')}
    />
  );
}
const styles = StyleSheet.create({
  katex: {
    flex: 1,
  }
});

const inlineStyle = `
html, body {
  display: flex;
  background-color: #fafafa;
  justify-content: center;
  align-items: center;
  height: 100%;
  margin: 0;
  padding: 0;
}
.katex {
  font-size: 4em;
  margin: 0;
  display: flex;
}
`;