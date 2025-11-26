import React, { useState } from 'react';
import { View, Text, Image, TextInput, StyleSheet } from 'react-native';
import { RadioButton } from 'react-native-paper';
import Katex  from 'react-native-katex';

const renderContentWithMath = (text, textStyle = {}) => {
    const parts = text.split(/(\$\$.*?\$\$)/g); // split text by $$...$$ blocks

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

const ObjectiveQuestion = ({ question, selectedOption, onSelection, borderColor }) => (
    <View style={[styles.questionContainer, { borderColor }]}>
        {question.image && (
            <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}

        <View style={{ marginBottom: 16 }}>
            {renderContentWithMath(question.content, styles.questionText)}
        </View>

        <RadioButton.Group onValueChange={onSelection} value={selectedOption}>
            {question.options.map((option, index) => (
                <View key={index} style={styles.optionContainer}>
                    <RadioButton value={option} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                        {renderContentWithMath(option, styles.optionText)}
                    </View>
                </View>
            ))}
        </RadioButton.Group>
    </View>
);


const TheoryQuestion = ({ question, onAnswerChange, borderColor, value }) => (
    <View style={[styles.questionContainer, { borderColor }]}>
        {question.image && (
            <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}
        <View style={{ marginBottom: 8 }}>
            {renderContentWithMath(question.content, styles.questionText)}
        </View>
        <TextInput
            style={styles.textArea}
            placeholder="Write your answer here"
            multiline
            numberOfLines={4}
            onChangeText={onAnswerChange}
            value={value}
        />
    </View>

);

const FillInTheGapsQuestion = ({ question, onAnswerChange, borderColor, value }) => (
    <View style={[styles.questionContainer, { borderColor }]}>
        {question.image && (
            <Image source={{ uri: question.image }} style={styles.questionImage} />
        )}
        <View style={{ marginBottom: 8 }}>
            {renderContentWithMath(question.content, styles.questionText)}
        </View>
        <TextInput
            style={styles.input}
            placeholder="Fill in the blank"
            onChangeText={onAnswerChange}
            value={value}
        />
    </View>

);



const QuestionRenderer = ({ question, onAnswerSelected, selectedAnswer }) => {
    console.log('🧠 Rendering question:', question.content);
    const handleSelection = (value) => {
        onAnswerSelected(question.QuestionId, value);
    };


    const handleAnswerChange = (value) => {
        onAnswerSelected(question.QuestionId, value);
    };
    const getBorderColor = (question) => {
        if (question.isCorrect === undefined) {
            return '#ddd'; // Default border color (unanswered)
        } else if (question.isCorrect === null) {
            return '#ddd'; // Neutral color if the answer is not yet checked
        } else if (question.isCorrect) {
            return 'green'; // Correct answer
        } else {
            return 'red'; // Incorrect answer
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
                    borderColor={getBorderColor(question)}
                />

            );

        case 'theory':
            return (
                <TheoryQuestion
                    question={question}
                    onAnswerChange={handleAnswerChange}
                    borderColor={getBorderColor(question)}
                    value={selectedAnswer}
                />

            );

        case 'short_answer':
            return (
                <FillInTheGapsQuestion
                    question={question}
                    onAnswerChange={handleAnswerChange}
                    borderColor={getBorderColor(question)} // Pass borderColor as a prop
                    value={selectedAnswer}
                />
            );

        default:
            return (
                <View style={[styles.unsupportedContainer, { borderColor: '#ddd' }]}>
                    <Text>Unsupported question type: {question.type}</Text>
                </View>
            );
    }

};



const styles = StyleSheet.create({
    questionContainer: {
        borderWidth: 2, // Ensure border is visible
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderColor: '#864af9',
        shadowColor: '#864af9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3, // Elevation for Android
    },
    questionImage: {
        width: '100%',
        height: 200, // Fixed height
        borderRadius: 8,
        marginBottom: 12,
        resizeMode: 'contain', // Ensure the image fits within the boundaries
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
    },
    optionText: {
        fontSize: 16,
        color: '#555',
        marginLeft: 8,
    },
    textArea: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlignVertical: 'top', // Align text at the top for multiline inputs
    },
    input: {
        borderWidth: 1,
        borderColor: '#864af9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    unsupportedContainer: {
        padding: 16,
        backgroundColor: '#f8d7da',
        borderRadius: 8,
        marginBottom: 16,
    },
});


export default QuestionRenderer;
