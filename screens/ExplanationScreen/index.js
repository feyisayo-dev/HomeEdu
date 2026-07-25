import React from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
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

// ── Split files ───────────────────────────────────────────────────────────────
import styles, { SCREEN_WIDTH, SWIPE_THRESHOLD } from './explanationStyles';
import useExplanation from './useExplanation';
import TextCard from './TextCard';
import { ImageCard, VideoCard } from './MediaCard';
import AudioExplanationCard from './AudioExplanationCard';

// ─────────────────────────────────────────────────────────────────────────────
const ExplanationScreen = ({ route, navigation }) => {
    const { subtopicId, Subtopic, subject, topic } = route.params;

    const {
        content, loading, error,
        currentIndex, checkingNext,
        handleNext, handlePrev, checkAndNavigate,
    } = useExplanation({ subtopicId, Subtopic, subject, topic, navigation });

    const translateX = useSharedValue(0);
    const contextX = useSharedValue(0);

    // ── Gesture ───────────────────────────────────────────────────────────────
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

    // Reset card position whenever the index changes via buttons (not swipe-driven)
    React.useEffect(() => { translateX.value = 0; }, [currentIndex]);

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
                            {currentItem.type === 'text' && <TextCard value={currentItem.value} />}
                            {currentItem.type === 'image' && <ImageCard value={currentItem.value} />}
                            {currentItem.type === 'video' && <VideoCard value={currentItem.value} />}
                            {currentItem.type === 'audio' && (
                                <AudioExplanationCard value={currentItem.value} timingsUrl={currentItem.timingsUrl} />
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
                        onPress={checkAndNavigate}
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

export default ExplanationScreen;
