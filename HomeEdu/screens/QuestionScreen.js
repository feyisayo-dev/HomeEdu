import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal, StyleSheet, ScrollView, ActivityIndicator, Button, Alert } from 'react-native';
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
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { subtopicId, subtopic } = route.params;


    let startTime;

    const startQuiz = () => {
        startTime = new Date().getTime();  // Record the start time in milliseconds
    };

    useEffect(() => {
        startQuiz();
    });

    
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
    const submitReport = async (time_taken, percentage) => {
        const correctAnswers = questions.filter((q) => q.isCorrect).length;
        const score = (correctAnswers / questions.length) * 100;  // Calculate the score as a percentage
    
        const reportData = {
            username: userData.username, 
            score: percentage,  // Use the score as a percentage
            subtopicId: subtopicId, 
            examId: null, 
            time_taken: time_taken,  // Pass the calculated time_taken
        };
    
        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reportData),
            });
    
            const data = await response.json();
            if (data.status === 200) {
                console.log('Report submitted successfully');
            } else {
                console.error('Failed to submit report');
            }
        } catch (error) {
            console.error('Error submitting report:', error);
        }
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
        console.log("CurrentIndex:", currentIndex);
        console.log("Total Questions:", questions.length);
    };


    const computeResults = () => {
        if (!questions || questions.length === 0) {
            console.error('No questions to compute results.');
            return;
        }
    
        const correctAnswers = questions.filter((q) => q.isCorrect).length;
        const percentage = (correctAnswers / questions.length) * 100; // Calculate the percentage
        setResults({ correct: correctAnswers, total: questions.length, percentage });
        setIsModalVisible(true); // Show the modal
    
        const endTime = new Date().getTime(); // Capture the end time
        if (!startTime) {
            console.error('Start time is not set. Cannot calculate time taken.');
            return;
        }
    
        const timeTakenInSeconds = Math.floor((endTime - startTime) / 1000); // Calculate time in seconds
        const pad = (num) => String(num).padStart(2, '0'); // Format to MM:SS
        const timeTaken = `${pad(Math.floor(timeTakenInSeconds / 60))}:${pad(timeTakenInSeconds % 60)}`;
    
        console.log('Time taken:', timeTaken);
        submitReport(timeTaken, percentage);
    };
    
    

    useEffect(() => {
        console.log('Results updated:', results);
    }, [results]);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Questions for Subtopic: {subtopic}</Text>
            {questions.length > 0 && currentIndex < questions.length ? ( // Do not subtract 1 here
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

                                {/* Handle Finish on Last Question */}
                                <Button
                                    title={currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                                    onPress={
                                        currentIndex === questions.length - 1
                                            ? computeResults
                                            : handleNextQuestion
                                    }
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
            ) : (
                <Text>No questions available.</Text>
            )}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {results && (
                            <>
                                {/* Calculate Score Percentage */}
                                {(() => {
                                    const percentage = (results.correct / results.total) * 100;

                                    let sticker;
                                    if (percentage >= 90) {
                                        sticker = require('../assets/gold_star.png');
                                    } else if (percentage >= 70) {
                                        sticker = require('../assets/silver_star.png');
                                    } else if (percentage >= 50) {
                                        sticker = require('../assets/bronze_star.png');
                                    } else {
                                        sticker = require('../assets/dull_star.png');
                                    }

                                    return (
                                        <Image
                                            source={sticker}
                                            style={styles.stickerImage}
                                        />
                                    );
                                })()}

                                <Text style={styles.resultText}>
                                    You answered {results.correct} out of {results.total} questions correctly.
                                </Text>
                                <Button
                                    title="Close"
                                    onPress={() => setIsModalVisible(false)}
                                />
                            </>
                        )}
                    </View>
                </View>
            </Modal>

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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    resultText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
        textAlign: 'center',
    },
    stickerImage: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
});

export default QuestionScreen;
