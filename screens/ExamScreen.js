import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ScrollView,
    ActivityIndicator,
    Image,
} from 'react-native';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import Checkbox from 'expo-checkbox';


const ExamScreen = ({ route, navigation }) => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { userData } = useUser(); // Assuming userData contains the class info
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const { type, subject, topic, subtopic, userClass } = route.params;

    const toggleSubject = (subject) => {
        const isSelected = selectedSubjects.includes(subject);
        const isJamb = userData.class?.toLowerCase() === 'jamb'; // check class name

        if (!isJamb) {
            // For non-JAMB classes, allow only one subject
            if (!isSelected && selectedSubjects.length >= 1) {
                Alert.alert('Limit Reached', 'You can only select 1 subject.');
                return;
            }
        } else {
            // For JAMB, allow up to 4
            if (!isSelected && selectedSubjects.length >= 4) {
                Alert.alert('Limit Reached', 'You can only select up to 4 subjects.');
                return;
            }
        }

        if (isSelected) {
            setSelectedSubjects((prev) => prev.filter((s) => s !== subject));
        } else {
            // For non-JAMB, replace the existing selection
            if (!isJamb) {
                setSelectedSubjects([subject]);
            } else {
                setSelectedSubjects((prev) => [...prev, subject]);
            }
        }
    };



    const handleStartExam = () => {
        if (selectedSubjects.length < 1) {
            Alert.alert('No Subject Selected', 'Select at least 1 subject.');
            return;
        }
        Alert.alert("These are the selected subject(s)", selectedSubjects.join(', '));
        if(type === 'classExam') {
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
        }else{
        // Navigate to the exam screen, passing the selected subjects
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
            console.log('This is type', type);
            try {
                let response;

                switch (type) {
                    case 'classExam':
                        console.log('This is class', userData.class);
                        response = await axios.post('https://homeedu.fsdgroup.com.ng/api/subjects', {
                            class: userData.class,
                        });
                        console.log('This is response', response.data.data);
                        if (response.data.status === 200) {
                            setSubjects(response.data.data);
                        } else {
                            setError('Failed to load subjects.');
                        }
                        break;

                    case 'subjectExam':
                        console.log('This is subjectId', subject);
                        response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/topics/${subject}`);
                        console.log('This is response', response.data.data);
                        if (response.data.status === 200) {
                            setSubjects(response.data.data); // set as "subjects" if you're using a single state
                        } else {
                            setError('Failed to load topics.');
                        }
                        break;

                    case 'topicExam':
                        console.log('This is topicId', topic);
                        response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/subtopics/${topic}`);
                        console.log('This is response', response.data.data);
                        if (response.data.status === 200) {
                            setSubjects(response.data.data); // same here
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
                <ActivityIndicator size="large" color="#0000ff" />
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
            <Text style={styles.subjectSelectionTitle}>
                Select subjects for {userData.class}
            </Text>
            <FlatList
                data={subjects}
                keyExtractor={(item) => {
                    if (type === 'classExam') return item.SubjectId.toString();
                    if (type === 'subjectExam') return item.TopicId.toString();
                    if (type === 'topicExam') return item.SubtopicId.toString();
                    return item.id?.toString(); // fallback
                }}
                renderItem={({ item }) => {
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

                    const isSelected = selectedSubjects.includes(itemId);

                    return (
                        <TouchableOpacity
                            style={styles.subjectItem}
                            onPress={() => toggleSubject(itemId)}
                        >
                            <Checkbox
                                value={isSelected}
                                onValueChange={() => toggleSubject(itemId)}
                                color={isSelected ? '#864af9' : undefined}
                            />

                            <View style={styles.subCont}>
                                {type === 'subjectExam' && (
                                    <Image
                                        source={
                                            item.Icon
                                                ? { uri: item.Icon }
                                                : require('../assets/education.png')
                                        }
                                        style={styles.subImg}
                                    />
                                )}
                                {type === 'classExam' && (
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
                    );
                }}
                contentContainerStyle={styles.subjectList}
                showsVerticalScrollIndicator={false}
            />

            <TouchableOpacity
                style={[styles.startButton, selectedSubjects.length === 0 && { backgroundColor: '#ccc' }]}
                onPress={handleStartExam}>
                <Text style={styles.startButtonText}>Start Exam</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    subjectSelectionContainer: {
        flex: 1,
        backgroundColor: '#f4f4f4', // Light gray background
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },

    subjectSelectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#864af9', // Themed color
        marginBottom: 16,
        textAlign: 'center', // Center-align the title
        fontFamily: 'latto',
    },
    subjectSelectionTitleWithButton: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#864af9',
        fontFamily: 'latto',
    },

    headerButton: {
        backgroundColor: '#864af9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
    },

    headerButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },

    subjectList: {
        paddingBottom: 16,
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: 'row',
        alignItems: 'center',
        // justifyContent: 'space-between'
        gap: 20,
        justifyContent: 'center',
    },
    subjectItem: {
        //backgroundColor: '#D8C9F4', // Light purple background E9E2F8
        backgroundColor: '#E9E2F8', // Light purple background E9E2F8
        //opacity: 0.6,
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderLeftWidth: 6,
        //borderColor: '#673ab7', // Purple border
        borderColor: '#864af9', // Purple border
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 3, // Elevation for Android
        alignItems: 'start', // Center the text
    },
    subCont: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },

    subImg: {
        width: 40,
        height: 40,
        textAlign: 'left',
        marginLeft: '10',
        // marginBottom: 20,
        borderRadius: 5,
    },
    subjectText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        display: 'flex',
        alignItems: 'center', // Center the text
        justifyContent: 'center',
        fontFamily: 'latto',
    },
    startButton: {
        backgroundColor: '#864af9',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'latto',
    },
});

export default ExamScreen;
