import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform
} from 'react-native';
import axios from 'axios';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';
import {
    GestureHandlerRootView,
    Gesture,
    GestureDetector
} from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

// --- 1. SMART MATH COMPONENT (LaTeX Rendering) ---
const SmartMath = ({ latex, inline = true }) => {
    const [dims, setDims] = useState({ h: 40, w: 100 });
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
            #m { display: inline-block; font-size: 18px; padding: 4px 8px; color: black; font-family: sans-serif; }
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
              var tex = "${latex.replace(/\\/g, "\\\\")}";
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
            opacity: isReady ? 1 : 0,
            marginVertical: 4
        }}>
            <WebView
                key={latex}
                originWhitelist={["*"]}
                source={{ html }}
                scrollEnabled={false}
                onMessage={(e) => {
                    try {
                        const data = JSON.parse(e.nativeEvent.data);
                        setDims({ h: data.height + 10, w: data.width + 10 });
                        setIsReady(true);
                    } catch (err) { }
                }}
                style={{ backgroundColor: "transparent" }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
        </View>
    );
};

// --- 2. TEXT FORMATTING PARSER ---
const parseFormattedText = (text, baseStyle = {}) => {
    if (!text || !text.trim()) return null;

    const BIGGER_SIZE = (baseStyle.fontSize || 16) + 2;

    const patterns = [
        { regex: /\*\*(.+?)\*\*|\*(.+?)\*/g, style: { fontWeight: "bold", fontSize: BIGGER_SIZE, color: "#000" } },
        { regex: /<i>(.+?)<\/i>|_(.+?)_/g, style: { fontStyle: "italic", fontSize: BIGGER_SIZE } },
        { regex: /<u>(.+?)<\/u>/g, style: { textDecorationLine: "underline" } },
        { regex: /<b><i>(.+?)<\/i><\/b>|\*\*\*(.+?)\*\*\*/g, style: { fontWeight: "bold", fontStyle: "italic", fontSize: BIGGER_SIZE, color: "#000" } },
        { regex: /<s>(.+?)<\/s>|~~(.+?)~~/g, style: { textDecorationLine: "line-through", opacity: 0.6 } },
    ];

    const segments = [];
    let lastIndex = 0;
    const allMatches = [];

    patterns.forEach((pattern) => {
        let match;
        const regex = new RegExp(pattern.regex.source, "g");
        while ((match = regex.exec(text)) !== null) {
            allMatches.push({
                start: match.index,
                end: regex.lastIndex,
                text: match[1] || match[2],
                style: pattern.style,
            });
        }
    });

    allMatches.sort((a, b) => a.start - b.start);

    allMatches.forEach((match) => {
        if (match.start < lastIndex) return;
        if (match.start > lastIndex) {
            segments.push({ text: text.substring(lastIndex, match.start), style: {} });
        }
        segments.push({ text: match.text, style: match.style });
        lastIndex = match.end;
    });

    if (lastIndex < text.length) {
        segments.push({ text: text.substring(lastIndex), style: {} });
    }

    if (segments.length === 0) segments.push({ text, style: {} });

    return segments.map((segment, idx) => {
        if (!segment.text) return null;
        return <Text key={idx} style={[baseStyle, segment.style]}>{segment.text}</Text>;
    });
};

