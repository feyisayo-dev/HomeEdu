import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

const PuppetMascot = ({ mood = 'idle', source }) => {
  // Animation Values
  const floatAnim = useRef(new Animated.Value(0)).current; 
  const talkAnim = useRef(new Animated.Value(1)).current;  
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // 1. NEW: Rotation Value
  const rotateAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    // RESET everything when mood changes
    floatAnim.setValue(0);
    talkAnim.setValue(1);
    bounceAnim.setValue(0);
    rotateAnim.setValue(0);
    
    // Stop any running animations
    floatAnim.stopAnimation();
    talkAnim.stopAnimation();
    bounceAnim.stopAnimation();
    rotateAnim.stopAnimation();

    if (mood === 'idle') {
      runIdleAnimation();
    } else if (mood === 'talking') {
      runTalkingAnimation();
    } else if (mood === 'success') {
      runSuccessAnimation();
    }
  }, [mood]);

  const runIdleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10, duration: 1500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0, duration: 1500,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
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

  // 2. UPDATED SUCCESS: Jump AND Spin
  const runSuccessAnimation = () => {
    // Run them in parallel (Jump + Rotate at same time)
    Animated.parallel([
      // A. The Jump (Up and Down)
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: -80, // Jump Higher
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0, // Land
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      // B. The Spin (0 -> 360 degrees)
      Animated.timing(rotateAnim, {
        toValue: 1, // Goes from 0 to 1
        duration: 800, // Takes 0.8 seconds to spin
        easing: Easing.out(Easing.exp), // Fast start, slow stop
        useNativeDriver: true,
      })
    ]).start();
  };

  // 3. Helper: Convert 0-1 to "0deg"-"360deg"
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [
            { translateY: Animated.add(floatAnim, bounceAnim) }, 
            { scaleY: talkAnim }, 
            { scaleX: mood === 'talking' ? 
                talkAnim.interpolate({ inputRange: [0.95, 1.05], outputRange: [1.02, 0.98] }) 
                : 1 
            },
            { rotate: spin } // ✅ Apply the spin here
          ],
        }}
      >
        <LottieView
          source={source}
          autoPlay={false} 
          loop={false}
          style={{ width: 250, height: 250 }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
});

export default PuppetMascot;