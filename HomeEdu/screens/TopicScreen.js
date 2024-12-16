import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

const TopicScreen = ({ route, navigation }) => {
  const { subjectId } = route.params; // Get SubjectId from route params
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch topics based on the subjectId
    const fetchTopics = async () => {
      try {
        const response = await axios.get(`https://homeedu.fsdgroup.com.ng/api/topics/${subjectId}`);
        if (response.data.status === 200) {
          setTopics(response.data.data); // Set topics from response
        } else {
          setError("Failed to load topics.");
        }
      } catch (err) {
        setError("An error occurred while fetching topics.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [subjectId]);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />; // Show loading spinner
  if (error) return <Text>{error}</Text>; // Show error message if any

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Topics for Subject {subjectId}</Text>
      <FlatList
        data={topics}
        keyExtractor={(item) => item.TopicId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicItem}
            onPress={() => navigation.navigate('Subtopic', { topicId: item.TopicId, Topic: item.Topic })}
          >
            <Text style={styles.topicText}>{item.Topic}</Text>
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
  topicItem: {
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
  topicText: {
    fontSize: 18,
    color: '#333',
  },
});

export default TopicScreen;
