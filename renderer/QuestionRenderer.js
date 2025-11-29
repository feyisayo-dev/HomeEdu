import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Platform 
} from 'react-native';
import Katex from 'react-native-katex';

// 1. CSS for the WebView inside KaTeX (Controls the look of the math specifically)
const inlineStyle = `
html, body {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 10px;
  background-color: transparent;
}
.katex {
  font-size: 2.5em;
  text-align: center;
  color: #000;
}
`;

// 2. Rendering Logic (Native Version)
const renderContentWithMath = (content, textStyle = {}) => {
    if (!content) return null;

    // Split by $$ delimiters
    // logic: captures the delimiters in the split array so we can identify them
    const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            {parts.map((part, index) => {
                // If part is Math ($$ wrapper)
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const mathExpression = part.slice(2, -2); // Remove $$
                    return (
                        <View key={`math-${index}`} style={styles.mathContainer}>
                            <Katex
                                expression={mathExpression}
                                style={styles.katex}
                                inlineStyle={inlineStyle}
                                displayMode={true} // True = Block mode (essential for matrices/vertical addition)
                                throwOnError={false}
                            />
                        </View>
                    );
                }
                // If part is Text
                else if (part.trim()) {
                    return (
                        <Text key={`text-${index}`} style={[styles.label, textStyle]}>
                            {part.trim()}
                        </Text>
                    );
                }
                return null;
            })}
        </View>
    );
};

// --- Components ---

const AnimatedOption = ({ option, index, isSelected, onPress, isCorrect, isSubmitted }) => {
    // Animation Values
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const selectedAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(selectedAnim, {
            toValue: isSelected ? 1 : 0,
            duration: 200,
            useNativeDriver: false, // Color interpolation doesn't support native driver
        }).start();
    }, [isSelected]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }).start();
    };

    const backgroundColor = selectedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#FFFFFF', '#F7F3FF'],
    });

    const borderColor = selectedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E2E8F0', '#864AF9'],
    });

    // Logic for result colors
    let finalBackgroundColor = backgroundColor;
    let finalBorderColor = borderColor;

    if (isSubmitted) {
        if (isCorrect === true) {
            finalBackgroundColor = '#F0FFF4';
            finalBorderColor = '#48BB78';
        } else if (isCorrect === false && isSelected) {
            finalBackgroundColor = '#FFF5F5';
            finalBorderColor = '#F56565';
        }
    }

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 12 }}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                disabled={isSubmitted}
            >
                <Animated.View style={[
                    styles.optionContainer, 
                    { backgroundColor: finalBackgroundColor, borderColor: finalBorderColor }
                ]}>
                    
                    {/* Radio Button Circle */}
                    <View style={styles.radioContainer}>
                        <View style={[
                            styles.radioOuter,
                            isSelected && styles.radioOuterSelected,
                            isSubmitted && isCorrect === true && styles.radioOuterCorrect,
                            isSubmitted && isCorrect === false && isSelected && styles.radioOuterIncorrect,
                        ]}>
                            {isSelected && (
                                <View style={[
                                    styles.radioInner,
                                    isSubmitted && isCorrect === true && styles.radioInnerCorrect,
                                    isSubmitted && isCorrect === false && styles.radioInnerIncorrect,
                                ]} />
                            )}
                        </View>
                    </View>

                    {/* Option Text / Math */}
                    <View style={styles.optionTextContainer}>
                        {renderContentWithMath(option, styles.optionText)}
                    </View>

                    {/* Icons */}
                    {isSubmitted && isCorrect === true && <Text style={styles.correctIcon}>✓</Text>}
                    {isSubmitted && isCorrect === false && isSelected && <Text style={styles.incorrectIcon}>✗</Text>}
                
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const ObjectiveQuestion = ({ question, selectedOption, onSelection, isSubmitted }) => {
    return (
        <View style={styles.questionContainer}>
            {question.image && (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: question.image }} style={styles.questionImage} />
                </View>
            )}

            <View style={styles.questionTextContainer}>
                {renderContentWithMath(question.content, styles.questionText)}
            </View>

            <View style={styles.optionsWrapper}>
                {question.options.map((option, index) => (
                    <AnimatedOption
                        key={index}
                        option={option}
                        index={index}
                        isSelected={selectedOption === option}
                        onPress={() => !isSubmitted && onSelection(option)}
                        isCorrect={isSubmitted ? option === question.answer : null}
                        isSubmitted={isSubmitted}
                    />
                ))}
            </View>
        </View>
    );
};

const TheoryQuestion = ({ question, onAnswerChange, value, isSubmitted }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.questionContainer}>
            {question.image && (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: question.image }} style={styles.questionImage} />
                </View>
            )}

            <View style={styles.questionTextContainer}>
                {renderContentWithMath(question.content, styles.questionText)}
            </View>

            <TextInput
                style={[
                    styles.textArea,
                    isFocused && styles.textAreaFocused,
                    isSubmitted && styles.textAreaSubmitted,
                ]}
                placeholder="Write your answer here..."
                placeholderTextColor="#A0AEC0"
                multiline
                numberOfLines={6}
                onChangeText={onAnswerChange}
                value={value}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSubmitted}
            />
        </View>
    );
};

