import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

const SubtopicScreen = ({ route, navigation }) => {
  const { topicId, Topic } = route.params; // Get TopicId from route params
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch subtopics based on the topicId
    const fetchSubtopics = async () => {
      try {
        const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/subtopics/${topicId}`);
        if (response.data.status === 200) {
          setSubtopics(response.data.data); // Set subtopics from response
        } else {
          setError("Failed to load subtopics.");
        }
      } catch (err) {
        setError("An error occurred while fetching subtopics.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubtopics();
  }, [topicId]);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />; // Show loading spinner
  if (error) return <Text>{error}</Text>; // Show error message if any

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subtopics for {Topic}</Text>
      <FlatList
        data={subtopics}
        keyExtractor={(item) => item.SubtopicId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subtopicItem}
            onPress={() => navigation.navigate('Explanation', { subtopicId: item.SubtopicId, Subtopic: item.Subtopic })}
          >
            <Text style={styles.subtopicItem}>{item.Subtopic}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

// Define styles here
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtopicItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  subtopicText: {
    fontSize: 18,
    color: '#333',
  },
});

export default SubtopicScreen;