// --- 3. MAIN CONTENT RENDERER ---
const renderContentWithMath = (content) => {
    if (Array.isArray(content) && content.length === 2 && Array.isArray(content[0])) {
        const headers = content[0];
        const columns = content[1];
        return (
            <ScrollView horizontal style={styles.tableScroll}>
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        {headers.map((h, i) => (
                            <View key={`h-${i}`} style={styles.headerCell}><Text style={styles.headerText}>{h}</Text></View>
                        ))}
                    </View>
                    <View style={styles.tableRow}>
                        {columns.map((col, i) => (
                            <View key={`c-${i}`} style={styles.tableCell}>
                                {col.map((item, j) => <View key={j} style={styles.cellBox}><Text style={styles.cellText}>{item}</Text></View>)}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    }

    if (!content || typeof content !== 'string') return null;

    const mathParts = content.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <View style={{ flexDirection: "column", width: '100%' }}>
            {mathParts.map((part, mathIndex) => {
                if (part.startsWith("$$") && part.endsWith("$$")) {
                    const latex = part.slice(2, -2);
                    return <SmartMath key={`math-${mathIndex}`} latex={latex} inline={false} />;
                }
                if (!part.trim()) return null;
                return (
                    <View key={`text-${mathIndex}`} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                        {parseFormattedText(part, styles.paragraphText)}
                    </View>
                );
            })}
        </View>
    );
};

// --- 4. EXPLANATION SCREEN ---
const ExplanationScreen = ({ route, navigation }) => {
    // 1. Extract params including subject and topic
    const { subtopicId, Subtopic, subject, topic } = route.params;

    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [checkingNext, setCheckingNext] = useState(false); // Loading state for next check

    const translateX = useSharedValue(0);
    const contextX = useSharedValue(0);

    useEffect(() => {
        const fetchExplanation = async () => {
            try {
                const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/explanation/${subtopicId}`);

                if (response.data.status === 200) {
                    const rawDataList = response.data.data;
                    if (rawDataList && rawDataList.length > 0) {
                        const allCards = rawDataList.flatMap(item => {
                            if (!item.Content) return [];
                            try {
                                const parsed = JSON.parse(item.Content);
                                return Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) { return []; }
                        });

                        if (allCards.length > 0) setContent(allCards);
                        else setError('No content found.');
                    } else {
                        setError('Explanation content is missing.');
                    }
                } else {
                    setError('Failed to load explanation.');
                }
            } catch (err) {
                console.error(err);
                setError('An error occurred.');
            } finally {
                setLoading(false);
            }
        };
        fetchExplanation();
    }, [subtopicId]);

    // --- NAVIGATION LOGIC ---

    const navigateToQuestion = () => {
        const params = {
            subtopicId,
            subtopic: Subtopic,
            selectedSubjects: [Subtopic], // Wrapping in array to be safe for Question screen logic
            type: 'subtopicExam',
            subject: subject || "Unknown Subject",
            topic: topic || "Unknown Topic",
        };

        console.log("Navigation Params:", params);

        navigation.navigate('Question', params);
    };

    const checkAndNavigate = async () => {
        setCheckingNext(true);
        try {
            const response = await axios.get(
                `https://homeedu.fsdgroup.com.ng/api/examples/${subtopicId}`
            );

            // ✅ Case A: Examples Exist
            if (response.data && response.data.status === 200 && response.data.data.length > 0) {
                navigation.navigate('Example', {
                    subtopicId,
                    subtopic: Subtopic,
                    subject,
                    topic
                });
            } else {
                // ⚠️ Case B: No Data -> Redirect to Questions
                navigateToQuestion();
            }
        } catch (error) {
            // ❌ Case C: 404 or Error -> Redirect to Questions
            if (error.response && error.response.status === 404) {
                console.log("No examples found (404), skipping to questions...");
                navigateToQuestion();
            } else {
                console.error("Error checking examples:", error);
                navigateToQuestion();
            }
        } finally {
            setCheckingNext(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < content.length - 1) {
            // Normal card swipe behavior
            setCurrentIndex(prev => prev + 1);
            translateX.value = 0;
        } else {
            // End of cards -> Trigger the smart check
            checkAndNavigate();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            translateX.value = 0;
        }
    };

    // --- GESTURE LOGIC ---

    const panGesture = Gesture.Pan()
        .onStart(() => { contextX.value = translateX.value; })
        .onUpdate((event) => {
            if (currentIndex === 0 && event.translationX > 0) {
                translateX.value = 0;
                return;
            }
            translateX.value = contextX.value + event.translationX;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
                if (event.translationX < 0) {
                    translateX.value = withSpring(-SCREEN_WIDTH, {}, () => runOnJS(handleNext)());
                } else if (currentIndex > 0) {
                    translateX.value = withSpring(SCREEN_WIDTH, {}, () => runOnJS(handlePrev)());
                }
            } else {
                translateX.value = withSpring(0);
            }
        });

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: interpolate(Math.abs(translateX.value), [0, SCREEN_WIDTH], [1, 0.5], Extrapolate.CLAMP)
    }));

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#864AF9" /></View>;
    if (error) return <View style={styles.center}><Text>{error}</Text></View>;
    if (content.length === 0) return <View style={styles.center}><Text>No content available.</Text></View>;

    const currentItem = content[currentIndex];
    const isLastCard = currentIndex === content.length - 1;

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.subtopicsTitle}>{Subtopic}</Text>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>Card {currentIndex + 1} / {content.length}</Text>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / content.length) * 100}%` }]} />
                    </View>
                </View>
            </View>

            {/* Card Area */}
            <View style={styles.cardArea}>
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.card, animatedCardStyle]}>
                        <ScrollView contentContainerStyle={styles.cardScrollContent} showsVerticalScrollIndicator={false}>
                            {currentItem.type === 'text' && (
                                <View style={styles.textContainer}>
                                    {renderContentWithMath(currentItem.value)}
                                </View>
                            )}
                            {currentItem.type === 'image' && (
                                <Image source={{ uri: currentItem.value }} style={styles.image} />
                            )}
                            {currentItem.type === 'video' && (
                                <View style={styles.videoContainer}>
                                    <Video source={{ uri: currentItem.value }} style={styles.video} useNativeControls resizeMode="contain" isLooping={false} />
                                </View>
                            )}
                        </ScrollView>
                        <View style={styles.cardCorner} />
                    </Animated.View>
                </GestureDetector>
            </View>

            {/* Navigation */}
            <View style={styles.navControls}>
                <TouchableOpacity
                    onPress={handlePrev}
                    style={[styles.navButton, { opacity: currentIndex === 0 ? 0.3 : 1 }]}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navButtonText}>← PREV</Text>
                </TouchableOpacity>

                {isLastCard ? (
                    <TouchableOpacity
                        onPress={checkAndNavigate} // Trigger the smart check
                        style={[styles.navButton, styles.finishButton]}
                        disabled={checkingNext}
                    >
                        {checkingNext ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={[styles.navButtonText, { color: '#fff' }]}>FINISH 🏁</Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handleNext} style={[styles.navButton, styles.nextButton]}>
                        <Text style={[styles.navButtonText, { color: '#fff' }]}>NEXT →</Text>
                    </TouchableOpacity>
                )}
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FB',
        paddingTop: Platform.OS === 'android' ? 40 : 60,
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    subtopicsTitle: {
        fontSize: 22,
        color: '#1a1a1a',
        textAlign: 'center',
        fontFamily: 'milkyCustom',
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: 10,
        letterSpacing: 1,
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
    },
    progressText: {
        color: '#666',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    progressBarBackground: {
        width: '100%',
        height: 12,
        backgroundColor: '#e0e0e0',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#000',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFD93D',
    },

    // Card
    cardArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: SCREEN_WIDTH * 0.9,
        height: '82%',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        borderWidth: 3,
        borderColor: '#000',
        shadowColor: "#000",
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    cardCorner: {
        position: 'absolute',
        top: 10, right: 10,
        width: 15, height: 15,
        borderRadius: 15,
        backgroundColor: '#FF6B6B',
        borderWidth: 2,
        borderColor: '#000',
    },
    cardScrollContent: {
        paddingBottom: 20,
        flexGrow: 1,
        justifyContent: 'center',
    },

    // Content
    paragraphText: {
        fontSize: 18,
        lineHeight: 28,
        color: '#222',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    image: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        resizeMode: 'contain',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#000',
    },
    videoContainer: {
        width: '100%',
        height: 220,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#000',
        borderWidth: 2,
        borderColor: '#000',
    },
    video: { width: '100%', height: '100%' },

    // Buttons
    navControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 25,
        paddingBottom: 40,
    },
    navButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        borderWidth: 3,
        borderColor: '#000',
        shadowColor: "#000",
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        minWidth: 100,
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: '#864AF9',
    },
    finishButton: {
        backgroundColor: '#10b981',
    },
    navButtonText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
        textTransform: 'uppercase',
    },

    // Table
    tableScroll: { marginVertical: 15 },
    table: { borderWidth: 2, borderColor: '#000' },
    tableRow: { flexDirection: 'row' },
    headerCell: {
        width: 110, padding: 12,
        backgroundColor: '#f0f0f0',
        borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#000',
        alignItems: 'center'
    },
    tableCell: {
        width: 110, padding: 12,
        borderRightWidth: 2, borderColor: '#000',
        alignItems: 'center'
    },
    headerText: { fontWeight: '900', fontSize: 14 },
    cellText: { fontSize: 14, fontWeight: '500' },
    horizontalItems: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
    cellBox: { padding: 4, margin: 2, backgroundColor: '#eee', borderRadius: 4, borderWidth: 1, borderColor: '#ccc' },
});

export default ExplanationScreen;