import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useUser } from '../context/UserContext';

const { width } = Dimensions.get('window');

// Animated Subtopic Item Component
const AnimatedSubtopicItem = ({ item, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Entrance animation when component mounts
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100, // Stagger animation
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

  // Press animation
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
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }],
      }}
    >
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

// Animated Button Component
const AnimatedButton = ({ onPress, text }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Continuous pulse animation
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
    <Animated.View
      style={{
        transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
      }}
    >
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
  const { topicId, Topic, Subject } = route.params;
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData } = useUser();

  useEffect(() => {
    const fetchSubtopics = async () => {
      try {
        const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/subtopics/${topicId}`);
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
  }, [topicId]);

  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'topicExam',
      subject: Subject,
      topic: topicId,
      subtopic: null,
      userClass: userData.class,
    });
  };

  if (loading) return <ActivityIndicator size="large" color="#864AF9" style={{ flex: 1, justifyContent: 'center' }} />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;

  return (
    <View style={styles.subtopicsContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.subtopicsTitle}>Subtopics for {Topic}</Text>
      </View>

      <FlatList
        data={subtopics}
        keyExtractor={(item) => item.SubtopicId.toString()}
        renderItem={({ item, index }) => (
          <AnimatedSubtopicItem
            item={item}
            index={index}
            onPress={() =>
              navigation.navigate('Explanation', {
                subtopicId: item.SubtopicId,
                Subtopic: item.Subtopic,
              })
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
  subtopicsContainer: {
    flex: 1,
    backgroundColor: '#F8F9FE',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  subtopicsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    letterSpacing: 0.3,
    flex: 1,
    flexShrink: 1,
  },
  subtopicsList: {
    paddingBottom: 24,
  },
  subtopicItem: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#864AF9',
    marginBottom: 14,
    shadowColor: '#864AF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  subtopicText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#864AF9',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#864AF9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 16,
    color: '#F56565',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SubtopicScreen;