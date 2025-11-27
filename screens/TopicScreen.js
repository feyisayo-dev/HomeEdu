import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useUser } from '../context/UserContext';
const { width } = Dimensions.get('window');

const TopicScreen = ({ route, navigation }) => {
  const { subjectId, userClass, subject } = route.params; // Get subject from route params
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData, setUserData } = useUser(); // Access user data from context

  useEffect(() => {
    const fetchTopics = async () => {
      console.log("This is subject", subject);
      console.log("This is userClass", userClass);
      try {
        const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/topics/${subject}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ class: userClass }),
        });

        const data = await response.json(); // parse JSON body
        console.log("This is data", data);


        if (data.status === 200) {
          setTopics(data.data); // Set topics from response
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
  }, [subjectId, userClass, subject]);

  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'subjectExam',
      subject: subject,
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
        <Text style={styles.topicSelectionTitle}>Topics for Subject {subject}</Text>
      </View>
      <FlatList
        data={topics}
        keyExtractor={(item) => item.TopicId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.topicItem}
            onPress={() =>
              navigation.navigate('Subtopic', { topicId: item.TopicId, Topic: item.Topic, Subject: subject })
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

const styles = StyleSheet.create({
  topicSelectionContainer: {
    flex: 1,
    backgroundColor: '#F8F9FE',
    padding: 16,
  },

  // Header Section
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  topicSelectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    letterSpacing: 0.3,
    flex: 1,
    flexShrink: 1,
  },

  headerButton: {
    backgroundColor: '#864AF9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#864AF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Topic List
  topicList: {
    paddingBottom: 24,
  },

  topicItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#864AF9',
    gap: 16,
  },

  subImg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#F7F3FF',
    borderWidth: 2,
    borderColor: 'rgba(134, 74, 249, 0.2)',
    // tintColor: '#864AF9',
  },

  topicText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
    letterSpacing: 0.2,
  },

  // Bottom Button
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

  startButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Optional: Add pressed state
  topicItemPressed: {
    backgroundColor: '#F7F9FC',
    transform: [{ scale: 0.98 }],
  },
});

export default TopicScreen;
