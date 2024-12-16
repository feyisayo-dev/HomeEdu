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

const ExampleScreen = ({ route, navigation }) => {
    const { subtopicId, subtopic } = route.params; // Passed from the previous screen
    const [examples, setExamples] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchExamples();
    }, []);

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

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            {item.Image ? (
                <Image
                    source={{ uri: item.Image }}
                    style={styles.image}
                />
            ) : (
                null
            )}
            <Text style={styles.text}>Instruction: {item.Instruction}</Text>
            <Text style={styles.text}>{item.Text}</Text>
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
            {examples.length > 0 ? (
                <FlatList
                    data={examples}
                    keyExtractor={(item) => item.ExampleId.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            ) : (
                <Text style={styles.noExamplesText}>No examples found.</Text>
            )}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Question', { 'subtopicId': subtopicId, 'subtopic': subtopic })}
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    list: {
        paddingBottom: 16,
    },
    card: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        backgroundColor: '#f9f9f9',
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 8,
    },
    placeholder: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    placeholderText: {
        color: '#888',
        fontSize: 16,
    },
    text: {
        fontSize: 16,
        marginBottom: 4,
    },
    noExamplesText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ExampleScreen;
