import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate, Extrapolate } from 'react-native-reanimated';

// Imports
import styles, { SCREEN_WIDTH, SWIPE_THRESHOLD } from './exampleStyles';
import useExamples from './useExamples';
import ExampleCardContent from './ExampleCardContent';

const ExampleScreen = ({ route, navigation }) => {
    const { subtopicId, subtopic, subject, topic } = route.params;

    // Use Custom Hook
    const { examples, loading, currentIndex, handleNext, handlePrev } = useExamples({ routeParams: route.params, navigation });

    // Animations
    const translateX = useSharedValue(0);
    const contextX = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onStart(() => { contextX.value = translateX.value; })
        .onUpdate((event) => {
            if (currentIndex === 0 && event.translationX > 0) {
                translateX.value = 0; // Prevent swiping right on first card
                return;
            }
            translateX.value = contextX.value + event.translationX;
        })
        .onEnd((event) => {
            if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
                if (event.translationX < 0) {
                    // Swiped Left -> Next
                    translateX.value = withSpring(-SCREEN_WIDTH, {}, () => runOnJS(handleNext)());
                } else if (currentIndex > 0) {
                    // Swiped Right -> Prev
                    translateX.value = withSpring(SCREEN_WIDTH, {}, () => runOnJS(handlePrev)());
                }
            } else {
                translateX.value = withSpring(0); // Snap back if swipe wasn't far enough
            }
        });

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        opacity: interpolate(Math.abs(translateX.value), [0, SCREEN_WIDTH], [1, 0.5], Extrapolate.CLAMP)
    }));

    // Reset card position immediately on index change
    React.useEffect(() => { translateX.value = 0; }, [currentIndex]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#864AF9" />
                <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Loading Examples...</Text>
            </View>
        );
    }

    if (examples.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#666' }}>No examples found for this topic.</Text>
                <TouchableOpacity onPress={handleNext} style={[styles.navButton, { marginTop: 20 }]}>
                    <Text style={styles.navButtonText}>Go to Questions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentExample = examples[currentIndex];
    const isLastCard = currentIndex === examples.length - 1;

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Header Area */}
            <View style={styles.header}>
                <Text style={styles.subtopicsTitle}>EXAMPLES: {subtopic}</Text>
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>Example {currentIndex + 1} / {examples.length}</Text>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / examples.length) * 100}%` }]} />
                    </View>
                </View>
            </View>

            {/* Gesture Card Area */}
            <View style={styles.cardArea}>
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.card, animatedCardStyle]}>
                        <ScrollView contentContainerStyle={styles.cardScrollContent} showsVerticalScrollIndicator={false}>
                            <ExampleCardContent example={currentExample} />
                        </ScrollView>
                    </Animated.View>
                </GestureDetector>
            </View>

            {/* Bottom Nav Controls */}
            <View style={styles.navControls}>
                <TouchableOpacity
                    onPress={handlePrev}
                    style={[styles.navButton, { opacity: currentIndex === 0 ? 0.3 : 1 }]}
                    disabled={currentIndex === 0}
                >
                    <Text style={styles.navButtonText}>← PREV</Text>
                </TouchableOpacity>

                {isLastCard ? (
                    <TouchableOpacity onPress={handleNext} style={[styles.navButton, styles.finishButton]}>
                        <Text style={[styles.navButtonText, { color: '#fff' }]}>QUESTIONS 🏁</Text>
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

export default ExampleScreen;