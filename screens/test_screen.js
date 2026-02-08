import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Alert, Animated } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PuppetMascot from '../mascots/PuppetMascot'; 

// 1. IMPORT ASSETS
import myMascotFile from '../assets/lottie/mascot.json'; 
import celebrationFile from '../assets/lottie/celebrate.json';
const successSound = require('../assets/sounds/success.mp3'); 
const errorSound = require('../assets/sounds/error.mp3');

const { width, height } = Dimensions.get('window');

// 2. MOCK DATA (Kept mostly same, adjusted some colors for contrast)
const MOCK_QUESTIONS = [
  {
    id: 1,
    question: "Which number is bigger?",
    options: [
      { id: 'a', type: 'icon', iconName: 'numeric-2-box', iconColor: '#FFF', text: "2", isCorrect: false, color: '#FF7675' },
      { id: 'b', type: 'icon', iconName: 'numeric-10-box', iconColor: '#FFF', text: "10", isCorrect: true, color: '#55E6C1' }
    ],
    instruction: "Tap the BIG number!"
  },
  {
    id: 2,
    question: "Which animal says Moo?",
    options: [
      { id: 'a', type: 'icon', iconName: 'dog', iconColor: '#8B4513', text: "Dog", isCorrect: false, color: '#ffeaa7' },
      { id: 'b', type: 'icon', iconName: 'cow', iconColor: '#FFF', text: "Cow", isCorrect: true, color: '#fab1a0' }
    ],
    instruction: "Tap the Cow!"
  },
  {
    id: 3,
    question: "What comes out at night?",
    options: [
      { id: 'a', type: 'icon', iconName: 'white-balance-sunny', iconColor: '#FFD700', text: "Sun", isCorrect: false, color: '#fdcb6e' },
      { id: 'b', type: 'icon', iconName: 'moon-waning-crescent', iconColor: '#F0E68C', text: "Moon", isCorrect: true, color: '#6c5ce7' }
    ],
    instruction: "Tap what comes at night!"
  },
  {
    id: 4,
    question: "Which one is a fruit?",
    options: [
      { id: 'a', type: 'icon', iconName: 'food-apple', iconColor: '#FF0000', text: "Apple", isCorrect: true, color: '#ff7675' },
      { id: 'b', type: 'icon', iconName: 'car-side', iconColor: '#FFF', text: "Car", isCorrect: false, color: '#74b9ff' }
    ],
    instruction: "Tap the fruit!"
  },
  {
    id: 5,
    question: "Which animal is the biggest?",
    options: [
      { id: 'a', type: 'icon', iconName: 'rabbit', iconColor: '#FFF', text: "Rabbit", isCorrect: false, color: '#a29bfe' },
      { id: 'b', type: 'icon', iconName: 'elephant', iconColor: '#FFF', text: "Elephant", isCorrect: true, color: '#81ecec' }
    ],
    instruction: "Tap the biggest animal!"
  },
  {
    id: 6,
    question: "What shape is this? ⭐",
    options: [
      { id: 'a', type: 'icon', iconName: 'circle', iconColor: '#FFF', text: "Circle", isCorrect: false, color: '#ff7675' },
      { id: 'b', type: 'icon', iconName: 'star', iconColor: '#FFF', text: "Star", isCorrect: true, color: '#fdcb6e' }
    ],
    instruction: "Tap the star!"
  },
  {
    id: 7,
    question: "Which one flies in the sky?",
    options: [
      { id: 'a', type: 'icon', iconName: 'fish', iconColor: '#FFF', text: "Fish", isCorrect: false, color: '#74b9ff' },
      { id: 'b', type: 'icon', iconName: 'bird', iconColor: '#FFF', text: "Bird", isCorrect: true, color: '#55efc4' }
    ],
    instruction: "Tap what flies!"
  },
  {
    id: 8,
    question: "Pick the flower!",
    options: [
      { id: 'a', type: 'icon', iconName: 'flower', iconColor: '#FFF', text: "Flower", isCorrect: true, color: '#fd79a8' },
      { id: 'b', type: 'icon', iconName: 'balloon', iconColor: '#FFF', text: "Balloon", isCorrect: false, color: '#fab1a0' }
    ],
    instruction: "Tap the flower!"
  },
  {
    id: 9,
    question: "What do we eat?",
    options: [
      { id: 'a', type: 'icon', iconName: 'pizza', iconColor: '#FFF', text: "Pizza", isCorrect: true, color: '#ffeaa7' },
      { id: 'b', type: 'icon', iconName: 'hammer', iconColor: '#696969', text: "Hammer", isCorrect: false, color: '#dfe6e9' }
    ],
    instruction: "Tap the food!"
  },
  {
    id: 10,
    question: "Which color is the grass?",
    options: [
      { id: 'a', type: 'emoji', emoji: '🔴', text: "Red", isCorrect: false, color: '#ff7675' },
      { id: 'b', type: 'emoji', emoji: '🟢', text: "Green", isCorrect: true, color: '#00b894' }
    ],
    instruction: "Tap the green circle!"
  }
];

