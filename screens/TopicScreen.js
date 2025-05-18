import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useUser } from '../context/UserContext';

const TopicScreen = ({ route, navigation }) => {
  const { subjectId } = route.params; // Get SubjectId from route params
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData, setUserData } = useUser(); // Access user data from context

  useEffect(() => {
    // Fetch topics based on the subjectId
    const fetchTopics = async () => {
      console.log("This is subjectId", subjectId)
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
  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'subjectExam',
      subject: subjectId,
      topic: null,
      subtopic: null,
      userClass: userData.class,
    });

  }

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />; // Show loading spinner
  if (error) return <Text>{error}</Text>; // Show error message if any

  return (
    <View style={styles.topicSelectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.topicSelectionTitle}>Topics for Subject {subjectId}</Text>
      </View>
      <FlatList
        data={topics}
        keyExtractor={(item) => item.TopicId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicItem}
            onPress={() =>
              navigation.navigate('Subtopic', { topicId: item.TopicId, Topic: item.Topic, Subject: subjectId })
            }
          >
            <Image source={require('../assets/education.png')} style={styles.subImg} />
            <Text style={styles.topicText}>{item.Topic}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.topicList}
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={[styles.startButton]}
        onPress={handleButtonPress}>
        <Text style={styles.startButtonText}>Take Exam</Text>
      </TouchableOpacity>
    </View>
  );

};

// Define styles here
const styles = StyleSheet.create({
  topicSelectionContainer: {
    flex: 1,
    backgroundColor: '#f4f4f4', // Light gray background
    padding: 16,
  },
  // topicSelectionTitle: {
  //   fontSize: 24,
  //   fontWeight: 'bold',
  //   color: '#864af9', // Themed color
  //   marginBottom: 24,
  //   maxWidth: '95%',
  //   textAlign: 'center', // Center-align the title
  //   margin: 'auto',
  //   fontFamily: 'latto',
  // },
  topicList: {
    paddingBottom: 16,
  },
  topicItem: {
    backgroundColor: '#fcfcfc', // Light green background
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    //borderWidth: 1,
    // borderColor: '#4caf50', // Green border for a fresh look
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3, // Elevation for Android

    gap: 20,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center', // Center the text
  },
  subImg: {
    width: 40,
    height: 40,
    // textAlign: 'center',
    //margin: 'auto',
    //marginBottom: 20,
    borderWidth: 1,
    borderColor: '#864af9',
    borderRadius: 8,
    padding: 5,
  },
  topicText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'latto',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topicSelectionTitle: {
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


export default TopicScreen;
