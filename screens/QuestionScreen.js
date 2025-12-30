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
    TextInput,
} from 'react-native';
import axios from 'axios';
import QuestionRenderer from '../renderer/QuestionRenderer';
import { useUser } from '../context/UserContext';
import { Video } from 'expo-av';
import QuestionNumberStrip from '../components/QuestionNumberStrip';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// Enhanced content renderer with formatting support
const renderFormattedContent = (content, textStyle = {}) => {
    if (!content) return null;

    // Split by math expressions first
    const mathParts = content.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <View style={{ flexDirection: 'column' }}>
            {mathParts.map((part, mathIndex) => {
                // Handle math expressions
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const latex = part.slice(2, -2);
                    return (
                        <View key={`math-${mathIndex}`} style={{ marginVertical: 8 }}>
                            <SmartMath latex={latex} inline={false} />
                        </View>
                    );
                }

                // Handle regular text with formatting
                return (
                    <View key={`text-${mathIndex}`} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                        {parseFormattedText(part, textStyle)}
                    </View>
                );
            })}
        </View>
    );
};

// Parse text with various formatting
const parseFormattedText = (text, baseStyle = {}) => {
    if (!text || !text.trim()) return null;

    const elements = [];
    let currentIndex = 0;
    const patterns = [
        // Bold: *text* or **text**
        { regex: /\*\*(.+?)\*\*|\*(.+?)\*/g, style: { fontWeight: 'bold' } },
        // Italic: <i>text</i> or _text_
        { regex: /<i>(.+?)<\/i>|_(.+?)_/g, style: { fontStyle: 'italic' } },
        // Underline: <u>text</u>
        { regex: /<u>(.+?)<\/u>/g, style: { textDecorationLine: 'underline' } },
        // Bold + Italic: <b><i>text</i></b> or ***text***
        { regex: /<b><i>(.+?)<\/i><\/b>|\*\*\*(.+?)\*\*\*/g, style: { fontWeight: 'bold', fontStyle: 'italic' } },
        // Strikethrough: <s>text</s> or ~~text~~
        { regex: /<s>(.+?)<\/s>|~~(.+?)~~/g, style: { textDecorationLine: 'line-through' } },
    ];

    // Combine all patterns into segments
    const segments = [];
    let lastIndex = 0;

    // Find all matches
    const allMatches = [];
    patterns.forEach((pattern, patternIndex) => {
        let match;
        const regex = new RegExp(pattern.regex.source, 'g');
        while ((match = regex.exec(text)) !== null) {
            allMatches.push({
                start: match.index,
                end: regex.lastIndex,
                text: match[1] || match[2], // Capture group
                style: pattern.style,
            });
        }
    });

    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start);

    // Build segments
    allMatches.forEach((match, idx) => {
        // Add plain text before this match
        if (match.start > lastIndex) {
            segments.push({
                text: text.substring(lastIndex, match.start),
                style: {},
            });
        }

        // Add formatted text
        segments.push({
            text: match.text,
            style: match.style,
        });

        lastIndex = match.end;
    });

    // Add remaining plain text
    if (lastIndex < text.length) {
        segments.push({
            text: text.substring(lastIndex),
            style: {},
        });
    }

    // If no matches, return plain text
    if (segments.length === 0) {
        segments.push({ text, style: {} });
    }

    // Render segments
    return segments.map((segment, idx) => {
        if (!segment.text.trim()) return null;

        return (
            <Text key={idx} style={[styles.passageText, baseStyle, segment.style]}>
                {segment.text}
            </Text>
        );
    });
};

