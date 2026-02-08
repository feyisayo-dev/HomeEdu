import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const PuppetMascot = ({ mood = 'idle', source }) => {
  // Animation Values
  const floatAnim = useRef(new Animated.Value(0)).current; 
  const talkAnim = useRef(new Animated.Value(1)).current;  
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current; 
  // 1. NEW: Hide Animation (For Error)
  const hideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset Logic
    floatAnim.stopAnimation();
    talkAnim.stopAnimation();
    bounceAnim.stopAnimation();
    rotateAnim.stopAnimation();
    hideAnim.stopAnimation();

    // Default Resets
    rotateAnim.setValue(0);
    talkAnim.setValue(1);
    
    // Check Mood
    if (mood === 'idle') {
      Animated.spring(hideAnim, { toValue: 0, useNativeDriver: true }).start(); // Come up
      runIdleAnimation();
    } 
    else if (mood === 'talking') {
      Animated.spring(hideAnim, { toValue: 0, useNativeDriver: true }).start();
      runTalkingAnimation();
    } 
    else if (mood === 'success') {
      Animated.spring(hideAnim, { toValue: 0, useNativeDriver: true }).start();
      runSuccessAnimation();
    } 
    else if (mood === 'error') {
      runErrorAnimation(); // Go Down
    }
  }, [mood]);

  const runIdleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  };

  const runTalkingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(talkAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(talkAnim, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      ])
    ).start();
  };

  const runSuccessAnimation = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(bounceAnim, { toValue: -80, friction: 4, useNativeDriver: true }),
        Animated.spring(bounceAnim, { toValue: 0, friction: 5, useNativeDriver: true }),
      ]),
      Animated.timing(rotateAnim, {
        toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true,
      })
    ]).start();
  };

  // 2. NEW: Error Animation (Sink Down)
  const runErrorAnimation = () => {
    Animated.timing(hideAnim, {
      toValue: 100, // Move down 100 pixels (Hiding)
      duration: 800,
      easing: Easing.bounce, // A little bounce when hitting bottom
      useNativeDriver: true,
    }).start();
  };

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.circleContainer}>
      <Animated.View
        style={{
          transform: [
            { translateY: Animated.add(Animated.add(floatAnim, bounceAnim), hideAnim) }, // Adds float + bounce + HIDE
            { scaleY: talkAnim }, 
            { scaleX: mood === 'talking' ? talkAnim.interpolate({ inputRange: [0.95, 1.05], outputRange: [1.02, 0.98] }) : 1 },
            { rotate: spin } 
          ],
        }}
      >
        <LottieView
          source={source}
          autoPlay={true} // Force play to fix web issue
          loop={true}
          style={{ width: 180, height: 180 }} // Made smaller to fit circle
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  circleContainer: {
    width: 220,
    height: 220,
    borderRadius: 110, // Perfect Circle
    backgroundColor: '#FFEAA7', // Light Yellow Background
    borderWidth: 4,
    borderColor: '#FDCB6E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // ✅ CRITICAL: Crops the mascot when it goes down
  },
});

export default PuppetMascot;