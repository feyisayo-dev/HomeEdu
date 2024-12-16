import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { Video } from 'expo-av';

const ExplanationScreen = ({ route, navigation }) => {
    const { subtopicId, Subtopic } = route.params; // Get SubtopicId from route params
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchExplanation = async () => {
            try {
                const response = await axios.get(
                    `https://homeedu.fsdgroup.com.ng/api/explanation/${subtopicId}`
                );

                if (response.data.status === 200) {
                    const explanationData = response.data.data[0]; // Get the first explanation object
                    if (explanationData && explanationData.Content) {
                        // Parse the JSON string from Content
                        setContent(JSON.parse(explanationData.Content));
                    } else {
                        setError('Explanation content is missing.');
                    }
                } else {
                    setError('Failed to load explanation.');
                }
            } catch (err) {
                console.error(err);
                setError('An error occurred while fetching the explanation.');
            } finally {
                setLoading(false);
            }
        };

        fetchExplanation();
    }, [subtopicId]);

    if (loading) return <ActivityIndicator size="large" color="#0000ff" />;
    if (error) return <Text>{error}</Text>;

    return (
        <ScrollView style={styles.container}>
            {content.map((item, index) => {
                if (item.type === 'text') {
                    return (
                        <Text key={index} style={styles.text}>
                            {item.value}
                        </Text>
                    );
                } else if (item.type === 'image') {
                    return (
                        <Image
                            key={index}
                            source={{ uri: item.value }}
                            style={styles.image}
                        />
                    );
                } else if (item.type === 'video') {
                    return (
                        <View key={index} style={styles.videoContainer}>
                            <Video
                                source={{ uri: item.value }}
                                style={styles.video}
                                useNativeControls
                                resizeMode="contain"
                                isLooping={false}
                            />
                        </View>
                    );
                }
                return null;
            })}
            <TouchableOpacity
                style={styles.button} 
                onPress={() => navigation.navigate('Example', {'subtopicId': subtopicId, 'subtopic': Subtopic })}
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>


        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 16,
        marginBottom: 16,
    },
    image: {
        width: '100%',
        height: 200,
        marginBottom: 16,
        borderRadius: 8,
    },
    video: {
        width: '100%',
        height: 200,
        marginBottom: 16,
    },
    videoContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#007bff',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 16,
        alignSelf: 'center', // Center the button horizontally
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },});

export default ExplanationScreen;