export default function QuestionTestScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mood, setMood] = useState('idle');
  const [showCelebration, setShowCelebration] = useState(false);
  const confettiRef = useRef(null);
  const [sound, setSound] = useState();

  // Progress Bar Animation
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentQ = MOCK_QUESTIONS[currentIndex];

  useEffect(() => {
    // Animate Progress Bar whenever index changes
    Animated.timing(progressAnim, {
      toValue: (currentIndex + 1) / MOCK_QUESTIONS.length,
      duration: 500,
      useNativeDriver: false, // Width isn't supported by native driver
    }).start();
  }, [currentIndex]);

  // --- AUDIO HELPER ---
  async function playSound(file) {
    Speech.stop();
    if (sound) await sound.unloadAsync();
    const { sound: newSound } = await Audio.Sound.createAsync(file);
    setSound(newSound);
    await newSound.playAsync();
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  // --- SPEAKING LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => speakQuestion(), 500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const speakQuestion = () => {
    Speech.stop();
    setMood('talking');
    
    Speech.speak(currentQ.question, {
      rate: 0.9, 
      pitch: 1.1, 
      onDone: () => setMood('idle') 
    });
  };

  const handleChoice = async (isCorrect) => {
    Speech.stop();

    if (isCorrect) {
      setMood('success');
      await playSound(successSound);
      setShowCelebration(true);
      confettiRef.current?.play(0); 

      setTimeout(() => {
        setMood('idle');
        setShowCelebration(false);
        nextQuestion();
      }, 2500);

    } else {
      setMood('error');
      await playSound(errorSound);
      setTimeout(() => {
        setMood('idle');
      }, 2000);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < MOCK_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      Alert.alert("Lesson Complete!", "You finished all questions! 🌟", [
        { text: "Restart", onPress: () => setCurrentIndex(0) }
      ]);
    }
  };

  const renderOptionVisual = (option) => {
    if (option.type === 'icon') {
      return (
        <MaterialCommunityIcons 
          name={option.iconName} 
          size={60} 
          color={option.iconColor} 
          style={{ marginBottom: 10 }}
        />
      );
    } else if (option.type === 'emoji') {
      return <Text style={styles.emojiText}>{option.emoji}</Text>;
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. PROGRESS BAR HEADER */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
            <Animated.View 
                style={[
                    styles.progressBarFill, 
                    { 
                        width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%']
                        }) 
                    }
                ]} 
            />
        </View>
      </View>

      {/* 2. TOP: Mascot Stage (Curved Bottom) */}
      <View style={styles.topSection}>
        <PuppetMascot source={myMascotFile} mood={mood} />
        
        {/* Cartoon Speech Bubble */}
        <TouchableOpacity style={styles.bubbleContainer} onPress={speakQuestion} activeOpacity={0.8}>
           <View style={styles.speechBubble}>
              <Text style={styles.speechText}>"{currentQ.question}"</Text>
           </View>
           {/* The little triangle tail */}
           <View style={styles.bubbleTail} />
        </TouchableOpacity>
      </View>

      {/* 3. BOTTOM: Question Area */}
      <View style={styles.bottomSection}>
        <Text style={styles.instruction}>{currentQ.instruction}</Text>
        
        <View style={styles.buttonRow}>
          {currentQ.options.map((option) => (
            <TouchableOpacity 
                key={option.id}
                style={[styles.answerBtn, { backgroundColor: option.color }]} 
                onPress={() => handleChoice(option.isCorrect)}
                activeOpacity={0.7}
            >
                {/* Inner white circle for contrast (optional, helps icons pop) */}
                <View style={styles.iconCircle}>
                    {renderOptionVisual(option)}
                </View>
                <Text style={styles.answerText}>{option.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* OVERLAY */}
      {showCelebration && (
        <View style={styles.overlayContainer} pointerEvents="none">
            <LottieView
                ref={confettiRef}
                source={celebrationFile}
                autoPlay={true}
                loop={false} 
                style={styles.fullScreenLottie}
                resizeMode="cover" 
            />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF9C4', // Soft Yellow Background
  },
  
  // --- PROGRESS BAR ---
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
    backgroundColor: '#FFF9C4', // Matches container
  },
  progressBarBg: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#55E6C1', // Bright Green
    borderRadius: 10,
  },

  // --- MASCOT STAGE ---
  topSection: { 
    flex: 1.2, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFF9C4', // Keep it seamless or change for contrast
    paddingBottom: 40,
  },
  
  // --- SPEECH BUBBLE ---
  bubbleContainer: {
    alignItems: 'center',
    marginTop: 10,
    transform: [{ translateY: -20 }] // Pull closer to mascot
  },
  speechBubble: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 25, 
    paddingVertical: 15, 
    borderRadius: 25, 
    borderWidth: 3, 
    borderColor: '#2D3436', 
    maxWidth: '80%',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 15,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2D3436', // Outline Color
    transform: [{ rotate: '180deg' }, { translateY: 3 }], // Point up towards bubble
  },
  speechText: { 
    fontWeight: '900', 
    color: '#2D3436', 
    fontSize: 18,
    textAlign: 'center',
  },

  // --- BOTTOM SECTION ---
  bottomSection: { 
    flex: 1.5, 
    backgroundColor: '#fff',
    borderTopLeftRadius: 40, 
    borderTopRightRadius: 40, 
    padding: 30, 
    alignItems: 'center', 
    // Shadow for the curve
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  instruction: { 
    fontSize: 26, 
    fontWeight: '900', 
    marginBottom: 30, 
    color: '#2D3436', 
    textAlign: 'center',
    textTransform: 'uppercase', // Makes it look cleaner
    letterSpacing: 1,
  },
  buttonRow: { 
    flexDirection: 'row', 
    gap: 20, 
    flexWrap: 'wrap', 
    justifyContent: 'center' 
  },
  answerBtn: { 
    width: 140, 
    height: 140, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    // The "Juicy" 3D Effect
    borderBottomWidth: 8, 
    borderBottomColor: 'rgba(0,0,0,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)', // Subtle highlight
    marginBottom: 10,
  },
  iconCircle: {
    width: 60, // Invisible container to center visual
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerText: { 
    fontSize: 22, 
    fontWeight: '900', 
    color: '#fff',
    marginTop: 5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emojiText: {
    fontSize: 60,
    marginBottom: 5,
  },

  // --- OVERLAY ---
  overlayContainer: {
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    top: 0,              
    justifyContent: 'flex-end', 
    alignItems: 'center',
    zIndex: 999,          
  },
  fullScreenLottie: { 
    width: width, 
    height: height 
  },
});