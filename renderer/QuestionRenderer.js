import React, { useState } from 'react';
import { View, Text, Image, TextInput, StyleSheet } from 'react-native';
import { RadioButton } from 'react-native-paper';

const ObjectiveQuestion = ({ question, selectedOption, onSelection, borderColor }) => (
    <View style={[styles.questionContainer, { borderColor }]}>
        {question.image && (
            <Image
                source={{ uri: question.image }}
                style={styles.questionImage}
            />
        )}
        <Text style={styles.questionText}>{question.content}</Text>
        <RadioButton.Group onValueChange={onSelection} value={selectedOption}>
            {question.options.map((option, index) => (
                <View key={index} style={styles.optionContainer}>
                    <RadioButton value={option} />
                    <Text style={styles.optionText}>{option}</Text>
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
        <Text style={styles.questionText}>{question.content}</Text>
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
        <Text style={styles.questionText}>{question.content}</Text>
        <TextInput
            style={styles.input}
            placeholder="Fill in the blank"
            onChangeText={onAnswerChange}
            value={value}
        />
    </View>
);



const QuestionRenderer = ({ question, onAnswerSelected, selectedAnswer }) => {

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
        case 'objective':
        case 'true-false':
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

        case 'fill-in-the-gaps':
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
