import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

// Animated Subtopic Item Component (Unchanged)
const AnimatedSubtopicItem = ({ item, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100, 
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        delay: index * 100,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.subtopicItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Text style={styles.subtopicText}>{item.Subtopic}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Animated Button Component (Unchanged)
const AnimatedButton = ({ onPress, text }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
      <TouchableOpacity
        style={styles.startButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Text style={styles.startButtonText}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main SubtopicScreen Component
const SubtopicScreen = ({ route, navigation }) => {
  // 1. Destructure the offline params passed from TopicScreen
  const { topicId, Topic, Subject, isOffline, offlineSubtopics } = route.params;
  
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData } = useUser();

  useEffect(() => {
    const fetchSubtopics = async () => {
      // 🛑 OFFLINE MODE: Bypass API and load directly from memory
     if (isOffline && offlineSubtopics) {
        console.log(`📦 APP STATUS: OFFLINE MODE -> Loading ${offlineSubtopics.length} subtopics directly from RAM`);
        
        // ⏳ UX Trick: Give the UI a moment to show the spinner
        setTimeout(() => {
          setSubtopics(offlineSubtopics);
          setLoading(false);
        }, 400); 
        return;
      }

      // 🌐 ONLINE MODE: Fetch from API
      console.log(`🌐 APP STATUS: ONLINE MODE -> Hitting the Laravel API for ${Topic} subtopics`);
      try {
        const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/userSubtopics/${topicId}`);
        if (response.data.status === 200) {
          setSubtopics(response.data.data);
        } else {
          setError("Failed to load subtopics.");
        }
      } catch (err) {
        setError("An error occurred while fetching subtopics.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubtopics();
  }, [topicId, isOffline, offlineSubtopics]);

  // Handle Full Topic Exam Button
  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'topicExam',
      subject: Subject,
      topic: Topic,
      topicId: topicId,
      subtopic: null,
      userClass: userData?.class,
      // 2. Pass offline data to the unified Exam screen
      isOffline: isOffline || false,
      offlineData: isOffline ? offlineSubtopics : null, 
    });
  };

  // Handle Specific Subtopic Selection
  const handleExplanation = (subtopicId, SubtopicTitle, fullSubtopicItem) => {
    
    const navigateToQuestion = () => {
      navigation.navigate('Question', {
        subtopicId: subtopicId,
        subtopic: SubtopicTitle,
        selectedSubjects: SubtopicTitle,
        type: 'subtopicExam',
        subject: Subject, 
        topic: Topic,
        // 3. Pass only the questions array down to the specific Question screen
        isOffline: isOffline || false,
        offlineQuestions: isOffline ? fullSubtopicItem.questions : null,
      });
    };

    // 🛑 OFFLINE MODE: Skip the explanation API check completely
    if (isOffline) {
      console.log("📦 OFFLINE MODE: Skipping explanation API check. Going straight to questions.");
      navigateToQuestion();
      return; 
    }

    // 🌐 ONLINE MODE: Check for Explanation first
    const fetchExplanation = async () => {
      if (loading) return;
      setLoading(true);

      try {
        const response = await axios.get(
          `https://homeedu.fsdgroup.com.ng/api/explanation/${subtopicId}`
        );

        if (response.data && response.data.status === 200) {
          navigation.navigate('Explanation', {
            subtopicId: subtopicId,
            Subtopic: SubtopicTitle,
            subject: Subject,
            topic: Topic, 
          });
        } else {
          navigateToQuestion();
        }
      } catch (err) {
        if (err.response && err.response.status === 404) {
          navigateToQuestion();
        } else {
          console.error("Critical Error:", err);
          setError('An error occurred while fetching the explanation.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExplanation();
  };

  if (loading) return <ActivityIndicator size="large" color="#864AF9" style={{ flex: 1, justifyContent: 'center' }} />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;

  return (
    <View style={styles.subtopicsContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.subtopicsTitle}>
          {isOffline ? '📦 ' : ''}Subtopics for {Topic}
        </Text>
      </View>

      <FlatList
        data={subtopics}
        keyExtractor={(item) => item.SubtopicId ? item.SubtopicId.toString() : Math.random().toString()}
        renderItem={({ item, index }) => (
          <AnimatedSubtopicItem
            item={item}
            index={index}
            onPress={() =>
              // Pass the full `item` so we can extract the specific questions array if offline
              handleExplanation(item.SubtopicId, item.Subtopic, item)
            }
          />
        )}
        contentContainerStyle={styles.subtopicsList}
        showsVerticalScrollIndicator={false}
      />

      <AnimatedButton onPress={handleButtonPress} text="Take Exam" />
    </View>
  );
};

const styles = StyleSheet.create({
  subtopicsContainer: { flex: 1, backgroundColor: '#F8F9FE', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  subtopicsTitle: { fontSize: 20, fontWeight: '700', color: '#2D3748', letterSpacing: 0.3, flex: 1, flexShrink: 1 },
  subtopicsList: { paddingBottom: 24 },
  subtopicItem: { backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 18, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#864AF9', marginBottom: 14, shadowColor: '#864AF9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  subtopicText: { fontSize: 17, fontWeight: '600', color: '#2D3748', letterSpacing: 0.2, lineHeight: 24 },
  startButton: { backgroundColor: '#864AF9', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16, shadowColor: '#864AF9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  startButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  errorText: { fontSize: 16, color: '#F56565', textAlign: 'center', marginTop: 20 },
});

export default SubtopicScreen;