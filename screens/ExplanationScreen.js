import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import { Video } from 'expo-av';
import Katex from 'react-native-katex';

const ExplanationScreen = ({ route, navigation }) => {
    const { subtopicId, Subtopic } = route.params; // Get SubtopicId from route params
    const [content, setContent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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
                        <View key={index} style={styles.text}>
                            {renderContentWithMath(item.value, styles.text)}
                        </View>
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
                onPress={() => navigation.navigate('Example', { 'subtopicId': subtopicId, 'subtopic': Subtopic })}
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>


        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fcfcfc', // Light gray background
        padding: 16,
        paddingBottom: 32,
        // marginBottom: 20,
    },
    text: {
        fontSize: 16,
        lineHeight: 22, // Better readability with proper line spacing
        color: '#333', // Neutral text color
        marginBottom: 16, // Space between text blocks
        fontFamily: 'latto',
    },
    image: {
        width: '100%', // Full-width images
        height: 200, // Fixed height
        borderRadius: 8,
        marginBottom: 16,
        resizeMode: 'cover', // Ensures images are well-fitted
        borderWidth: 1,
        //borderColor: '#ddd', // Light border for images
        borderColor: '#864af9', // Light border for images
        objectFit: 'contain'
    },
    videoContainer: {
        marginBottom: 16, // Space below videos
        borderRadius: 8,
        overflow: 'hidden', // Ensures rounded corners for videos
        backgroundColor: '#000', // Placeholder background for videos
    },
    video: {
        width: '100%',
        height: 200, // Fixed video height
    },
    button: {
        backgroundColor: '#864af9',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff', // White text for contrast
    },
});


export default ExplanationScreen;
