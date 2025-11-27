import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    Image,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import axios from 'axios';
import QuestionRenderer from '../renderer/QuestionRenderer';
import { useUser } from '../context/UserContext';
import { Video } from 'expo-av';
import QuestionNumberStrip from '../components/QuestionNumberStrip';
import Katex from 'react-native-katex';

const { width } = Dimensions.get('window');

const EnhancedQuestionScreen = ({ route, navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { userData } = useUser();
    const [narrations, setNarrations] = useState({});
    const [passed, setPassed] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [results, setResults] = useState(null);
    const [showNarrations, setShowNarrations] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { subtopicId, subtopic, selectedSubjects, type, subject, topic } = route.params;
    const [unansweredModalVisible, setUnansweredModalVisible] = useState(false);
    const [unansweredQuestions, setUnansweredQuestions] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showNarrationExpanded, setShowNarrationExpanded] = useState(false);

    // Animation refs
    const progressAnim = useRef(new Animated.Value(0)).current;
    const narrationSlideAnim = useRef(new Animated.Value(0)).current;

    // Timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            if (startTime && !isModalVisible) {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime, isModalVisible]);

    // Progress animation
    useEffect(() => {
        const progress = (currentIndex + 1) / questions.length;
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [currentIndex, questions.length]);

    // Narration slide animation
    useEffect(() => {
        Animated.timing(narrationSlideAnim, {
            toValue: showNarrationExpanded ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [showNarrationExpanded]);

    const renderContentWithMath = (text, textStyle = {}) => {
        const parts = text.split(/(\$\$.*?\$\$)/g);
        return (
            <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
            }}>
                {parts.map((part, index) => {
                    if (part.startsWith('$$') && part.endsWith('$$')) {
                        const math = part.slice(2, -2).trim();
                        return (
                            <View key={`math-${index}`} style={{ width: '100%', marginVertical: 8 }}>
                                <ErrorSafeMath math={math} />
                            </View>
                        );
                    }else {
                        return (
                            <Text key={`text-${index}`} style={textStyle}>
                                {part}
                            </Text>
                        );
                    }
                })}
            </View>
        );
    };

    const ErrorSafeMath = ({ math }) => {
        const [hasError, setHasError] = useState(false);
        if (hasError) {
            return <Text style={{ color: '#F56565', fontStyle: 'italic' }}>[Math formula]</Text>;
        }
        return (
            <Katex
                expression={math}
                displayMode={false}
                throwOnError={false}
                style={{ minHeight: 30 }}
                inlineStyle={inlineStyle}
                onError={() => setHasError(true)}
            />
        );
    };
    const inlineStyle = `
html, body {
  background-color: transparent;
  margin: 0;
  padding: 0;
}

.katex {
  font-size: 3em;
  vertical-align: baseline;
}

.katex-display {
  margin: 0;
}
`;

    useEffect(() => {
        setStartTime(Date.now());
    }, []);

    useEffect(() => {
        if (!userData) return;

        const fetchQuestions = async () => {
            try {
                let payload = { class: userData.class };

                switch (type) {
                    case 'JAMB':
                        if (selectedSubjects.length > 0) {
                            payload.JAMB_SUBJECT = selectedSubjects.join(',');
                            payload.total_questions = 200;
                        }
                        break;
                    case 'classExam':
                        payload.subject = subject;
                        payload.total_questions = 60;
                        break;
                    case 'subjectExam':
                        payload.subject = subject;
                        payload.total_questions = 40;
                        break;
                    case 'topicExam':
                        payload.subject = subject;
                        payload.topic = topic;
                        payload.total_questions = 30;
                        break;
                    case 'subtopicExam':
                        payload.subject = subject;
                        payload.topic = topic;
                        payload.subtopic = subtopic;
                        payload.total_questions = 20;
                        break;
                    default:
                        payload.total_questions = 10;
                }

                const response = await axios.post(
                    `https://homeedu.fsdgroup.com.ng/api/ExamQuestions`,
                    payload
                );

                const apiData = response.data.data || [];
                const parsedQuestions = apiData.map((q) => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : null,
                }));
                setQuestions(parsedQuestions);
            } catch (error) {
                console.error('Error fetching questions:', error);
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [userData]);

    const handleAnswerSelected = (questionId, answer) => {
        setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        const selectedAnswer = userAnswers[questions[currentIndex].QuestionId];

        if (!selectedAnswer) {
            Alert.alert('Answer Required', 'Please select an answer before checking.');
            return;
        }

        setShowNarrations(true);

        const isCorrect = selectedAnswer === questions[currentIndex].answer;
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex] = { ...questions[currentIndex], isCorrect };
        setQuestions(updatedQuestions);

        try {
            await fetch(`https://homeedu.fsdgroup.com.ng/api/streaks/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: userData.username }),
            });
        } catch (error) {
            console.error('Error updating streak:', error);
        }

        try {
            const questionId = questions[currentIndex].QuestionId;
            const response = await fetch(
                `https://homeedu.fsdgroup.com.ng/api/narration/${questionId}`
            );
            const data = await response.json();

            const newNarrations = { ...narrations };
            if (response.ok && data.data && data.data.length > 0) {
                newNarrations[questionId] = JSON.parse(data.data[0].Content);
            } else {
                newNarrations[questionId] = [{ type: 'text', value: 'No narration available' }];
            }
            setNarrations(newNarrations);
        } catch (error) {
            console.error('Error fetching narration:', error);
        }
    };

    const handleNextQuestion = () => {
        setShowNarrations(false);
        setShowNarrationExpanded(false);
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleFinalSubmit();
        }
    };

    const submitReport = async (time_taken, percentage) => {
        let examId = null;
        let subjectCodes = null;
        let examTitle = null;

        if (selectedSubjects && selectedSubjects.length > 0) {
            const prefix = selectedSubjects[0].slice(0, 3).toUpperCase();
            const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            examId = `${prefix}${randomCode}`;
            subjectCodes = selectedSubjects.map(s => s.slice(0, 3).toUpperCase()).join('');
            examTitle = `${selectedSubjects.join(' ')} for ${userData.class}`;
        }

        const reportData = {
            username: userData.username,
            score: percentage,
            subtopicId: subtopicId,
            examId: examId,
            time_taken: time_taken,
            class: userData.class,
            subjectCodes: subjectCodes,
            examTitle: examTitle,
        };

        try {
            const res = await fetch('https://homeedu.fsdgroup.com.ng/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData),
            });
        } catch (error) {
            console.error('Error submitting report:', error);
        }
    };

    const computeResults = () => {
        const correctAnswers = questions.filter((q) => q.isCorrect).length;
        const percentage = (correctAnswers / questions.length) * 100;
        setResults({ correct: correctAnswers, total: questions.length, percentage });
        setIsModalVisible(true);

        const timeTakenInSeconds = elapsedTime;
        const pad = (num) => String(num).padStart(2, '0');
        const timeTaken = `${pad(Math.floor(timeTakenInSeconds / 60))}:${pad(timeTakenInSeconds % 60)}`;

        submitReport(timeTaken, percentage);
        setPassed(percentage >= 70);
    };

    const handleFinalSubmit = () => {
        const unanswered = questions
            .map((q, idx) => (!userAnswers[q.QuestionId] ? idx + 1 : null))
            .filter((idx) => idx !== null);

        if (unanswered.length > 0) {
            setUnansweredQuestions(unanswered);
            setUnansweredModalVisible(true);
        } else {
            computeResults();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#864AF9" />
                <Text style={styles.loadingText}>Loading questions...</Text>
            </View>
        );
    }

    return (
        <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.questionCounter}>
                        <Text style={styles.counterText}>
                            {currentIndex + 1} / {questions.length}
                        </Text>
                    </View>
                    <View style={styles.timerContainer}>
                        <Text style={styles.timerIcon}>⏱️</Text>
                        <Text style={styles.timerText}>{formatTime(elapsedTime)}</Text>
                    </View>
                </View>

                <View style={styles.progressBarContainer}>
                    <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                </View>
            </View>

            {/* Question Content */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {questions.length > 0 && currentIndex < questions.length ? (
                    <View style={styles.questionWrapper}>
                        <QuestionRenderer
                            question={questions[currentIndex]}
                            onAnswerSelected={handleAnswerSelected}
                            selectedAnswer={userAnswers[questions[currentIndex].QuestionId]}
                            isSubmitted={showNarrations}
                        />

                        {/* Action Button */}
                        {!showNarrations ? (
                            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                <Text style={styles.submitButtonText}>Check Answer</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.afterSubmitContainer}>
                                <TouchableOpacity
                                    style={styles.narrationToggle}
                                    onPress={() => setShowNarrationExpanded(!showNarrationExpanded)}
                                >
                                    <Text style={styles.narrationToggleText}>
                                        {showNarrationExpanded ? '▼ Hide' : '▶ View'} Explanation
                                    </Text>
                                </TouchableOpacity>

                                {showNarrationExpanded && (
                                    <Animated.View
                                        style={[
                                            styles.narrationContainer,
                                            { opacity: narrationSlideAnim },
                                        ]}
                                    >
                                        <ScrollView style={styles.narrationScroll}>
                                            {narrations[questions[currentIndex].QuestionId]?.map(
                                                (item, idx) => {
                                                    if (item.type === 'text') {
                                                        return (
                                                            <View key={idx} style={styles.narrationTextWrapper}>
                                                                {renderContentWithMath(
                                                                    item.value,
                                                                    styles.narrationText
                                                                )}
                                                            </View>
                                                        );
                                                    } else if (item.type === 'image') {
                                                        return (
                                                            <Image
                                                                key={idx}
                                                                source={{ uri: item.value }}
                                                                style={styles.narrationImage}
                                                            />
                                                        );
                                                    } else if (item.type === 'video') {
                                                        return (
                                                            <Video
                                                                key={idx}
                                                                source={{ uri: item.value }}
                                                                style={styles.narrationVideo}
                                                                useNativeControls
                                                            />
                                                        );
                                                    }
                                                    return null;
                                                }
                                            )}
                                        </ScrollView>
                                    </Animated.View>
                                )}

                                <TouchableOpacity
                                    style={styles.nextButton}
                                    onPress={handleNextQuestion}
                                >
                                    <Text style={styles.nextButtonText}>
                                        {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    <Text style={styles.noQuestionsText}>No questions available</Text>
                )}
            </ScrollView>

            {/* Bottom Navigation Strip */}
            <View style={styles.bottomStrip}>
                <QuestionNumberStrip
                    total={questions.length}
                    currentIndex={currentIndex}
                    onPressNumber={(index) => {
                        setCurrentIndex(index);
                        setShowNarrations(false);
                        setShowNarrationExpanded(false);
                    }}
                    userAnswers={userAnswers}
                    questions={questions}
                />
            </View>

            {/* Results Modal */}
            <Modal visible={isModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {results && (
                            <>
                                {(() => {
                                    const percentage = results.percentage;
                                    let sticker;
                                    if (percentage >= 90) sticker = require('../assets/gold_star.png');
                                    else if (percentage >= 70) sticker = require('../assets/silver_star.png');
                                    else if (percentage >= 50) sticker = require('../assets/bronze_star.png');
                                    else sticker = require('../assets/dull_star.png');

                                    return <Image source={sticker} style={styles.stickerImage} />;
                                })()}

                                <Text style={styles.resultTitle}>
                                    {results.percentage >= 70 ? 'Great Job! 🎉' : 'Keep Practicing! 💪'}
                                </Text>
                                <Text style={styles.resultText}>
                                    You scored {results.correct} out of {results.total}
                                </Text>
                                <Text style={styles.resultPercentage}>{Math.round(results.percentage)}%</Text>

                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => {
                                        setIsModalVisible(false);
                                        navigation.reset({
                                            index: 0,
                                            routes: [{ name: 'Dashboard' }],
                                        });
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Back to Dashboard</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Unanswered Questions Modal */}
            <Modal visible={unansweredModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>⚠️ Unanswered Questions</Text>
                        <Text style={styles.modalSubtext}>
                            You haven't answered questions: {unansweredQuestions.join(', ')}
                        </Text>

                        <TouchableOpacity
                            style={styles.modalButtonSecondary}
                            onPress={() => setUnansweredModalVisible(false)}
                        >
                            <Text style={styles.modalButtonSecondaryText}>Review Answers</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setUnansweredModalVisible(false);
                                computeResults();
                            }}
                        >
                            <Text style={styles.modalButtonText}>Submit Anyway</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8F9FE',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    questionCounter: {
        backgroundColor: '#864AF9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    counterText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    timerIcon: {
        fontSize: 18,
        marginRight: 6,
    },
    timerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2D3748',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#864AF9',
    },
    scrollContent: {
        flex: 1,
        padding: 16,
    },
    questionWrapper: {
        marginBottom: 100,
    },
    submitButton: {
        backgroundColor: '#864AF9',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    afterSubmitContainer: {
        marginTop: 20,
    },
    narrationToggle: {
        backgroundColor: '#F7F9FC',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12,
    },
    narrationToggleText: {
        color: '#864AF9',
        fontSize: 16,
        fontWeight: '600',
    },
    narrationContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: 300,
    },
    narrationScroll: {
        maxHeight: 280,
    },
    narrationTextWrapper: {
        marginBottom: 12,
    },
    narrationText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#2D3748',
    },
    narrationImage: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        marginBottom: 12,
        resizeMode: 'contain',
    },
    narrationVideo: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
    },
    nextButton: {
        backgroundColor: '#48BB78',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#48BB78',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    bottomStrip: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FE',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#718096',
    },
    noQuestionsText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#A0AEC0',
        marginTop: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        width: '85%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    stickerImage: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2D3748',
        marginBottom: 8,
    },
    resultText: {
        fontSize: 17,
        color: '#718096',
        marginBottom: 8,
    },
    resultPercentage: {
        fontSize: 48,
        fontWeight: '800',
        color: '#864AF9',
        marginBottom: 24,
    },
    modalButton: {
        backgroundColor: '#864AF9',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginTop: 8,
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    modalButtonSecondary: {
        backgroundColor: '#F7F9FC',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 2,
        borderColor: '#864AF9',
    },
    modalButtonSecondaryText: {
        color: '#864AF9',
        fontSize: 17,
        fontWeight: '700',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 12,
    },
    modalSubtext: {
        fontSize: 16,
        color: '#718096',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
});

export default EnhancedQuestionScreen;