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
<View style={styles.subtopicsContainer}>
  <Text style={styles.subtopicsTitle}>Subtopics for {Topic}</Text>
  <FlatList
    data={subtopics}
    keyExtractor={(item) => item.SubtopicId.toString()}
    renderItem={({ item }) => (
      <TouchableOpacity
        style={styles.subtopicItem}
        onPress={() =>
          navigation.navigate('Explanation', { subtopicId: item.SubtopicId, Subtopic: item.Subtopic })
        }
      >
        <Text style={styles.subtopicText}>{item.Subtopic}</Text>
      </TouchableOpacity>
    )}
    contentContainerStyle={styles.subtopicsList}
    showsVerticalScrollIndicator={false}
  />
</View>

  );
};

// Define styles here
const styles = StyleSheet.create({
  subtopicsContainer: {
      flex: 1,
      backgroundColor: '#f9f9f9', // Light gray background
      padding: 16,
  },
  subtopicsTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#864af9', // Purple-themed color
      marginBottom: 24,
      textAlign: 'center', // Center-align the title
      fontFamily: 'latto',
  },
  subtopicsList: {
      paddingBottom: 16,
  },
  subtopicItem: {
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
  subtopicText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333', // Neutral text color
      fontFamily: 'latto',
  },
});


export default SubtopicScreen;
