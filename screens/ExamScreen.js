import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    Image,
    Animated,
    Dimensions,
} from 'react-native';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import Checkbox from 'expo-checkbox';

const { width } = Dimensions.get('window');

// Animated Subject Item Component
const AnimatedSubjectItem = ({ item, index, isSelected, onPress, type }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const checkboxScale = useRef(new Animated.Value(1)).current;

    // Entrance animation
    React.useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                delay: index * 80,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                delay: index * 80,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Checkbox animation when selected
    React.useEffect(() => {
        if (isSelected) {
            Animated.sequence([
                Animated.spring(checkboxScale, {
                    toValue: 1.3,
                    tension: 100,
                    friction: 3,
                    useNativeDriver: true,
                }),
                Animated.spring(checkboxScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 5,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isSelected]);

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
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

    let displayText = '';
    let itemId = '';

    if (type === 'classExam') {
        displayText = item.Subject;
        itemId = item.Subject;
    } else if (type === 'subjectExam') {
        displayText = item.Topic;
        itemId = item.Topic;
    } else if (type === 'topicExam') {
        displayText = item.Subtopic;
        itemId = item.Subtopic;
    }

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
            }}
        >
            <TouchableOpacity
                style={[
                    styles.subjectItem,
                    isSelected && styles.subjectItemSelected,
                ]}
                onPress={() => onPress(itemId)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                <Animated.View style={{ transform: [{ scale: checkboxScale }] }}>
                    <Checkbox
                        value={isSelected}
                        onValueChange={() => onPress(itemId)}
                        color={isSelected ? '#864AF9' : undefined}
                    />
                </Animated.View>

                <View style={styles.subCont}>
                    {(type === 'classExam' || type === 'subjectExam') && (
                        <Image
                            source={
                                item.Icon
                                    ? { uri: item.Icon }
                                    : require('../assets/education.png')
                            }
                            style={styles.subImg}
                        />
                    )}
                    <Text style={styles.subjectText}>{displayText}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Animated Start Button Component
const AnimatedStartButton = ({ onPress, disabled, selectedCount }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation when enabled
    React.useEffect(() => {
        if (!disabled) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [disabled]);

    const handlePressIn = () => {
        if (!disabled) {
            Animated.spring(scaleAnim, {
                toValue: 0.95,
                useNativeDriver: true,
            }).start();
        }
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View
            style={{
                transform: [{ scale: disabled ? 1 : Animated.multiply(scaleAnim, pulseAnim) }],
            }}
        >
            <TouchableOpacity
                style={[
                    styles.startButton,
                    disabled && styles.startButtonDisabled,
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                disabled={disabled}
            >
                <Text style={styles.startButtonText}>
                    Start Exam {selectedCount > 0 && `(${selectedCount})`}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// Main ExamScreen Component
const ExamScreen = ({ route, navigation }) => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [Exam, setExam] = useState('');
    const { userData } = useUser();
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const { type, subject, topic, subtopic, userClass } = route.params;

    const toggleSubject = (subject) => {
        const isSelected = selectedSubjects.includes(subject);
        const isJamb = userData.class?.toLowerCase() === 'jamb';

        if (!isJamb) {
            if (type === 'classExam') {
                if (!isSelected && selectedSubjects.length >= 1) {
                    Alert.alert('Limit Reached', 'You can only select 1 subject.');
                    return;
                }
            }
        } else {
            if (type === 'classExam') {
                if (!isSelected && selectedSubjects.length >= 4) {
                    Alert.alert('Limit Reached', 'You can only select up to 4 subjects.');
                    return;
                }
            }
        }

        if (isSelected) {
            setSelectedSubjects((prev) => prev.filter((s) => s !== subject));
        } else {
            if (type === 'classExam') {
                setSelectedSubjects([subject]);
            } else {
                setSelectedSubjects((prev) => [...prev, subject]);
            }
        }
    };

    useEffect(() => {
        const changeExamTitleName = () => {
            if (type === 'classExam') {
                setExam('subject');
            }
            if (type === 'subjectExam') {
                setExam('topic');
            }
            if (type === 'topicExam') {
                setExam('subtopic');
            }
        };
        changeExamTitleName();
    }, [type]);

    const handleStartExam = () => {
        if (selectedSubjects.length < 1) {
            Alert.alert('No Subject Selected', 'Select at least 1 subject.');
            return;
        }
        Alert.alert('These are the selected subject(s)', selectedSubjects.join(', '));
        if (type === 'classExam') {
            let SubjectExam = selectedSubjects;
            navigation.navigate('Question', {
                subtopicId: null,
                subtopic: null,
                selectedSubjects,
                type,
                subject: SubjectExam,
                topic: null,
                subtopic: null,
            });
        } else {
            navigation.navigate('Question', {
                subtopicId: null,
                subtopic: subtopic,
                selectedSubjects,
                type,
                subject,
                topic,
                subtopic,
            });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                let response;

                switch (type) {
                    case 'classExam':
                        response = await axios.post('https://homeedu.fsdgroup.com.ng/api/subjects', {
                            class: userData.class,
                        });
                        if (response.data.status === 200) {
                            setSubjects(response.data.data);
                        } else {
                            setError('Failed to load subjects.');
                        }
                        break;

                    case 'subjectExam':
                        try {
                            const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/topics/${subject}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ class: userClass }),
                            });

                            const data = await response.json();
                            if (data.status === 200) {
                                setSubjects(data.data);
                            } else {
                                setError('Failed to load topics.');
                            }
                        } catch (err) {
                            setError('An error occurred while fetching topics.');
                        }
                        break;

                    case 'topicExam':
                        response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/subtopics/${topic}`);
                        if (response.data.status === 200) {
                            setSubjects(response.data.data);
                        } else {
                            setError('Failed to load subtopics.');
                        }
                        break;

                    default:
                        setError('Invalid type.');
                }
            } catch (err) {
                setError('An error occurred while fetching data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [type, subject, topic, userData.class]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#864AF9" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <View style={styles.subjectSelectionContainer}>
            <View style={styles.headerCard}>
                <Text style={styles.subjectSelectionTitle}>
                    Select {Exam} for {userData.class}
                </Text>
                {selectedSubjects.length > 0 && (
                    <Text style={styles.selectionCount}>
                        {selectedSubjects.length} selected
                    </Text>
                )}
            </View>

            <FlatList
                data={subjects}
                keyExtractor={(item) => {
                    if (type === 'classExam') return item.SubjectId.toString();
                    if (type === 'subjectExam') return item.TopicId.toString();
                    if (type === 'topicExam') return item.SubtopicId.toString();
                    return item.id?.toString();
                }}
                renderItem={({ item, index }) => {
                    let itemId = '';
                    if (type === 'classExam') itemId = item.Subject;
                    else if (type === 'subjectExam') itemId = item.Topic;
                    else if (type === 'topicExam') itemId = item.Subtopic;

                    const isSelected = selectedSubjects.includes(itemId);

                    return (
                        <AnimatedSubjectItem
                            item={item}
                            index={index}
                            isSelected={isSelected}
                            onPress={toggleSubject}
                            type={type}
                        />
                    );
                }}
                contentContainerStyle={styles.subjectList}
                showsVerticalScrollIndicator={false}
            />

            <AnimatedStartButton
                onPress={handleStartExam}
                disabled={selectedSubjects.length === 0}
                selectedCount={selectedSubjects.length}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    subjectSelectionContainer: {
        flex: 1,
        backgroundColor: '#F8F9FE',
        padding: 16,
    },
    headerCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        alignItems: 'center',
    },
    subjectSelectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3748',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    selectionCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#864AF9',
        marginTop: 8,
        backgroundColor: '#F7F3FF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    subjectList: {
        paddingBottom: 24,
    },
    subjectItem: {
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#E2E8F0',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        gap: 12,
    },
    subjectItemSelected: {
        borderLeftColor: '#864AF9',
        backgroundColor: '#F7F3FF',
        shadowColor: '#864AF9',
        shadowOpacity: 0.15,
        elevation: 4,
    },
    subCont: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    subImg: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F7F9FC',
    },
    subjectText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#2D3748',
        flex: 1,
        letterSpacing: 0.2,
    },
    startButton: {
        backgroundColor: '#864AF9',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 16,
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    startButtonDisabled: {
        backgroundColor: '#CBD5E0',
        shadowOpacity: 0.1,
    },
    startButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FE',
    },
    errorText: {
        fontSize: 16,
        color: '#F56565',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default ExamScreen;