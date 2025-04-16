import React, { useEffect, useState } from 'react';
import { View, Text, Image, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Button, Alert } from 'react-native';
import axios from 'axios';
import QuestionRenderer from '../renderer/QuestionRenderer';
import { useUser } from '../context/UserContext';
import { Video } from 'expo-av';

const QuestionScreen = ({ route, navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0); // Track the current question index
    const { userData } = useUser();
    const [narrations, setNarrations] = useState({});
    const [passed, setPassed] = useState({});
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
                console.log("This is the parsedQuestions", parsedQuestions);
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
    const [key, setKey] = useState(0);

    const handleNextQuestion = () => {
        setShowNarrations(false);
    
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prevIndex) => prevIndex + 1);
            setKey((prevKey) => prevKey + 1); // Change key to trigger full re-render
        } else {
            computeResults(); // Calculate results when the last question is completed
        }
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

        // Set pass or fail state
        setPassed(percentage >= 70);
    };



    useEffect(() => {
        console.log('Results updated:', results);
    }, [results]);

    return (
        <ScrollView style={styles.container} key={key}>
        
          <View style={styles.topDiv}>
            <View style={styles.tNav}>
              <Text style={styles.title}>Questions for Subtopic: {subtopic}</Text>
           </View>
          </View>

          <View style={styles.bottomDiv}></View>
            {questions.length > 0 && currentIndex < questions.length ? (
                <View style={styles.questionContainer}>
                    <QuestionRenderer
                        question={questions[currentIndex]}
                        onAnswerSelected={handleAnswerSelected}
                    />
    
                    {showNarrations ? (
                        <ScrollView style={styles.narrationContainer}>
                            {narrations[questions[currentIndex].QuestionId]?.map((item, idx) => {
                                if (item.type === 'text') {
                                    return <Text key={idx} style={styles.narrationText}>{item.value}</Text>;
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
                                        <Video
                                            key={idx}
                                            source={{ uri: item.value }}
                                            style={styles.narrationVideo}
                                            useNativeControls
                                        />
                                    );
                                }
                                return null;
                            })}
                            <TouchableOpacity
                                onPress={
                                    currentIndex === questions.length - 1
                                        ? computeResults
                                        : handleNextQuestion
                                }
                            >
                                <Text style={styles.buttonText}>
                                    {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    ) : (
                        <TouchableOpacity onPress={handleSubmit}>
                            <Text style={styles.buttonText}>
                                {currentIndex === questions.length - 1 ? 'Submit' : 'Mark & View Narrations'}
                            </Text>
                        </TouchableOpacity>
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
                                {/* Display Star Sticker Based on Score */}
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
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => {
                                        setIsModalVisible(false); // Close the modal
                                        if (passed) {
                                            // Navigate to Dashboard with reset if passed
                                            navigation.reset({
                                                index: 0,
                                                routes: [{ name: 'Dashboard' }],
                                            });
                                        } else {
                                            // Navigate to Explanation if failed
                                            navigation.navigate('Explanation', {
                                                subtopicId,
                                                subtopic,
                                            });
                                        }
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Close</Text>
                                </TouchableOpacity>


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
        flex: 1,
        backgroundColor: '#864af9', // Light gray background for consistency
        //padding: 16,
        overflow: 'scroll',
       /* position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,*/
    },
    tNav:{
      backgroundColor: '#fcfcfc',
      padding: 8,
      width: '100%',
      borderBottomWidth: 1,
      borderColor: '#fcfcfc',
      //borderBottomEndRadius: 32,
      //borderBottomLeftRadius: 32,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#864af9', // Themed blue color
        marginBottom: 16,
        textAlign: 'center',
        fontFamily: 'latto'
       
    },
    topDiv: {
      backgroundColor: '#fcfcfc', // Themed blue color
      borderBottomLeftRadius: 16,
      height: 100,
      width: '100%',
      textAlign: 'center',
      marginBottom: 20,
      borderBottomEndRadius: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    /*bottomDiv: {
      backgroundColor: '#657af9', // Themed blue color
      //borderBottomLeftRadius: '50%',
      height: '100%',
      width: '100%',
      textAlign: 'center',
      borderTopStartRadius: 32,
      overflow: 'scroll',
    },*/
    questionContainer: {
        backgroundColor: '#fcfcfc',
        borderRadius: 12,
        padding: 16,
        width: '85%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#864af9',
        shadowColor: '#333',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3, // Elevation for Android
        margin: 'auto',
       /* position: 'absolute',
        top: 150,
        left: '50%',
        transform: [{translateX: '-50%'}],*/
        overflow: 'scroll',
    },
    narrationContainer: {
        backgroundColor: '#fff', // Light blue for narrations
        padding: 16,
        borderRadius: 12,
        borderColor: '#864af9',
        marginTop: 16,
        marginBottom: 16,
        //overflow: 'visible',
    },
    narrationText: {
        fontSize: 16,
        lineHeight: 22,
        color: '#333',
        marginBottom: 8,
        fontFamily: 'latto',
    },
    narrationImage: {
        width: '100%', // Full-width images
        height: 200, // Fixed height
        borderRadius: 8,
        marginBottom: 16,
        resizeMode: 'cover', // Ensures images are well-fitted
        borderWidth: 1,
        borderColor: '#864af9', // Light border for images
        objectFit: 'contain',
    },
    narrationVideoContainer: {
        marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    narrationVideo: {
        width: '100%',
        height: 200,
        borderWidth: 1,
        borderColor: '#864af9', // Light border for images
        objectFit: 'contain',
        marginBottom: 16,
        borderRadius: 8,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    modalContent: {
        backgroundColor: '#fcfcfc',
        padding: 24,
        borderRadius: 12,
        width: '80%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5, // Elevation for Android
        fontFamily: 'latto',
    },
    stickerImage: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    resultText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
        marginBottom: 24,
        fontFamily: 'latto',
    },
    modalButton: {
        backgroundColor: '#864af9',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fcfcfc',
        fontFamily: 'latto',
    },
    buttonText: {
        backgroundColor: '#864af9',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        color: 'white',
        textAlign: 'center',
        fontFamily: 'latto',
    },

});


export default QuestionScreen;
