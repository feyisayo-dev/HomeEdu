import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
} from 'react-native';
import axios from 'axios';
import Katex from 'react-native-katex';

const ExampleScreen = ({ route, navigation }) => {
    const { subtopicId, subtopic } = route.params; // Passed from the previous screen
    const [examples, setExamples] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExamples();
    }, []);
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
    const fetchExamples = async () => {
        try {
            const response = await axios.get(
                `https://homeedu.fsdgroup.com.ng/api/examples/${subtopicId}`
            );
            if (response.data.status === 200) {
                setExamples(response.data.data);
            } else {
                Alert.alert('No Examples', response.data.message);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch examples. Please try again later.');
        } finally {
            setLoading(false);
        }
    };
    const ExampleCard = ({ example }) => (
        <View style={styles.card}>
            {example.Image ? (
                <Image source={{ uri: example.Image }} style={styles.image} />
            ) : null}
            <Text style={styles.text}>Instruction: {example.Instruction}</Text>
                {renderContentWithMath(example.Text, styles.text)}
        </View>
    );


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Examples for Subtopic: {subtopic}</Text>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#864af9" />
                </View>
            ) : examples.length > 0 ? (
                <FlatList
                    data={examples}
                    keyExtractor={(item) => item.ExampleId.toString()}
                    renderItem={({ item }) => <ExampleCard example={item} />}
                    contentContainerStyle={styles.list}
                />
            ) : (
                <Text style={styles.noExamplesText}>No examples found.</Text>
            )}
            <TouchableOpacity
                style={styles.button}
                onPress={() =>
                    navigation.navigate('Question', {
                        subtopicId: subtopicId,
                        subtopic: subtopic,
                        selectedSubjects: null,
                        type: null,
                    })

                }
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );

};
const inlineStyle = `
        html, body {
        background-color: transparent;
        margin: 0;
        padding: 0;
        }
        .katex {
        font-size: 4em;
        }
`;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f4f', // Light background
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        //color: '#007bff', // Themed blue color
        color: '#864af9', // Themed blue color
        marginBottom: 24,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 16,
    },
    card: {
        backgroundColor: '#fcfcfc', // Card background
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ddd', // Light border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2, // Android shadow
    },
    image: {
        width: '100%',
        height: 200, // Fixed height for uniform images
        borderRadius: 8,
        marginBottom: 12,
        resizeMode: 'cover', // Fit image within boundaries
        borderWidth: 1,
        borderColor: '#864af9',
        objectFit: 'contain',
        tintColor: '864af9'
    },
    text: {
        fontSize: 16,
        lineHeight: 24, // Improved readability
        color: '#333', // Neutral text color
        marginBottom: 8,
        fontFamily: 'latto'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    noExamplesText: {
        fontSize: 16,
        color: '#888', // Subtle color for no examples message
        textAlign: 'center',
        marginTop: 20,
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


export default ExampleScreen;
