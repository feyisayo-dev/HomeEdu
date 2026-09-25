import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import FloatingNavCluster from '../components/FloatingNavCluster';

const { width } = Dimensions.get('window');

const AnimatedSubtopicItem = ({ item, index, onPress, hasQuestions }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isEmpty = hasQuestions === false;
  // `has_content` = has an explanation/example lesson. A subtopic with no
  // questions but real lesson content is still worth opening; one with
  // neither is a true dead end, so it gets fully disabled instead of greyed.
  const hasContent = item.has_content !== undefined ? !!item.has_content : true;
  const isDisabled = isEmpty && !hasContent;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, delay: index * 100, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, delay: index * 100, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.subtopicItem, isEmpty && styles.subtopicItemEmpty, isDisabled && styles.subtopicItemDisabled]}
        onPress={isDisabled ? undefined : onPress}
        activeOpacity={isDisabled ? 1 : 0.9}
        disabled={isDisabled}
      >
        <Text style={[styles.subtopicText, isEmpty && styles.subtopicTextEmpty]}>{item.Subtopic}</Text>
        {isEmpty && (
          <Text style={styles.emptyBadge}>{isDisabled ? 'No content available' : 'No practice questions yet'}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const AnimatedButton = ({ onPress, text }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }}>
      <TouchableOpacity style={styles.startButton} onPress={onPress} activeOpacity={0.9}>
        <Text style={styles.startButtonText}>{text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const SubtopicScreen = ({ route, navigation }) => {
  const { topicId, Topic, Subject, isOffline, offlineSubtopics, autoStartSubtopicIndex } = route.params;
  
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questionAvailability, setQuestionAvailability] = useState({}); // { [SubtopicId]: true | false }
  const { userData } = useUser();

  useEffect(() => {
    const fetchSubtopics = async () => {
      if (isOffline && offlineSubtopics) {
        setTimeout(() => { setSubtopics(offlineSubtopics); setLoading(false); }, 400);
        return;
      }
      try {
        const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/userSubtopics/${encodeURIComponent(topicId)}`);
        if (response.data.status === 200) setSubtopics(response.data.data);
        else setError("Failed to load subtopics.");
      } catch (err) {
        setError("An error occurred while fetching subtopics.");
      } finally {
        setLoading(false);
      }
    };
    fetchSubtopics();
  }, [topicId, isOffline, offlineSubtopics]);

  // Some subtopics have lesson content (explanation/example) but no actual
  // practice questions in the bank yet — check each one so the list can flag
  // it up front instead of the user hitting the "No Questions Found" dead end.
  useEffect(() => {
    setQuestionAvailability({});
    if (subtopics.length === 0) return;

    if (isOffline) {
      const avail = {};
      subtopics.forEach((item) => {
        avail[item.SubtopicId] = Array.isArray(item.questions) ? item.questions.length > 0 : true;
      });
      setQuestionAvailability(avail);
      return;
    }

    let cancelled = false;
    const checkAvailability = async () => {
      const token = await AsyncStorage.getItem('token').catch(() => null);
      const cleanToken = token ? token.replace(/"/g, '') : '';

      const entries = await Promise.all(
        subtopics.map(async (item) => {
          try {
            const res = await axios.post(
              'https://homeedu.fsdgroup.com.ng/api/ExamQuestions',
              { class: userData?.class, subject: Subject, topic: Topic, subtopic: item.Subtopic, total_questions: 1 },
              { headers: { Authorization: `Bearer ${cleanToken}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
            );
            return [item.SubtopicId, (res.data?.data?.length || 0) > 0];
          } catch {
            // Fail open — a network hiccup shouldn't gray out a valid subtopic.
            return [item.SubtopicId, true];
          }
        })
      );

      if (!cancelled) setQuestionAvailability(Object.fromEntries(entries));
    };
    checkAvailability();

    return () => { cancelled = true; };
  }, [subtopics, isOffline]);

