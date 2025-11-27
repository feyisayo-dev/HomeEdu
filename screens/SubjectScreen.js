import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
const { width } = Dimensions.get('window');

import axios from 'axios';
import { useUser } from '../context/UserContext';

const SubjectScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData } = useUser(); // Assuming userData contains the class info

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        console.log('This is class', userData.class);

        const response = await axios.post(
          'https://homeedu.fsdgroup.com.ng/api/subjects',
          {
            class: userData.class,
          }
        );
        if (response.data.status === 200) {
          setSubjects(response.data.data);
        } else {
          setError('Failed to load subjects.');
        }
      } catch (err) {
        setError('An error occurred while fetching subjects.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [userData.class]);

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

  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: 'classExam',
      subject: null,
      topic: null,
      subtopic: null,
      userClass: userData.class,
    });
  }
  return (
    <View style={styles.subjectSelectionContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.subjectSelectionTitleWithButton}>
          {userData.class} Subjects
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleButtonPress}>
          <Text style={styles.headerButtonText}>Take Exam</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.SubjectId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subjectItem}
            onPress={() =>
              navigation.navigate('Topic', { subjectId: item.SubjectId, userClass: userData.class, subject: item.Subject })
            }>
            <View style={styles.subCont}>
              <Image
                source={
                  item.Icon
                    ? { uri: item.Icon } // Use the icon URL from the database
                    : require('../assets/education.png') // Fallback to default icon
                }
                style={styles.subImg}
              />
              <Text style={styles.subjectText}>{item.Subject}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.subjectList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  subjectSelectionContainer: {
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

  subjectSelectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  subjectSelectionTitleWithButton: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
    flexShrink: 1,
    numberOfLines: 1, 
    letterSpacing: 0.3,
  },

  headerButton: {
    backgroundColor: '#864AF9',
    paddingHorizontal: 20,
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

  // Subject List
  subjectList: {
    paddingBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },

  subjectItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: (width - 48) / 2, // Two columns with gap
    height: 180,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(134, 74, 249, 0.1)',
  },

  subCont: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  subImg: {
    width: 56,
    height: 56,
    marginBottom: 16,
    // tintColor: '#864AF9', // Applies color to icon if it's monochrome
  },

  subjectText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 22,
  },

  // Optional: Add hover/press effect styles
  subjectItemPressed: {
    backgroundColor: '#F7F9FC',
    transform: [{ scale: 0.98 }],
  },
});

export default SubjectScreen;