const FillInTheGapsQuestion = ({ question, onAnswerChange, value, isSubmitted }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.questionContainer}>
            {question.image && (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: question.image }} style={styles.questionImage} />
                </View>
            )}

            <View style={styles.questionTextContainer}>
                {renderContentWithMath(question.content, styles.questionText)}
            </View>

            <TextInput
                style={[
                    styles.input,
                    isFocused && styles.inputFocused,
                    isSubmitted && styles.inputSubmitted,
                ]}
                placeholder="Type your answer..."
                placeholderTextColor="#A0AEC0"
                onChangeText={onAnswerChange}
                value={value}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                editable={!isSubmitted}
            />
        </View>
    );
};

// Main Renderer Switch
const QuestionRenderer = ({ question, onAnswerSelected, selectedAnswer, isSubmitted }) => {
    const handleSelection = (value) => {
        if (!isSubmitted) onAnswerSelected(question.QuestionId, value);
    };

    const handleAnswerChange = (value) => {
        if (!isSubmitted) onAnswerSelected(question.QuestionId, value);
    };

    switch (question.type) {
        case 'multiple_choice':
        case 'true_false':
            return (
                <ObjectiveQuestion
                    question={question}
                    selectedOption={selectedAnswer}
                    onSelection={handleSelection}
                    isSubmitted={isSubmitted}
                />
            );
        case 'theory':
            return (
                <TheoryQuestion
                    question={question}
                    onAnswerChange={handleAnswerChange}
                    value={selectedAnswer || ''}
                    isSubmitted={isSubmitted}
                />
            );
        case 'short_answer':
            return (
                <FillInTheGapsQuestion
                    question={question}
                    onAnswerChange={handleAnswerChange}
                    value={selectedAnswer || ''}
                    isSubmitted={isSubmitted}
                />
            );
        default:
            return (
                <View style={styles.unsupportedContainer}>
                    <Text style={styles.unsupportedText}>Unsupported: {question.type}</Text>
                </View>
            );
    }
};

const styles = StyleSheet.create({
    // --- Styles for Math Blocks (From Base Version) ---
    mathContainer: {
        minHeight: 120, // Ensures matrix/vertical addition has space
        width: '100%',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        overflow: 'hidden',
        marginTop: 8,
        marginBottom: 8,
    },
    katex: {
        flex: 1,
        minHeight: 40,
    },
    label: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
        // Ensure text wraps nicely around blocks if needed, 
        // though flexWrap on parent handles most flow.
    },
    
    // --- Styles from Scaled Version ---
    questionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 20, // Added spacing for list views
    },
    imageContainer: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F7F9FC',
    },
    questionImage: {
        width: '100%',
        height: 220,
        resizeMode: 'contain',
    },
    questionTextContainer: {
        marginBottom: 20,
    },
    questionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2D3748',
        lineHeight: 24,
    },
    optionsWrapper: {
        marginTop: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center', // Important for aligning radio button with content
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        minHeight: 60,
    },
    radioContainer: {
        marginRight: 12,
    },
    radioOuter: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#CBD5E0',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    radioOuterSelected: {
        borderColor: '#864AF9',
    },
    radioOuterCorrect: {
        borderColor: '#48BB78',
    },
    radioOuterIncorrect: {
        borderColor: '#F56565',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#864AF9',
    },
    radioInnerCorrect: {
        backgroundColor: '#48BB78',
    },
    radioInnerIncorrect: {
        backgroundColor: '#F56565',
    },
    optionTextContainer: {
        flex: 1,
    },
    optionText: {
        fontSize: 16,
        color: '#2D3748',
        lineHeight: 22,
    },
    correctIcon: {
        fontSize: 24,
        color: '#48BB78',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    incorrectIcon: {
        fontSize: 24,
        color: '#F56565',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    textArea: {
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#2D3748',
        textAlignVertical: 'top',
        minHeight: 120,
        backgroundColor: '#FFFFFF',
    },
    textAreaFocused: {
        borderColor: '#864AF9',
        backgroundColor: '#F7F3FF',
    },
    textAreaSubmitted: {
        borderColor: '#CBD5E0',
        backgroundColor: '#F7F9FC',
    },
    input: {
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#2D3748',
        backgroundColor: '#FFFFFF',
    },
    inputFocused: {
        borderColor: '#864AF9',
        backgroundColor: '#F7F3FF',
    },
    inputSubmitted: {
        borderColor: '#CBD5E0',
        backgroundColor: '#F7F9FC',
    },
    unsupportedContainer: {
        padding: 20,
        backgroundColor: '#FFF5F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FED7D7',
    },
    unsupportedText: {
        fontSize: 16,
        color: '#C53030',
        textAlign: 'center',
    },
});

export default QuestionRenderer;