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

import { useUser } from '../../context/UserContext';
import { BackgroundMusicContext } from '../../context/BackgroundMusicProvider';
import QuestionRenderer from '../../renderer/QuestionRenderer';
import QuestionNumberStrip from '../../components/QuestionNumberStrip';
import CalculatorModal from '../../components/CalculatorModal';
import { updateStatsWidget } from '../../src/utils/widgetHelper';
// ── Shared district window — single source of truth for the whole app ─────────
import { isWindowActiveNow } from '../../src/utils/districtWindow';

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

      let syncAfter = Date.now(); // default: sync as soon as online

      if (isForcedOffline) {
        // Schedule sync to happen after 12:30 PM WAT + a random 1–30 min delay
        // to spread server load when the window closes.
        const now = new Date();
        const wat = new Date(now.getTime() + 60 * 60 * 1000);
        wat.setUTCHours(12, 30, 0, 0); // 12:30 PM WAT
        const targetUTC = wat.getTime() - 60 * 60 * 1000;
        const randomDelay = Math.floor(Math.random() * 30 * 60 * 1000) + 60 * 1000;
        syncAfter = targetUTC + randomDelay;
      }

      queue.push({ ...reportData, syncAfter, id: Date.now().toString() });
      await AsyncStorage.setItem('@offline_reports_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to queue report:', e);
    }
  };

  // ── Report submission — offline-aware ───────────────────────────────────────
  const submitReport = async (time_taken, percentage) => {
    let subjectCodes = null;
    let examTitle = null;

    if (selectedSubjects?.length > 0) {
      subjectCodes = selectedSubjects.map(s => s.slice(0, 3).toUpperCase()).join('');
      examTitle = `${selectedSubjects.join(', ')} for ${userData.class}`;
    }

    const reportPayload = {
      username: userData.username,
      score: percentage,
      subtopicId, examId, time_taken,
      class: userData.class,
      subjectCodes, examTitle,
    };

    // Use the shared checker — same logic as SubjectScreen, no duplication
    const isForcedOffline = isWindowActiveNow();
    const netState = await NetInfo.fetch();
    const isActuallyOffline = !netState.isConnected || isOffline;

    if (isForcedOffline) {
      setOfflineSyncMessage("Exam recorded! 🛡️ Result will sync automatically after the exam window closes.");
      await queueReport(reportPayload, true);
      return;
    }

    if (isActuallyOffline) {
      setOfflineSyncMessage("Thanks for practicing! 🛜 Connect to the internet later to sync your result.");
      await queueReport(reportPayload, false);
      return;
    }

    // Standard online submission
    try {
      const res = await fetch('https://homeedu.fsdgroup.com.ng/api/ExamReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
      });
      const data = await res.json();
      if (res.ok || data.status === 200) await refreshStats();
    } catch (error) {
      console.error('❌ Error submitting report:', error);
      // Network dropped exactly on submit — save locally
      await queueReport(reportPayload, false);
      setOfflineSyncMessage("Network dropped. 🛜 Result saved locally and will sync later.");
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
    const correct = questions.filter(q => q.isCorrect).length;
    const percentage = (correct / questions.length) * 100;
    const timeTaken = getTimeTaken();

    if (type === 'schoolWork') submitReport(timeTaken, percentage);

    if (questions.length < 8 && type !== 'schoolWork') {
      setShowThanksModal(true);
      return;
    }

    setResults({ correct, total: questions.length, percentage });
    setIsModalVisible(true);

    if (type !== 'schoolWork') submitReport(timeTaken, percentage);

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

  const currentQuestion = questions[currentIndex];
  const isCurrentSubmitted = submittedIds[currentQuestion?.QuestionId];

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