// Updated PassageModal component
const PassageModal = ({ visible, onClose, content }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.passageModalOverlay}>
                <View style={styles.passageModalContent}>
                    <View style={styles.passageModalHeader}>
                        <Text style={styles.passageModalTitle}>📖 Read Passage</Text>
                        <TouchableOpacity onPress={onClose} style={styles.passageCloseButton}>
                            <Text style={styles.passageCloseButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.passageModalBody} showsVerticalScrollIndicator={false}>
                        {renderFormattedContent(content, styles.passageText)}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const SmartMath = ({ latex, inline = true }) => {
    const [dims, setDims] = useState({ h: 30, w: 60 });
    const [isReady, setIsReady] = useState(false);

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: transparent; 
            display: inline-block; 
            overflow: hidden; 
            white-space: nowrap; 
            opacity: ${isReady ? 1 : 0};
          }
          #m { display: inline-block; font-size: 15px; padding: 4px 8px; color: black; }
        </style>
      </head>
      <body>
        <div id="m"></div>
        <script>
          function measure() {
            var el = document.getElementById('m');
            var h = el.offsetHeight;
            var w = el.offsetWidth;
            if (h > 0 && w > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ height: h, width: w }));
            }
          }

          try {
            var el = document.getElementById('m');
            var tex = "${latex.replace(/\\/g, '\\\\')}";
            katex.render(tex, el, { displayMode: ${!inline}, throwOnError: false });
            setTimeout(measure, 100);
            setTimeout(measure, 500);
          } catch (e) { window.ReactNativeWebView.postMessage("error"); }
        </script>
      </body>
    </html>
  `;

    return (
        <View style={{
            height: dims.h,
            width: inline ? dims.w : '100%',
            marginHorizontal: 2,
            opacity: isReady ? 1 : 0
        }}>
            <WebView
                key={latex}
                originWhitelist={['*']}
                source={{ html }}
                scrollEnabled={false}
                onMessage={(e) => {
                    try {
                        const data = JSON.parse(e.nativeEvent.data);
                        setDims({ h: data.height + 6, w: data.width + 8 });
                        setIsReady(true);
                    } catch (err) { }
                }}
                style={{ backgroundColor: 'transparent' }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
        </View>
    );
};

const renderContentWithMath = (content, textStyle = {}) => {
    if (!content) return null;
    const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const latex = part.slice(2, -2);
                    return <SmartMath key={`math-${index}`} latex={latex} inline={true} />;
                } else if (part.trim()) {
                    return (
                        <Text key={`text-${index}`} style={[styles.label, textStyle]}>
                            {part}
                        </Text>
                    );
                }
                return null;
            })}
        </View>
    );
};

const EnhancedQuestionScreen = ({ route, navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { userData } = useUser();
    const [narrations, setNarrations] = useState({});
    const [passed, setPassed] = useState(false);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [passageModalVisible, setPassageModalVisible] = useState(false);
    // --- NEW STATE: Track which specific questions have been submitted ---
    const [submittedIds, setSubmittedIds] = useState({});

    const [results, setResults] = useState(null);
    // Removed global 'showNarrations' dependence for UI switching, using submittedIds instead

    const [isModalVisible, setIsModalVisible] = useState(false);
    const { subtopicId, subtopic, selectedSubjects, type, subject, topic } = route.params;
    const [unansweredModalVisible, setUnansweredModalVisible] = useState(false);
    const [unansweredQuestions, setUnansweredQuestions] = useState([]);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [showNarrationExpanded, setShowNarrationExpanded] = useState(false);

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


    const handleReport = async (questionId) => {
        Alert.alert(
            "Report Question",
            "Are you sure you want to report this question as having an error?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Report",
                    onPress: async () => {
                        try {
                            await axios.post(`https://homeedu.fsdgroup.com.ng/api/report/${questionId}`);
                            Alert.alert("Success", "Thanks for the feedback! We will review this question.");
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Could not report the question. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const Breadcrumb = ({ currentQuestion }) => {
        if (!currentQuestion) return null;
        const breadcrumbItems = [
            { label: currentQuestion.class || userData?.class || 'Class', icon: '🎓' },
            { label: currentQuestion.subject || subject || 'Subject', icon: '📚' },
            { label: currentQuestion.topic || topic || 'Topic', icon: '📖' },
            { label: currentQuestion.subtopic || subtopic || 'Subtopic', icon: '📝' },
        ].filter(item => item.label);

        return (
            <View style={styles.breadcrumbContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.breadcrumbScroll}>
                    {breadcrumbItems.map((item, index) => (
                        <React.Fragment key={index}>
                            <View style={styles.breadcrumbItem}>
                                <Text style={styles.breadcrumbIcon}>{item.icon}</Text>
                                <Text style={styles.breadcrumbText} numberOfLines={1}>{item.label}</Text>
                            </View>
                            {index < breadcrumbItems.length - 1 && <Text style={styles.breadcrumbSeparator}>›</Text>}
                        </React.Fragment>
                    ))}
                </ScrollView>
            </View>
        );
    };

    useEffect(() => {
        setStartTime(Date.now());
    }, []);

    useEffect(() => {
        if (!userData) return;

        const fetchQuestions = async () => {
            console.log("=== Fetch Questions Function Triggered ===");

            try {
                // Step 1: Initialize payload
                let payload = { class: userData.class };
                console.log("Initial Payload:", payload);

                // Step 2: Log navigation params
                console.log("Navigation Params:", {
                    subtopicId,
                    subtopic,
                    selectedSubjects,
                    type,
                    subject,
                    topic
                });

                // Step 3: Build payload based on exam type
                switch (type) {
                    case 'JAMB':
                        console.log("Exam Type: JAMB");
                        if (selectedSubjects.length > 0) {
                            payload.JAMB_SUBJECT = selectedSubjects.join(',');
                            payload.total_questions = 200;
                            console.log("Updated Payload for JAMB:", payload);
                        }
                        break;

                    case 'classExam':
                        console.log("Exam Type: Class Exam");
                        payload.subject = subject;
                        payload.total_questions = 60;
                        console.log("Updated Payload for Class Exam:", payload);
                        break;

                    case 'subjectExam':
                        console.log("Exam Type: Subject Exam");
                        payload.subject = subject;
                        payload.topic = topic;
                        payload.total_questions = 40;
                        console.log("Updated Payload for Subject Exam:", payload);
                        break;

                    case 'topicExam':
                        console.log("Exam Type: Topic Exam");
                        payload.subject = subject;
                        payload.topic = topic;
                        payload.subtopic = subtopic;
                        payload.total_questions = 30;
                        console.log("Updated Payload for Topic Exam:", payload);
                        break;

                    case 'subtopicExam':
                        console.log("Exam Type: Subtopic Exam");
                        payload.subject = subject;
                        payload.topic = topic;
                        payload.subtopic = subtopic;
                        payload.total_questions = 20;
                        console.log("Updated Payload for Subtopic Exam:", payload);
                        break;

                    default:
                        console.log("Exam Type: Default");
                        payload.total_questions = 10;
                        console.log("Updated Payload for Default:", payload);
                }

                // Step 4: Make API request
                console.log("Sending API Request with Payload:", payload);
                const response = await axios.post(
                    `https://homeedu.fsdgroup.com.ng/api/ExamQuestions`,
                    payload
                );

                // Step 5: Log raw response
                console.log("Fetched Questions Response:", response.data);

                // Step 6: Parse questions
                const apiData = response.data.data || [];
                console.log("Raw API Data:", apiData);

                const parsedQuestions = apiData.map((q, index) => {
                    console.log(`Parsing Question #${index + 1}:`, q);

                    let parsedOptions = null;

                    // Safely parse options with error handling
                    if (q.options) {
                        try {
                            parsedOptions = JSON.parse(q.options);
                        } catch (error) {
                            console.error(`Failed to parse options for question ${q.QuestionId}:`, error);
                            console.error('Raw options string:', q.options);
                            // Fallback: return empty array or skip this question
                            parsedOptions = [];
                        }
                    }

                    return {
                        ...q,
                        options: parsedOptions,
                    };
                });

                // Filter out questions with invalid options
                const validQuestions = parsedQuestions.filter(q =>
                    q.options && q.options.length > 0
                );

                console.log("Parsed Questions:", validQuestions);
                setQuestions(validQuestions);

                console.log("Questions state updated successfully.");

            } catch (error) {
                console.error("❌ Error fetching questions:", error);
                setQuestions([]);
            } finally {
                setLoading(false);
                console.log("=== Fetch Questions Function Completed ===");
            }
        };
        fetchQuestions();
    }, [userData]);

    const handleAnswerSelected = (questionId, answer) => {
        // Prevent changing answer if already submitted
        if (submittedIds[questionId]) return;
        setUserAnswers((prev) => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async () => {
        const currentQ = questions[currentIndex];
        const currentId = currentQ.QuestionId;
        const selectedAnswer = userAnswers[currentId];

        if (!selectedAnswer) {
            Alert.alert('Answer Required', 'Please select an answer before checking.');
            return;
        }

        // --- UPDATE SUBMISSION STATE ---
        setSubmittedIds(prev => ({ ...prev, [currentId]: true }));

        const isCorrect = selectedAnswer === currentQ.answer;
        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex] = { ...currentQ, isCorrect };
        setQuestions(updatedQuestions);

        // Fetch narration if not already loaded
        if (!narrations[currentId]) {
            try {
                const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/narration/${currentId}`);
                const data = await response.json();
                const newNarrations = { ...narrations };

                if (response.ok && data.data && data.data.length > 0) {
                    newNarrations[currentId] = JSON.parse(data.data[0].Content);
                } else {
                    newNarrations[currentId] = [{ type: 'text', value: 'No narration available' }];
                }
                setNarrations(newNarrations);
            } catch (error) {
                console.error('Error fetching narration:', error);
            }
        }

        try {
            await fetch(`https://homeedu.fsdgroup.com.ng/api/streaks/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: userData.username }),
            });
        } catch (error) { }
    };

    const handleNextQuestion = () => {
        setShowNarrationExpanded(false);
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleFinalSubmit();
        }
    };

    const submitReport = async (time_taken, percentage) => {
        // ... (Keep existing report logic) ...
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
            await fetch('https://homeedu.fsdgroup.com.ng/api/report', {
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

    const currentQuestion = questions[currentIndex];
    // CHECK if the current specific question is submitted
    const isCurrentSubmitted = submittedIds[currentQuestion?.QuestionId];

    return (
        <View style={styles.mainContainer}>
            {/* Header with Breadcrumb */}
            <View style={styles.header}>
                <Breadcrumb currentQuestion={currentQuestion} />

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
                        {/* PASSAGE BUTTON */}
                        {currentQuestion.passage && (currentQuestion.passage.Content || currentQuestion.passage) && (
                            <TouchableOpacity
                                style={styles.passageButton}
                                onPress={() => setPassageModalVisible(true)}
                                activeOpacity={0.8}
                            >
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
                                <View style={styles.captionIcon}>
                                    <Text style={styles.captionIconText}>💡</Text>
                                </View>
                                <View style={styles.captionContent}>
                                    <Text style={styles.captionText}>{currentQuestion.caption}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.reportContainer}>
                            <TouchableOpacity
                                style={styles.reportButton}
                                onPress={() => handleReport(currentQuestion.QuestionId)}
                            >
                                <Ionicons name="flag-outline" size={16} color="#FF4444" />
                                <Text style={styles.reportText}>Report Issue</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Action Buttons: Toggle based on persistent submitted status */}
                        {!isCurrentSubmitted ? (
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
                                            {narrations[currentQuestion.QuestionId]?.map(
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
                        setShowNarrationExpanded(false);
                    }}
                    userAnswers={userAnswers}
                    questions={questions}
                />
            </View>
            {/* Passage Modal */}
            <PassageModal
                visible={passageModalVisible}
                onClose={() => setPassageModalVisible(false)}
                content={currentQuestion?.passage?.Content || currentQuestion?.passage || ''}
            />
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
    mainContainer: { flex: 1, backgroundColor: '#F8F9FE' },
    header: { backgroundColor: '#FFFFFF', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    breadcrumbContainer: { marginBottom: 12 },
    breadcrumbScroll: { flexDirection: 'row', alignItems: 'center' },
    breadcrumbItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, maxWidth: 150 },
    breadcrumbIcon: { fontSize: 14, marginRight: 6 },
    breadcrumbText: { fontSize: 13, fontWeight: '600', color: '#4A5568' },
    breadcrumbSeparator: { fontSize: 18, color: '#CBD5E0', marginHorizontal: 8, fontWeight: '300' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    questionCounter: { backgroundColor: '#864AF9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    counterText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    timerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F9FC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    timerIcon: { fontSize: 18, marginRight: 6 },
    timerText: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
    progressBarContainer: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#864AF9' },
    scrollContent: { flex: 1, padding: 16 },
    questionWrapper: { marginBottom: 100 },
    captionContainer: { flexDirection: 'row', backgroundColor: '#FFF9E6', borderLeftWidth: 4, borderLeftColor: '#FFC107', borderRadius: 12, padding: 16, marginTop: 16, shadowColor: '#FFC107', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    captionIcon: { marginRight: 12, marginTop: 2 },
    captionIconText: { fontSize: 24 },
    captionContent: { flex: 1 },
    captionText: { fontSize: 14, lineHeight: 20, color: '#744210', fontStyle: 'italic' },
    submitButton: { backgroundColor: '#864AF9', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, shadowColor: '#864AF9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    submitButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    afterSubmitContainer: { marginTop: 20 },
    narrationToggle: { backgroundColor: '#F7F9FC', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
    narrationToggleText: { color: '#864AF9', fontSize: 16, fontWeight: '600' },
    narrationContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 300 },
    narrationScroll: { maxHeight: 280 },
    narrationTextWrapper: { marginBottom: 12 },
    narrationText: { fontSize: 15, lineHeight: 22, color: '#2D3748' },
    narrationImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12, resizeMode: 'contain' },
    narrationVideo: { width: '100%', height: 200, borderRadius: 8, marginBottom: 12 },
    nextButton: { backgroundColor: '#48BB78', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#48BB78', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    bottomStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 5 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FE' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#718096' },
    noQuestionsText: { textAlign: 'center', fontSize: 16, color: '#A0AEC0', marginTop: 40 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, width: '85%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
    stickerImage: { width: 120, height: 120, marginBottom: 20 },
    resultTitle: { fontSize: 24, fontWeight: '800', color: '#2D3748', marginBottom: 8 },
    resultText: { fontSize: 17, color: '#718096', marginBottom: 8 },
    resultPercentage: { fontSize: 48, fontWeight: '800', color: '#864AF9', marginBottom: 24 },
    modalButton: { backgroundColor: '#864AF9', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 8 },
    modalButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
    modalButtonSecondary: { backgroundColor: '#F7F9FC', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 8, borderWidth: 2, borderColor: '#864AF9' },
    modalButtonSecondaryText: { color: '#864AF9', fontSize: 17, fontWeight: '700' },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#2D3748', marginBottom: 12 },
    modalSubtext: { fontSize: 16, color: '#718096', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    reportContainer: { marginTop: 15, alignItems: 'flex-end', paddingHorizontal: 10 },
    reportButton: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#FFF0F0', borderRadius: 20, borderWidth: 1, borderColor: '#FFCDCD' },
    reportText: { color: '#FF4444', fontSize: 12, marginLeft: 5, fontWeight: '600' },
    label: { fontSize: 16, color: '#333' },
    // Add these to your existing styles object
    passageButton: {
        backgroundColor: '#E9D8FD',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#D6BCFA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    passageButtonText: {
        color: '#553C9A',
        fontWeight: 'bold',
        fontSize: 15,
    },
    passageModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    passageModalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: Dimensions.get('window').height * 0.85,
        paddingTop: 20,
        paddingHorizontal: 20,
        elevation: 10,
    },
    passageModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#EDF2F7',
    },
    passageModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2D3748',
    },
    passageCloseButton: {
        backgroundColor: '#EDF2F7',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passageCloseButtonText: {
        fontSize: 20,
        color: '#718096',
        fontWeight: 'bold',
    },
    passageModalBody: {
        flex: 1,
    },
    passageText: {
        fontSize: 17,
        lineHeight: 28,
        color: '#2D3748',
        marginBottom: 12,
    },
});

export default EnhancedQuestionScreen;