import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { RadioButton } from 'react-native-paper';
import Katex from 'react-native-katex';

const renderContentWithMath = (text, textStyle = {}) => {
    // 1. Use [\s\S] to match newlines inside math blocks safeley
    const parts = text.split(/(\$\$[\s\S]*?\$\$)/g);

    return (
        <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center', // Aligns text and math vertically
        }}>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2).trim();
                    return (
                        <View key={`math-${index}`} style={{ width: '100%', marginVertical: 8 }}>
                            <ErrorSafeMath math={math} />
                        </View>
                    );
                } else {
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
            displayMode={false} // <--- FALSE: Keeps it in the sentence line
            throwOnError={false}
            // removed fixed height/width here to let CSS handle it
            style={{}}
            inlineStyle={inlineStyle}
            onError={() => setHasError(true)}
        />
    );
};

// 3. Use CSS to make the font big, even in inline mode
const inlineStyle = `
html, body {
  margin: 0;
  padding: 0;
  background-color: transparent;
  display: flex;
  align-items: center; 
}
.katex {
  font-size: 3em;       /* <--- Controls the size manually */
  margin: 0 4px;         /* Adds small breathing room around math */
  padding: 0;
  line-height: 1.2;
}
`;
// const inlineStyle = `
// html, body {
//   display: block;
//   margin: 0;
//   padding: 0;
// }
// .katex {
//   vertical-align: middle;
//   font-size: 20px;
//   line-height: 1.0;
// }

// .katex-html{
//  overflow: visible !important; 
//  }
// .katex-display {
//   margin: 0;
//    overflow: visible !important; 
// }
// `;

// Animated Option Component
const AnimatedOption = ({ option, index, isSelected, onPress, isCorrect, isSubmitted }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const selectedAnim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(selectedAnim, {
            toValue: isSelected ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [isSelected]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
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

    const backgroundColor = selectedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#FFFFFF', '#F7F3FF'],
    });

    const borderColor = selectedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['#E2E8F0', '#864AF9'],
    });

    // Override colors if submitted
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
        <Animated.View
            style={{
                transform: [{ scale: scaleAnim }],
                marginBottom: 12,
            }}
        >
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
                disabled={isSubmitted}
            >
                <Animated.View
                    style={[
                        styles.optionContainer,
                        {
                            backgroundColor: finalBackgroundColor,
                            borderColor: finalBorderColor,
                        },
                    ]}
                >
                    <View style={styles.radioContainer}>
                        <View
                            style={[
                                styles.radioOuter,
                                isSelected && styles.radioOuterSelected,
                                isSubmitted && isCorrect === true && styles.radioOuterCorrect,
                                isSubmitted && isCorrect === false && isSelected && styles.radioOuterIncorrect,
                            ]}
                        >
                            {isSelected && (
                                <View
                                    style={[
                                        styles.radioInner,
                                        isSubmitted && isCorrect === true && styles.radioInnerCorrect,
                                        isSubmitted && isCorrect === false && styles.radioInnerIncorrect,
                                    ]}
                                />
                            )}
                        </View>
                    </View>

                    <View style={styles.optionTextContainer}>
                        {renderContentWithMath(option, styles.optionText)}
                    </View>

                    {isSubmitted && isCorrect === true && (
                        <Text style={styles.correctIcon}>✓</Text>
                    )}
                    {isSubmitted && isCorrect === false && isSelected && (
                        <Text style={styles.incorrectIcon}>✗</Text>
                    )}
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const ObjectiveQuestion = ({ question, selectedOption, onSelection, isSubmitted }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
            {question.image && (
                <View style={styles.imageContainer}>
                    <Image source={{ uri: question.image }} style={styles.questionImage} />
                </View>
            )}

            <View style={styles.questionTextContainer}>
                {renderContentWithMath(question.content, styles.questionText)}
            </View>

            <View style={styles.optionsWrapper}>
                {question.options.map((option, index) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = isSubmitted ? option === question.answer : null;

                    return (
                        <AnimatedOption
                            key={index}
                            option={option}
                            index={index}
                            isSelected={isSelected}
                            onPress={() => !isSubmitted && onSelection(option)}
                            isCorrect={isCorrect}
                            isSubmitted={isSubmitted}
                        />
                    );
                })}
            </View>
        </Animated.View>
    );
};

const TheoryQuestion = ({ question, onAnswerChange, value, isSubmitted }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
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
        </Animated.View>
    );
};

const FillInTheGapsQuestion = ({ question, onAnswerChange, value, isSubmitted }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
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
        </Animated.View>
    );
};

const QuestionRenderer = ({ question, onAnswerSelected, selectedAnswer, isSubmitted }) => {
    const handleSelection = (value) => {
        if (!isSubmitted) {
            onAnswerSelected(question.QuestionId, value);
        }
    };

    const handleAnswerChange = (value) => {
        if (!isSubmitted) {
            onAnswerSelected(question.QuestionId, value);
        }
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
                    <Text style={styles.unsupportedText}>
                        Unsupported question type: {question.type}
                    </Text>
                </View>
            );
    }
};

const styles = StyleSheet.create({
    questionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
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
        // lineHeight: 26,
        // letterSpacing: 0.2,
    },
    optionsWrapper: {
        marginTop: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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