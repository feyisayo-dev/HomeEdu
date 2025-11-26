import React, { useState } from 'react';
import { View, Text, Image, TextInput, StyleSheet } from 'react-native';
import { RadioButton } from 'react-native-paper';
import Katex from 'react-native-katex';

const renderContentWithMath = (text, textStyle = {}) => {
    const parts = text.split(/(\$\$.*?\$\$)/g);

    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {parts.map((part, index) => {
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const math = part.slice(2, -2).trim();
                    return <ErrorSafeMath key={`math-${index}`} math={math} />;
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
        console.warn("❌ Math rendering failed for:", math);
        return (
            <Text style={{ color: 'red', fontStyle: 'italic' }}>
                Failed to render: {math}
            </Text>
        );
    }

    return (
        <Katex
            expression={math}
            displayMode={false}
            throwOnError={false}
            errorColor="#f00"
            style={{ minHeight: 30 }}
            inlineStyle={inlineStyle}
            onError={() => setHasError(true)}
            onLoad={() => console.log("✅ Loaded:", math)}
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
  font-size: 4em;
}
`;

// Read-only Objective Question with pre-selected correct answer
const ObjectiveExampleQuestion = ({ question, correctAnswer }) => (
    <View style={styles.questionContainer}>
        {question.image && (
            <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}

        <View style={{ marginBottom: 16 }}>
            {renderContentWithMath(question.content, styles.questionText)}
        </View>

        <RadioButton.Group value={correctAnswer}>
            {question.options.map((option, index) => {
                const isCorrect = option === correctAnswer;
                return (
                    <View 
                        key={index} 
                        style={[
                            styles.optionContainer,
                            isCorrect && styles.correctOptionContainer
                        ]}
                    >
                        <RadioButton 
                            value={option} 
                            disabled={true}
                            color="#4CAF50"
                        />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                            {renderContentWithMath(
                                option, 
                                isCorrect ? styles.correctOptionText : styles.optionText
                            )}
                        </View>
                        {isCorrect && (
                            <Text style={styles.correctLabel}>✓ Correct</Text>
                        )}
                    </View>
                );
            })}
        </RadioButton.Group>
    </View>
);

// Read-only Theory Question with answer shown
const TheoryExampleQuestion = ({ question, correctAnswer }) => (
    <View style={styles.questionContainer}>
        {question.image && (
            <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}
        <View style={{ marginBottom: 8 }}>
            {renderContentWithMath(question.content, styles.questionText)}
        </View>
        <View style={styles.answerContainer}>
            <Text style={styles.answerLabel}>Answer:</Text>
            <Text style={styles.answerText}>{correctAnswer}</Text>
        </View>
    </View>
);

// Read-only Fill in the Gaps with answer shown
const FillInTheGapsExampleQuestion = ({ question, correctAnswer }) => (
    <View style={styles.questionContainer}>
        {question.image && (
            <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}
        <View style={{ marginBottom: 8 }}>
            {renderContentWithMath(question.content, styles.questionText)}
        </View>
        <View style={styles.answerContainer}>
            <Text style={styles.answerLabel}>Answer:</Text>
            <Text style={styles.answerText}>{correctAnswer}</Text>
        </View>
    </View>
);

const ExampleQuestionRenderer = ({ example }) => {
    console.log('🧠 Rendering example question:', example);

    // Parse options if they exist
    const options = example.ExampleOptions ? JSON.parse(example.ExampleOptions) : null;
    
    // Create a question object structure
    const questionData = {
        content: example.Text,
        image: example.Image,
        options: options,
        type: example.ExampleType,
    };

    const correctAnswer = example.ExampleAnswer;

    switch (example.ExampleType) {
        case 'multiple_choice':
        case 'true_false':
            return (
                <ObjectiveExampleQuestion
                    question={questionData}
                    correctAnswer={correctAnswer}
                />
            );

        case 'theory':
            return (
                <TheoryExampleQuestion
                    question={questionData}
                    correctAnswer={correctAnswer}
                />
            );

        case 'short_answer':
            return (
                <FillInTheGapsExampleQuestion
                    question={questionData}
                    correctAnswer={correctAnswer}
                />
            );

        default:
            return (
                <View style={styles.unsupportedContainer}>
                    <Text>Unsupported example type: {example.ExampleType}</Text>
                </View>
            );
    }
};

const styles = StyleSheet.create({
    questionContainer: {
        borderWidth: 2,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderColor: '#4CAF50', // Green border for examples
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    questionImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 12,
        resizeMode: 'contain',
    },
    questionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#f9f9f9',
    },
    correctOptionContainer: {
        backgroundColor: '#E8F5E9', // Light green background
        borderWidth: 2,
        borderColor: '#4CAF50',
    },
    optionText: {
        fontSize: 16,
        color: '#555',
        marginLeft: 8,
    },
    correctOptionText: {
        fontSize: 16,
        color: '#2E7D32',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    correctLabel: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 'auto',
    },
    answerContainer: {
        backgroundColor: '#E8F5E9',
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#4CAF50',
        marginTop: 8,
    },
    answerLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 4,
    },
    answerText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    unsupportedContainer: {
        padding: 16,
        backgroundColor: '#f8d7da',
        borderRadius: 8,
        marginBottom: 16,
    },
});

export default ExampleQuestionRenderer;
