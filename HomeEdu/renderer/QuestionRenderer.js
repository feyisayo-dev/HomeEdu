import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { RadioButton } from 'react-native-paper';

const QuestionRenderer = ({ question, onAnswerSelected }) => {
    const [selectedOption, setSelectedOption] = useState(null); // Track selected option

    const handleSelection = (value) => {
        setSelectedOption(value);
        onAnswerSelected(question.QuestionId, value); // Pass the selected answer back
    };

    switch (question.type) {
        case 'objective':
        case 'true-false':
            return (
                <View style={styles.container}>
                    <Text style={styles.questionText}>{question.content}</Text>
                    <RadioButton.Group
                        onValueChange={handleSelection}
                        value={selectedOption}
                    >
                        {question.options.map((option, index) => (
                            <View key={index} style={styles.optionContainer}>
                                <RadioButton value={option} />
                                <Text style={styles.optionText}>{option}</Text>
                            </View>
                        ))}
                    </RadioButton.Group>
                </View>
            );

        case 'theory':
            return (
                <View style={styles.container}>
                    <Text style={styles.questionText}>{question.content}</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="Write your answer here"
                        multiline
                        numberOfLines={4}
                        onChangeText={(text) =>
                            onAnswerSelected(question.QuestionId, text)
                        }
                    />
                </View>
            );

        case 'fill-in-the-gaps':
            return (
                <View style={styles.container}>
                    <Text style={styles.questionText}>{question.content}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Fill in the blank"
                        onChangeText={(text) =>
                            onAnswerSelected(question.QuestionId, text)
                        }
                    />
                </View>
            );

        default:
            return (
                <View style={styles.container}>
                    <Text>Unsupported question type: {question.type}</Text>
                </View>
            );
    }
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    questionText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    optionText: {
        fontSize: 14,
        marginLeft: 8,
    },
    textArea: {
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
    },
    input: {
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginTop: 8,
    },
});

export default QuestionRenderer;
