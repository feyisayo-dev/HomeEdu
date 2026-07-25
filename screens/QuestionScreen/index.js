import React, { createContext, useEffect, useState, useRef, useContext } from 'react';
import {
  View, Text, Image, Modal, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Animated, Dimensions,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BackHandler } from 'react-native';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import NetInfo from '@react-native-community/netinfo';
import * as Speech from 'expo-speech';
import { useUser } from '../../context/UserContext';
import { BackgroundMusicContext } from '../../context/BackgroundMusicProvider';
import QuestionRenderer from '../../renderer/QuestionRenderer';
import QuestionNumberStrip from '../../components/QuestionNumberStrip';
import CalculatorModal from '../../components/CalculatorModal';
import { updateStatsWidget } from '../../src/utils/widgetHelper';
// ── Shared district window — single source of truth for the whole app ─────────
import useDistrictWindow, { isWindowActiveNow } from '../../src/utils/districtWindow';

// ── Split files ───────────────────────────────────────────────────────────────
import styles from './questionStyles';
import Breadcrumb from './Breadcrumb';
import SmartMath from './SmartMath';
import RoughSheet from './RoughSheet';
import PassageModal from './PassageModal';
import useQuestionData from './useQuestionData';
import useTimer from './useTimer';
import { renderContentWithMath } from './renderFormatted';

const IN_FLIGHT_MODE = true;

