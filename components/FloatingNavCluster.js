import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Floating Home + Back cluster used on the Subject/Topic/Subtopic list screens
// to give users an escape hatch out of the explanation → example → question
// → subtopic bounce when a subtopic turns out to have no practice questions.
const FloatingNavCluster = ({ onBack, onHome }) => (
  <View style={styles.container} pointerEvents="box-none">
    {onBack && (
      <TouchableOpacity style={[styles.btn, styles.backBtn]} onPress={onBack} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={22} color="#864AF9" />
      </TouchableOpacity>
    )}
    <TouchableOpacity style={[styles.btn, styles.homeBtn]} onPress={onHome} activeOpacity={0.85}>
      <Ionicons name="home" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    gap: 12,
    zIndex: 999,
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  backBtn: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#864AF9' },
  homeBtn: { backgroundColor: '#864AF9' },
});

export default FloatingNavCluster;
