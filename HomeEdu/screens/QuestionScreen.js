import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Button } from 'react-native';
import axios from 'axios';
import QuestionRenderer from '../renderer/QuestionRenderer';
import { useUser } from '../context/UserContext';

const QuestionScreen = ({ route, navigation }) => {
    const { userData } = useUser();
    const [narrations, setNarrations] = useState({});
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState({});
    const [results, setResults] = useState(null); // Track results

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
        setUserAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }));
    };
    const handleSubmit = async () => {
        const correctAnswers = questions.reduce((acc, question) => {
            acc[question.QuestionId] = question.answer;
            return acc;
        }, {});

        const score = Object.keys(userAnswers).reduce((acc, questionId) => {
            if (userAnswers[questionId] === correctAnswers[questionId]) {
                acc++;
            }
            return acc;
        }, 0);

        setResults({
            total: questions.length,
            correct: score,
        });

        // Update streaks
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

        // Fetch narrations for each question
        const newNarrations = {};
        for (const question of questions) {
            try {
                const response = await fetch(
                    `https://homeedu.fsdgroup.com.ng/api/narration/${question.QuestionId}`
                );
                const data = await response.json();
                if (response.ok) {
                    newNarrations[question.QuestionId] = data.narration || 'No narration available';
                } else {
                    newNarrations[question.QuestionId] = 'Failed to fetch narration';
                }
            } catch (error) {
                console.error(`Error fetching narration for question ${question.QuestionId}:`, error);
                newNarrations[question.QuestionId] = 'Error fetching narration';
            }
        }
        setNarrations(newNarrations);
    };



    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text>Loading questions...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Questions for Subtopic: {subtopic}</Text>
            {questions.length > 0 ? (
                questions.map((question, index) => (
                    <View key={index} style={styles.questionContainer}>
                        <QuestionRenderer
                            question={question}
                            onAnswerSelected={handleAnswerSelected}
                        />
                        {/* Display narration if available */}
                        {narrations[question.QuestionId] && (
                            <Text style={styles.narrationText}>
                                Narration: {narrations[question.QuestionId]}
                            </Text>
                        )}
                    </View>
                ))
            ) : (
                <Text>No questions available.</Text>
            )}
            <Button title="Submit" onPress={handleSubmit} />
            {results && (
                <Text>
                    You answered {results.correct} out of {results.total} questions correctly.
                </Text>
            )}
        </ScrollView>

    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    questionContainer: { marginBottom: 16 },
    narrationText: { marginTop: 8, fontStyle: 'italic', color: '#555' },
});

export default QuestionScreen;
