import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PassageScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        PDF viewing is not supported on the web version.
      </Text>
      <Text style={styles.subText}>
        Please use the mobile app to view this document.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  text: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10 
  },
  subText: { 
    fontSize: 14, 
    color: '#666' 
  }
});