const cleanTextForSpeech = (rawText) => {
  if (!rawText) return "";
  return String(rawText)
    // Replace Math LaTeX with a friendly word so it doesn't read the code
    .replace(/\$\$.*?\$\$/g, " this equation ")
    // Remove Bold tags
    .replace(/\*\*(.*?)\*\*/g, "$1")
    // Remove Underline tags
    .replace(/__(.*?)__/g, "$1")
    // Remove Color tags
    .replace(/\{#[A-Za-z0-9]+\}(.*?)\{\/\}/g, "$1")
    // Replace underscores used for "Fill in the gaps"
    .replace(/_+/g, " blank ")
    .trim();
};

// --- CORE SPEECH FUNCTION ---
const readQuestionAloud = (question) => {
  // Stop anything currently speaking before starting a new one
  Speech.stop();

  if (!question) return;

  const cleanQ = cleanTextForSpeech(question.content);
  let textToSpeak = cleanQ + ". ";

  // Append options if it's a multiple choice question
  if (
    (question.type === 'multiple_choice' || question.type === 'true_false') &&
    question.options
  ) {
    textToSpeak += "Here are the options. ";
    question.options.forEach((opt, index) => {
      const cleanOpt = cleanTextForSpeech(opt);
      textToSpeak += `Option ${index + 1}: ${cleanOpt}. `;
    });
  }

  // Start speaking
  Speech.speak(textToSpeak, {
    rate: 0.85, // Slightly slower, better for Grades 1-6
    pitch: 1.0,
    language: 'en', // Set to preferred locale, e.g., 'en-NG' or 'en-GB'
  });
};

const EnhancedQuestionScreen = ({ route, navigation }) => {
  const { userData } = useUser();
  const { playMemeSound } = useContext(BackgroundMusicContext);

  // ── Route params ────────────────────────────────────────────────────────────
  const {
    subtopicId, subtopic, selectedSubjects = [], type, subject, topic, examId,
    title, duration, instructions = {}, userClass,
    isOffline, offlineData, offlineQuestions,
  } = route.params;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [roughSheetVisible, setRoughSheetVisible] = useState(false);
  const [narrations, setNarrations] = useState({});
  const [passed, setPassed] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [passageModalVisible, setPassageModalVisible] = useState(false);
  const [submittedIds, setSubmittedIds] = useState({});
  const [results, setResults] = useState(null);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [streaks, setStreaks] = useState(0);
  const [stars, setStars] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showThanksModal, setShowThanksModal] = useState(false);
  const [unansweredModalVisible, setUnansweredModalVisible] = useState(false);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportQuestionId, setReportQuestionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [showNarrationExpanded, setShowNarrationExpanded] = useState(false);
  const { isOfflineModeActive } = useDistrictWindow();
  
  // ── Animations ──────────────────────────────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const narrationSlideAnim = useRef(new Animated.Value(0)).current;

  // ── Custom hooks ────────────────────────────────────────────────────────────
  const { questions, setQuestions, loading, userStatus } = useQuestionData({
    userData, isOffline, type, subject, topic, subtopic, subtopicId,
    title, userClass, examId, selectedSubjects, offlineData, offlineQuestions,
  });

  const { displayTime, timerUrgent, formatTime, getTimeTaken } = useTimer({
    type,
    duration,
    isModalVisible,
    onTimeout: () => computeResults(),
  });

  const hasCountdown = (type === 'schoolWork' || type === 'DistrictWork') && duration > 0;

  // Hoisted variables for safe effect dependencies
  const currentQuestion = questions[currentIndex];
  const currentQuestionId = currentQuestion?.QuestionId;
  const isCurrentSubmitted = submittedIds[currentQuestionId];

  useEffect(() => {
    // (Adjust the array to match exactly how classes are stored in your DB)
    const kidsClasses = [
      'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

    const shouldAutoSpeak = kidsClasses.includes(userData?.class);
    console.log("🗣️ [useEffect] Checking if we should auto-speak the question aloud:", shouldAutoSpeak);
    
    // 2. Play if applicable
    if (shouldAutoSpeak && currentQuestion) {
      readQuestionAloud(currentQuestion);
    }

    // 3. Cleanup: Stop speaking immediately if they manually move to the next question
    // or leave the screen before the audio finishes.
    return () => {
      Speech.stop();
    };
  }, [currentIndex, currentQuestionId, userData?.class]); // Using currentQuestionId prevents re-renders (like answering a question) from killing the audio

  // ── Progress animation ──────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: questions.length ? (currentIndex + 1) / questions.length : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex, questions.length]);

  // ── Narration animation ─────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(narrationSlideAnim, {
      toValue: showNarrationExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showNarrationExpanded]);

  // ── 67% shake easter egg ────────────────────────────────────────────────────
  useEffect(() => {
    if (isModalVisible && results) {
      if (Math.round(results.percentage) === 67) {
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      } else {
        shakeAnim.setValue(0);
      }
    }
  }, [isModalVisible, results]);

  // ── Widget updates ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (streaks !== undefined && stars !== undefined) {
      updateStatsWidget(streaks, stars);
    }
  }, [streaks, stars]);

  // ── Back button handling ────────────────────────────────────────────────────
  const handleBackAction = () => {
    setExitModalVisible(true);
    return true;
  };

  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', handleBackAction);
      return () => sub.remove();
    }, [questions, userAnswers])
  );

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerLeft: () => (
        <TouchableOpacity onPress={handleBackAction} style={{ marginLeft: 15, padding: 5 }}>
          <Text style={{ fontSize: 24 }}>⬅️</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const fetchStreaks = async () => {
    try {
      if (!userData?.username) return 0;
      const res = await axios.get(`https://homeedu.fsdgroup.com.ng/api/streaks?username=${userData.username}`);
      const count = res.data.streak_count || 0;
      setStreaks(count);
      return count;
    } catch { return 0; }
  };

  const fetchStars = async () => {
    try {
      if (!userData?.username) return 0;
      const formData = new FormData();
      formData.append('class', userData?.class);
      const res = await fetch(`https://homeedu.fsdgroup.com.ng/api/getleaderboard/${userData?.username}`, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.status === 200) {
        const u = json.data.find(u => u.username === userData?.username);
        const count = u?.stars || u?.total_stars || 0;
        setStars(count);
        return count;
      }
      return 0;
    } catch { return 0; }
  };

  const refreshStats = async () => {
    const newStreaks = await fetchStreaks();
    const newStars = await fetchStars();
    return { streaks: newStreaks, stars: newStars };
  };

  const [offlineSyncMessage, setOfflineSyncMessage] = useState(null);

  // ── Queue a report for later sync ───────────────────────────────────────────
  const queueReport = async (reportData, isForcedOffline) => {
    try {
      const raw = await AsyncStorage.getItem('@offline_reports_queue');
      const queue = raw ? JSON.parse(raw) : [];

      let syncAfter;

      if (isForcedOffline) {
        // 🛡️ DISTRICT WINDOW SPREAD: 1 to 5 minutes
        const minDelay = 60 * 1000;
        const maxDelay = 2 * 60 * 1000;
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        syncAfter = Date.now() + randomDelay;
      } else {
        // 🛜 NORMAL NETWORK DROP: 5 to 30 seconds
        const minDelay = 5 * 1000;
        const maxDelay = 30 * 1000;
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        syncAfter = Date.now() + randomDelay;
      }

      queue.push({ ...reportData, syncAfter, id: Date.now().toString() });
      await AsyncStorage.setItem('@offline_reports_queue', JSON.stringify(queue));

      const delayInSeconds = Math.round((syncAfter - Date.now()) / 1000);
      console.log(`⏱️ [Queue] Report saved. Scheduled to sync in ${delayInSeconds} seconds.`);

      // 🚀 THE FIX: Return the delay so the UI can format a message!
      return delayInSeconds;
    } catch (e) {
      console.error('Failed to queue report:', e);
      return 0; // Fallback
    }
  };

  // ── Report submission — offline-aware ───────────────────────────────────────
  const submitReport = async (time_taken, percentage) => {
    console.log("➡️ [submitReport] Function started with:", { time_taken, percentage });

    // Pre-define a base payload just in case a crash happens BEFORE we finish formatting strings.
    // This guarantees the student's score and time are never lost.
    let reportPayload = {
      username: userData?.username || 'unknown_user',
      score: percentage,
      subtopicId, examId, time_taken,
      class: userData?.class || 'unknown_class',
      subjectCodes: 'ERR',
      examTitle: 'Fallback Title',
    };

    try {
      let subjectCodes = null;
      let examTitle = null;

      console.log("📚 [submitReport] What are the selected subjects?", selectedSubjects);

      // 1. Normalize whatever garbage the route passed us into a clean Array.
      // This absolutely prevents the .map() crash.
      const normalizedItems = Array.isArray(selectedSubjects)
        ? selectedSubjects
        : (typeof selectedSubjects === 'string' && selectedSubjects.trim() !== '' ? [selectedSubjects] : []);

      if (normalizedItems.length > 0) {
        console.log("📚 [submitReport] Normalized subjects array:", normalizedItems);

        // 2. Generate your ID safely (e.g., 'EVA' or 'MATENG')
        subjectCodes = normalizedItems.map(s => {
          const itemName = typeof s === 'string' ? s : (s?.name || s?.title || s?.subject || '');
          return itemName ? itemName.slice(0, 3).toUpperCase() : '';
        }).join('');

        // 3. Generate the human-readable exam title
        const titleNames = normalizedItems.map(s => typeof s === 'string' ? s : (s?.name || s?.title || s?.subject || 'Unknown'));
        examTitle = `${titleNames.join(', ')} practice for ${userData?.class || 'Unknown Class'}`;
      }

      // Overwrite the base payload with the beautifully formatted one
      reportPayload = {
        username: userData?.username || 'unknown_user',
        score: percentage,
        subtopicId, examId, time_taken,
        class: userData?.class || 'unknown_class',
        subjectCodes,
        examTitle,
      };

      console.log("📦 [submitReport] Report payload prepared:", reportPayload);

      console.log("🛜 [submitReport] Checking network state...");
      const netState = await NetInfo.fetch();
      const isActuallyOffline = !netState.isConnected || isOffline;
      console.log("📡 [submitReport] Network variables evaluated:", {
        isOfflineFlag: isOffline,
        netStateIsConnected: netState.isConnected,
        isActuallyOffline,
        isOfflineModeActive
      });

      // 🚀 THE FIX: Use the global Master Flag
      if (isOfflineModeActive) {
        console.log("🛡️ [submitReport] Master Flag is TRUE. Queuing instantly.");

        // Capture the delay returned by queueReport
        const delayInSeconds = await queueReport(reportPayload, true);

        // Format it nicely for the user
        const minutes = Math.floor(delayInSeconds / 60);
        const seconds = delayInSeconds % 60;
        const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds} seconds`;

        setOfflineSyncMessage(`Exam recorded! 🛡️ Keep the app open. Result will sync automatically in ~${timeString}.`);
        console.log("🛑 [submitReport] Exiting function early after Master Flag queue.");
        return;
      }

      if (isActuallyOffline) {
        console.log("🔌 [submitReport] Device is actually offline. Queuing report locally.");

        const delayInSeconds = await queueReport(reportPayload, false);
        const seconds = delayInSeconds % 60;

        setOfflineSyncMessage(`Thanks for practicing! 🛜 Turn on your data/Wi-Fi to sync your result. (Ready in ~${seconds}s)`);
        console.log("🛑 [submitReport] Exiting function early after offline queue.");
        return;
      }

      console.log("🌐 [submitReport] Device is online. Attempting API submission...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏱️ [submitReport] Timeout triggered! Aborting fetch request.");
        controller.abort();
      }, 5000);

      console.log("📤 [submitReport] Sending POST request to /api/ExamReport...");
      const res = await fetch('https://homeedu.fsdgroup.com.ng/api/ExamReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`📥 [submitReport] Received response with HTTP status: ${res.status}`);

      // FIX: Force a manual throw if the server is overwhelmed (500/503)
      if (!res.ok) {
        console.error(`🚨 [submitReport] Response NOT ok. Throwing error for status: ${res.status}`);
        throw new Error(`Server overloaded with status: ${res.status}`);
      }

      const data = await res.json();
      console.log("📄 [submitReport] Parsed JSON response:", data);

      if (data.status === 200 || data.success) {
        console.log("✅ [submitReport] API returned success. Refreshing stats...");
        await refreshStats();
        console.log("🔄 [submitReport] Stats refreshed successfully.");
      } else {
        console.error("⚠️ [submitReport] API returned failure in JSON payload. Throwing error.");
        throw new Error('API returned failure status in JSON payload');
      }

    } catch (error) {
      // THIS CATCHES EVERYTHING: API failures, timeouts, AND frontend JS crashes.
      console.error('❌ [submitReport] Error caught in try-catch block:', error.message);

      // Now, if the server chokes, the network drops, or a string crashes, it GUARANTEES a queue.
      console.log("🗂️ [submitReport] Forcing local queue due to error.");
      await queueReport(reportPayload, false);
      setOfflineSyncMessage("Network unstable. 🛜 Result saved locally and will sync later.");
      console.log("🏁 [submitReport] Fallback error queueing complete.");
    }
  };

  // ── Question report ─────────────────────────────────────────────────────────
  const handleOpenReport = (questionId) => {
    setReportQuestionId(questionId);
    setReportReason('');
    setReportModalVisible(true);
  };

  const sendQuestionReport = async () => {
    if (!reportReason.trim()) { Alert.alert('Validation', 'Please enter a reason.'); return; }
    setIsSubmitting(true);
    try {
      await axios.post(`https://homeedu.fsdgroup.com.ng/api/report/${reportQuestionId}`, { reason: reportReason });
      setReportModalVisible(false);
      Alert.alert('Success', 'Thanks for the feedback!');
    } catch {
      Alert.alert('Error', 'Could not report the question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Answer handling ─────────────────────────────────────────────────────────
  const handleAnswerSelected = (questionId, answer) => {
    if (submittedIds[questionId]) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    const currentQ = questions[currentIndex];
    const currentId = currentQ.QuestionId;
    const selected = userAnswers[currentId];

    if (!selected) { Alert.alert('Answer Required', 'Please select an answer before continuing.'); return; }

    if (instructions?.hide_answers) {
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex] = { ...currentQ, isCorrect: selected === currentQ.answer };
      setQuestions(updatedQuestions);
      handleNextQuestion();
      return;
    }

    setSubmittedIds(prev => ({ ...prev, [currentId]: true }));

    const isCorrect = selected === currentQ.answer;
    const updatedQuestions = [...questions];
    updatedQuestions[currentIndex] = { ...currentQ, isCorrect };
    setQuestions(updatedQuestions);

    playMemeSound(isCorrect ? 'correct' : 'wrong');

    // Narration — skip entirely during district window (no API calls allowed)
    if (!narrations[currentId]) {
      if (isOffline || isWindowActiveNow()) {
        setNarrations(prev => ({ ...prev, [currentId]: [{ type: 'text', value: '🛜 Come online to view the detailed explanation.' }] }));
      } else {
        try {
          const res = await fetch(`https://homeedu.fsdgroup.com.ng/api/narration/${currentId}`);
          const data = await res.json();
          if (res.ok && data.data?.length > 0) {
            setNarrations(prev => ({ ...prev, [currentId]: JSON.parse(data.data[0].Content) }));
          } else {
            setNarrations(prev => ({ ...prev, [currentId]: [{ type: 'text', value: 'No narration available' }] }));
          }
        } catch {
          setNarrations(prev => ({ ...prev, [currentId]: [{ type: 'text', value: '⚠️ Network error. Could not load narration.' }] }));
        }
      }
    }

    // Streak update — skip during district window
    if (!isWindowActiveNow()) {
      try {
        await fetch('https://homeedu.fsdgroup.com.ng/api/streaks/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: userData.username }),
        });
      } catch { }
    }
  };

  const handleNextQuestion = () => {
    setShowNarrationExpanded(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinalSubmit();
    }
  };

  // ── Results ─────────────────────────────────────────────────────────────────
  const computeResults = () => {
    console.log("➡️ [computeResults] Function started");

    const correct = questions.filter(q => q.isCorrect).length;
    const percentage = (correct / questions.length) * 100;
    const timeTaken = getTimeTaken();

    console.log(`📊 [computeResults] Metrics calculated: Correct=${correct}/${questions.length}, Percentage=${percentage}%, TimeTaken=${timeTaken}`);
    console.log(`📝 [computeResults] Current quiz type: ${type}`);

    if (type === 'schoolWork') {
      console.log("🏫 [computeResults] Type is 'schoolWork'. Submitting report now...");
      submitReport(timeTaken, percentage);
    }

    if (questions.length < 8 && type !== 'schoolWork') {
      console.log("⚠️ [computeResults] FATAL: Questions < 8 AND not 'schoolWork'. Showing Thanks Modal and EXITING function early!");
      setShowThanksModal(true);
      return;
    }

    console.log("✅ [computeResults] Passed < 8 check. Setting results and showing modal.");
    setResults({ correct, total: questions.length, percentage });
    setIsModalVisible(true);

    if (type !== 'schoolWork') {
      console.log("🚀 [computeResults] Type is not 'schoolWork'. Submitting report now...");
      submitReport(timeTaken, percentage);
    }

    console.log(`🎓 [computeResults] Setting passed status. Score >= 70: ${percentage >= 70}`);
    setPassed(percentage >= 70);
  };

  const handleFinalSubmit = () => {
    const unanswered = questions
      .map((q, idx) => (!userAnswers[q.QuestionId] ? idx + 1 : null))
      .filter(Boolean);

    if (unanswered.length > 0) {
      setUnansweredQuestions(unanswered);
      setUnansweredModalVisible(true);
    } else {
      computeResults();
    }
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#864AF9" />
        <Text style={styles.loadingText}>Loading questions...</Text>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.mainContainer}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Breadcrumb
          currentQuestion={{
            ...currentQuestion,
            class: userClass || currentQuestion?.class,
            subject: subject || currentQuestion?.subject,
            topic: type === 'schoolWork' ? title : (topic || currentQuestion?.topic),
          }}
        />

        <View style={styles.headerTop}>
          <View style={styles.questionCounter}>
            <Text style={styles.counterText}>{currentIndex + 1} / {questions.length}</Text>
          </View>

          <TouchableOpacity onPress={() => setRoughSheetVisible(true)} style={{ backgroundColor: '#eee', padding: 8, borderRadius: 20, marginRight: 10 }}>
            <Text style={{ fontSize: 16 }}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCalculatorVisible(true)} style={{ backgroundColor: '#eee', padding: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ccc' }}>
            <Text style={{ fontSize: 16 }}>🧮</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ 
              backgroundColor: '#eee', 
              padding: 8, 
              borderRadius: 20, 
              marginRight: 10, 
              borderWidth: 1, 
              borderColor: '#ccc',
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
            onPress={() => readQuestionAloud(currentQuestion)}
          >
            <Ionicons name="volume-medium" size={18} color="#864AF9" />
          </TouchableOpacity>

          <View style={[styles.timerContainer, timerUrgent && { backgroundColor: '#FFE5E5', borderColor: '#EF4444', borderWidth: 1, borderRadius: 8 }]}>
            <Text style={styles.timerIcon}>{hasCountdown ? '⏳' : '⏱️'}</Text>
            <Text style={[styles.timerText, timerUrgent && { color: '#EF4444', fontWeight: '900' }]}>{formatTime(displayTime)}</Text>
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>

      {/* ── Question Content ── */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {questions.length > 0 && currentIndex < questions.length ? (
          <View style={styles.questionWrapper}>

            {currentQuestion.passage && (currentQuestion.passage.Content || currentQuestion.passage) && (
              <TouchableOpacity style={styles.passageButton} onPress={() => setPassageModalVisible(true)} activeOpacity={0.8}>
                <Text style={styles.passageButtonText}>📄 Read Passage</Text>
              </TouchableOpacity>
            )}

            <QuestionRenderer
              question={currentQuestion}
              onAnswerSelected={handleAnswerSelected}
              selectedAnswer={userAnswers[currentQuestion.QuestionId]}
              isSubmitted={isCurrentSubmitted}
            />

            {currentQuestion.caption && (
              <View style={styles.captionContainer}>
                <View style={styles.captionIcon}><Text style={styles.captionIconText}>💡</Text></View>
                <View style={styles.captionContent}><Text style={styles.captionText}>{currentQuestion.caption}</Text></View>
              </View>
            )}

            {!isOffline && (
              <View style={styles.reportContainer}>
                <TouchableOpacity style={styles.reportButton} onPress={() => handleOpenReport(currentQuestion.QuestionId)}>
                  <Ionicons name="flag-outline" size={16} color="#FF4444" />
                  <Text style={styles.reportText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isCurrentSubmitted ? (
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {instructions?.hide_answers
                    ? (currentIndex === questions.length - 1 ? 'Finish Exam' : 'Next Question →')
                    : 'Check Answer'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.afterSubmitContainer}>
                {!instructions?.hide_answers && (
                  <>
                    <TouchableOpacity style={styles.narrationToggle} onPress={() => setShowNarrationExpanded(!showNarrationExpanded)}>
                      <Text style={styles.narrationToggleText}>{showNarrationExpanded ? '▼ Hide' : '▶ View'} Explanation</Text>
                    </TouchableOpacity>

                    {showNarrationExpanded && (
                      <Animated.View style={[styles.narrationContainer, { opacity: narrationSlideAnim }]}>
                        <ScrollView style={styles.narrationScroll} nestedScrollEnabled contentContainerStyle={{ paddingBottom: 20 }}>
                          {narrations[currentQuestion.QuestionId]?.map((item, idx) => {
                            if (item.type === 'text') {
                              return (
                                <View key={idx} style={styles.narrationTextWrapper}>
                                  {renderContentWithMath(item.value, styles.narrationText)}
                                </View>
                              );
                            } else if (item.type === 'image') {
                              return <Image key={idx} source={{ uri: item.value }} style={styles.narrationImage} />;
                            } else if (item.type === 'video') {
                              return <Video key={idx} source={{ uri: item.value }} style={styles.narrationVideo} useNativeControls />;
                            }
                            return null;
                          })}
                        </ScrollView>
                      </Animated.View>
                    )}
                  </>
                )}
                <TouchableOpacity style={styles.nextButton} onPress={handleNextQuestion}>
                  <Text style={styles.nextButtonText}>{currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noQuestionsText}>No questions available</Text>
        )}
      </ScrollView>

      {/* ── Bottom Strip ── */}
      <View style={styles.bottomStrip}>
        <QuestionNumberStrip
          total={questions.length}
          currentIndex={currentIndex}
          onPressNumber={(index) => { setCurrentIndex(index); setShowNarrationExpanded(false); }}
          userAnswers={userAnswers}
          questions={questions}
        />
      </View>

      {/* ── Modals ── */}
      <RoughSheet visible={roughSheetVisible} onClose={() => setRoughSheetVisible(false)} />

      <PassageModal
        visible={passageModalVisible}
        onClose={() => setPassageModalVisible(false)}
        content={currentQuestion?.passage?.Content || currentQuestion?.passage || ''}
      />

      {/* Results Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateX: shakeAnim }] }]}>
            {results && (
              <>
                {(() => {
                  const pct = results.percentage;
                  let sticker;
                  if (pct >= 90) sticker = require('../../assets/gold_star.png');
                  else if (pct >= 70) sticker = require('../../assets/silver_star.png');
                  else if (pct >= 50) sticker = require('../../assets/bronze_star.png');
                  else sticker = require('../../assets/dull_star.png');
                  return <Image source={sticker} style={styles.stickerImage} />;
                })()}
                <Text style={styles.resultTitle}>{results.percentage >= 70 ? 'Great Job! 🎉' : 'Keep Practicing! 💪'}</Text>
                <View style={styles.scoreContainer}>
                  <Text style={styles.resultText}>You scored {results.correct} out of {results.total}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.resultPercentage}>{Math.round(results.percentage)}%</Text>
                </View>

                {/* Offline sync status — only shown when report was queued */}
                {offlineSyncMessage && (
                  <View style={{ backgroundColor: '#F0EDFF', padding: 12, borderRadius: 8, marginVertical: 10, width: '100%' }}>
                    <Text style={{ color: '#6D28D9', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
                      {offlineSyncMessage}
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.modalButton} onPress={() => { setIsModalVisible(false); navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] }); }}>
                  <Text style={styles.modalButtonText}>BACK TO DASHBOARD</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#FFFFFF', marginTop: 10 }]} onPress={() => { setIsModalVisible(false); navigation.goBack(); }}>
                  <Text style={[styles.modalButtonText, { color: '#000000' }]}>🔙 BACK</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Thanks Modal */}
      <Modal transparent visible={showThanksModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {(!IN_FLIGHT_MODE && (userStatus === 'free' || userStatus === 'beta')) ? (
              <>
                <View style={styles.iconContainer}><Text style={{ fontSize: 40 }}>🔒</Text></View>
                <Text style={styles.thanksText}>Thanks for the practice!</Text>
                <View style={styles.upsellBox}>
                  <Text style={styles.upsellTitle}>🚀 UNLOCK PREMIUM</Text>
                  <View style={styles.upsellList}>
                    <Text style={styles.upsellItem}>⭐ Answer more than 6 questions</Text>
                    <Text style={styles.upsellItem}>🏆 Join the Global Leaderboard</Text>
                    <Text style={styles.upsellItem}>📊 Unlock detailed performance reports</Text>
                    <Text style={styles.upsellItem}>🧠 Get step-by-step explanations</Text>
                    <Text style={styles.upsellItem}>📩 Send weekly reports to parents</Text>
                  </View>
                  <TouchableOpacity style={styles.upgradeBtn} onPress={() => { setShowThanksModal(false); navigation.navigate('Subscription'); }}>
                    <Text style={styles.upgradeBtnText}>UPGRADE NOW</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={styles.iconContainer}><Text style={{ fontSize: 40 }}>🎉</Text></View>
                <Text style={styles.thanksText}>Thanks for the practice!</Text>
                <Text style={styles.subText}>Keep going! Every question makes you sharper.</Text>
              </>
            )}
            <TouchableOpacity style={styles.modalButton} onPress={() => { setShowThanksModal(false); navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] }); }}>
              <Text style={styles.modalButtonText}>BACK TO DASHBOARD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#12b876', marginTop: 10 }]} onPress={() => { setShowThanksModal(false); navigation.goBack(); }}>
              <Text style={[styles.modalButtonText, { color: '#fefefe' }]}>🔙 BACK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal animationType="slide" transparent visible={reportModalVisible} onRequestClose={() => setReportModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.reportModalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="alert-circle" size={24} color="#FF4444" />
              <Text style={styles.reportModalTitle}>Report Question</Text>
            </View>
            <Text style={styles.reportModalSubtitle}>Please tell us what is wrong with this question:</Text>
            <TextInput style={styles.reportInput} placeholder="e.g., Wrong answer, Typo, Confusing image..." placeholderTextColor="#999" multiline numberOfLines={4} value={reportReason} onChangeText={setReportReason} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.reportModalBtn, styles.cancelBtn]} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reportModalBtn, styles.submitReportBtn]} onPress={sendQuestionReport} disabled={isSubmitting}>
                <Text style={styles.submitBtnText}>{isSubmitting ? 'Sending...' : 'Submit Report'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exit Modal */}
      <Modal visible={exitModalVisible} transparent animationType="fade" onRequestClose={() => setExitModalVisible(false)}>
        <View style={styles.exitOverlay}>
          <View style={styles.exitContainer}>
            <View style={styles.exitHeader}><Text style={{ fontSize: 40 }}>⚠️</Text></View>
            <Text style={styles.exitTitle}>Leaving so soon?</Text>
            <Text style={styles.exitMessage}>You have unfinished questions. If you leave now, your progress will be lost.</Text>
            <View style={styles.exitButtonColumn}>
              <TouchableOpacity style={[styles.exitBtn, styles.exitBtnPrimary]} onPress={() => { setExitModalVisible(false); computeResults(); }}>
                <Text style={styles.exitBtnTextWhite}>SUBMIT & FINISH</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exitBtn, styles.exitBtnDestructive]} onPress={() => { setExitModalVisible(false); navigation.dispatch(CommonActions.goBack()); }}>
                <Text style={styles.exitBtnTextRed}>DISCARD & EXIT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.exitBtn, styles.exitBtnGhost]} onPress={() => setExitModalVisible(false)}>
                <Text style={styles.exitBtnTextBlack}>Stay and Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unanswered Modal */}
      <Modal visible={unansweredModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.resultTitle}>⚠️ Unanswered Questions</Text>
            <Text style={styles.narrationText}>You haven't answered questions: {unansweredQuestions.join(', ')}</Text>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#fff', marginTop: 12 }]} onPress={() => setUnansweredModalVisible(false)}>
              <Text style={[styles.modalButtonText, { color: '#000' }]}>Review Answers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { marginTop: 10 }]} onPress={() => { setUnansweredModalVisible(false); computeResults(); }}>
              <Text style={styles.modalButtonText}>Submit Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CalculatorModal visible={calculatorVisible} onClose={() => setCalculatorVisible(false)} userClass={userData?.class} />
    </View>
  );
};

export default EnhancedQuestionScreen;