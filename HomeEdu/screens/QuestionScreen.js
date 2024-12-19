import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, Button, Alert } from 'react-native';
import axios from 'axios';
import QuestionRenderer from '../renderer/QuestionRenderer';
import { useUser } from '../context/UserContext';
import { Video } from 'expo-av';

const QuestionScreen = ({ route, navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0); // Track the current question index
    const { userData } = useUser();
    const [narrations, setNarrations] = useState({});
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [results, setResults] = useState(null); // Track results
    const [showNarrations, setShowNarrations] = useState(false); // Show narrations toggle

    const { subtopicId, subtopic } = route.params;

    useEffect(() => {
        if (!userData) {
            console.error('userData is missing');
            return;
        }

        const fetchQuestions = async () => {
            try {
                const response = await axios.post(`https://homeedu.fsdgroup.com.ng/api/questions/${subtopicId}`, {
                    class: userData.class,
                });

                const apiData = response.data.data || [];
                const parsedQuestions = apiData.map((q) => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : null,
                }));

                setQuestions(parsedQuestions);
            } catch (error) {
                console.error('Error fetching questions:', error);
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [userData]);

    const handleAnswerSelected = (questionId, answer) => {
        setUserAnswers((prevAnswers) => ({
            ...prevAnswers,
            [questionId]: answer,
        }));
    };

    const handleSubmit = async () => {
        const selectedAnswer = userAnswers[questions[currentIndex].QuestionId];

        // Log the selected answer for debugging
        console.log('Selected Answer for Question:', questions[currentIndex].QuestionId);
        console.log('Answer:', selectedAnswer);

        if (!selectedAnswer) {
            Alert.alert('Answer Required', 'Please select an answer before submitting.');
            return;
        }

        setShowNarrations(true); // Show narrations after submitting the answer

        const isCorrect = selectedAnswer === questions[currentIndex].answer;

        const updatedQuestions = [...questions];
        updatedQuestions[currentIndex] = {
            ...questions[currentIndex],
            isCorrect,
        };
        setQuestions(updatedQuestions);
        try {
            const username = userData.username;
            await fetch(`https://homeedu.fsdgroup.com.ng/api/streaks/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
        } catch (error) {
            console.error('Error updating streak:', error);
        }
        // Fetch narrations (existing logic)
        try {
            const questionId = questions[currentIndex].QuestionId;
            const response = await fetch(
                `https://homeedu.fsdgroup.com.ng/api/narration/${questionId}`
            );
            const data = await response.json();

            const newNarrations = { ...narrations };
            if (response.ok && data.data && data.data.length > 0) {
                const narrationContent = JSON.parse(data.data[0].Content);
                newNarrations[questionId] = narrationContent;
            } else {
                newNarrations[questionId] = [{ type: 'text', value: 'No narration available' }];
            }
            setNarrations(newNarrations);
        } catch (error) {
            console.error(`Error fetching narration for question ${questions[currentIndex].QuestionId}:`, error);
        }
    };

    const handleNextQuestion = () => {
        setShowNarrations(false);

        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prevIndex) => prevIndex + 1);
        } else {
            computeResults(); // Calculate results when the last question is completed
        }
    };

    const computeResults = () => {
        console.log('Computing Results...');
        const correctCount = questions.filter(
            (q) => userAnswers[q.QuestionId] === q.answer
        ).length;

        console.log('Correct Answers:', correctCount);
        console.log('Total Questions:', questions.length);

        setResults({
            correct: correctCount,
            total: questions.length,
        });
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Questions for Subtopic: {subtopic}</Text>
            {questions.length > 0 && currentIndex < questions.length ? (
                <View style={styles.questionContainer}>
                    <QuestionRenderer
                        question={questions[currentIndex]}
                        onAnswerSelected={handleAnswerSelected}
                    />

                    {showNarrations ? (
                        narrations[questions[currentIndex].QuestionId] && (
                            <View style={styles.narrationContainer}>
                                {narrations[questions[currentIndex].QuestionId].map((item, idx) => {
                                    if (item.type === 'text') {
                                        return (
                                            <Text key={idx} style={styles.narrationText}>
                                                {item.value}
                                            </Text>
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
                                            <View key={idx} style={styles.narrationVideoContainer}>
                                                <Video
                                                    source={{ uri: item.value }}
                                                    style={styles.narrationVideo}
                                                    useNativeControls
                                                    resizeMode="contain"
                                                    isLooping={false}
                                                />
                                            </View>
                                        );
                                    }
                                    return null;
                                })}

                                {/* Finish button shows when the user is on the last question */}
                                <Button
                                    title={currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                                    onPress={currentIndex === questions.length - 1 ? computeResults : handleNextQuestion}
                                />
                            </View>
                        )
                    ) : (
                        <Button
                            title={currentIndex === questions.length - 1 ? 'Submit' : 'Mark & View Narrations'}
                            onPress={handleSubmit}
                        />
                    )}
                </View>
            ) : results ? (
                // Display results after finishing the quiz
                <View style={styles.resultContainer}>
                    <Text style={styles.resultText}>
                        You answered {results.correct} out of {results.total} questions correctly.
                    </Text>
                </View>
            ) : (
                <Text>No questions available.</Text>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    questionContainer: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderColor: '#ddd',
        borderWidth: 1,
    },
    narrationContainer: {
        marginTop: 16,
    },
    narrationText: {
        fontSize: 14,
        marginBottom: 8,
    },
    narrationImage: {
        width: '100%',
        height: 200,
        marginBottom: 8,
    },
    narrationVideoContainer: {
        height: 200,
        marginBottom: 8,
    },
    narrationVideo: {
        width: '100%',
        height: '100%',
    },
    resultContainer: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
    },
    resultText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'green',
    },
});

export default QuestionScreen;