// --- THE WATERFALL ROUTER ---
  const startSubtopicFlow = async (index) => {
    const subtopicItem = subtopics[index];
    if (!subtopicItem) return;

    // The "Chain" data passed to every screen
    const baseParams = {
      subtopicId: subtopicItem.SubtopicId,
      Subtopic: subtopicItem.Subtopic,
      subtopic: subtopicItem.Subtopic,
      subject: Subject,
      topic: Topic,
      topicId: topicId,
      isOffline: isOffline || false,
      offlineQuestions: isOffline ? subtopicItem.questions : null,
      subtopicsList: subtopics,
      currentSubtopicIndex: index
    };

    if (isOffline) {
      navigation.navigate('Question', { ...baseParams, type: 'subtopicExam' });
      return; 
    }

    setLoading(true);
    try {
      // 1. Check for Explanation FIRST
      const expRes = await axios.get(`https://homeedu.fsdgroup.com.ng/api/explanation/${subtopicItem.SubtopicId}`).catch(()=>null);
      if (expRes?.data?.status === 200 && expRes.data.data?.length > 0) {
        navigation.navigate('Explanation', baseParams);
        return;
      }

      // 2. Check for Examples SECOND
      const exmRes = await axios.get(`https://homeedu.fsdgroup.com.ng/api/examples/${subtopicItem.SubtopicId}`).catch(()=>null);
      if (exmRes?.data?.status === 200 && exmRes.data.data?.length > 0) {
        navigation.navigate('Example', baseParams);
        return;
      }

      // 3. Fallback directly to Questions
      navigation.navigate('Question', { ...baseParams, type: 'subtopicExam' });
    } catch (err) {
      navigation.navigate('Question', { ...baseParams, type: 'subtopicExam' });
    } finally {
      setLoading(false);
    }
  };

  // Listen for "Next Subtopic" triggers from the Question Screen
  useEffect(() => {
    if (!loading && subtopics.length > 0 && autoStartSubtopicIndex !== undefined) {
      navigation.setParams({ autoStartSubtopicIndex: undefined }); // Prevent loop
      if (autoStartSubtopicIndex < subtopics.length) {
        startSubtopicFlow(autoStartSubtopicIndex);
      }
    }
  }, [loading, subtopics, autoStartSubtopicIndex]);

  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'topicExam', subject: Subject, topic: Topic, topicId: topicId,
      subtopic: null, userClass: userData?.class,
      isOffline: isOffline || false, offlineData: isOffline ? offlineSubtopics : null,
    });
  };

  // Go to the parent Topic list — not history-based goBack — so this always
  // lands on the right screen no matter how tangled the stack got getting here.
  const handleBack = () => {
    navigation.navigate('Topic', { subject: Subject, userClass: userData?.class, isOffline: isOffline || false });
  };
  const handleHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  };

  if (loading) return <ActivityIndicator size="large" color="#864AF9" style={{ flex: 1, justifyContent: 'center' }} />;
  if (error) return <Text style={styles.errorText}>{error}</Text>;

  return (
    <View style={styles.subtopicsContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.subtopicsTitle}>{isOffline ? '📦 ' : ''}Subtopics for {Topic}</Text>
      </View>
      <FlatList
        data={subtopics}
        keyExtractor={(item) => item.SubtopicId ? item.SubtopicId.toString() : Math.random().toString()}
        renderItem={({ item, index }) => (
          <AnimatedSubtopicItem
            item={item}
            index={index}
            onPress={() => startSubtopicFlow(index)}
            hasQuestions={questionAvailability[item.SubtopicId]}
          />
        )}
        contentContainerStyle={styles.subtopicsList}
        showsVerticalScrollIndicator={false}
      />
      <AnimatedButton onPress={handleButtonPress} text="Take Exam" />
      <FloatingNavCluster onBack={handleBack} onHome={handleHome} />
    </View>
  );
};

const styles = StyleSheet.create({
  subtopicsContainer: { flex: 1, backgroundColor: '#F8F9FE', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  subtopicsTitle: { fontSize: 20, fontWeight: '700', color: '#2D3748', letterSpacing: 0.3, flex: 1, flexShrink: 1 },
  subtopicsList: { paddingBottom: 24 },
  subtopicItem: { backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 18, borderRadius: 16, borderLeftWidth: 5, borderLeftColor: '#864AF9', marginBottom: 14, shadowColor: '#864AF9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  subtopicItemEmpty: { backgroundColor: '#F4F4F6', borderLeftColor: '#B0B0B8', shadowOpacity: 0.04, elevation: 1 },
  subtopicItemDisabled: { opacity: 0.55 },
  subtopicText: { fontSize: 17, fontWeight: '600', color: '#2D3748', letterSpacing: 0.2, lineHeight: 24 },
  subtopicTextEmpty: { color: '#8A8A93' },
  emptyBadge: { fontSize: 12, fontWeight: '600', color: '#B0673A', backgroundColor: '#FBEBDD', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 8 },
  startButton: { backgroundColor: '#864AF9', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16, shadowColor: '#864AF9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  startButtonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  errorText: { fontSize: 16, color: '#F56565', textAlign: 'center', marginTop: 20 },
});

export default SubtopicScreen;