import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
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
          Subjects for Class {userData.class}
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
              navigation.navigate('Topic', { subjectId: item.Subject })
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
    backgroundColor: '#f4f4f4', // Light gray background
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  subjectSelectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#864af9', // Themed color
    marginBottom: 16,
    textAlign: 'center', // Center-align the title
    fontFamily: 'latto',
  },
  subjectSelectionTitleWithButton: {
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

  subjectList: {
    paddingBottom: 16,
    display: 'flex',
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between'
    gap: 20,
    justifyContent: 'center',
  },
  subjectItem: {
    backgroundColor: '#fcfcfc', // Light blue background
    // paddingVertical: 16,
    //paddingHorizontal: 12,
    borderRadius: 8,
    //borderWidth: 1,
    //borderColor: '#007bff', // Border matching the theme
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3, // Elevation for Android
    display: 'flex',
    alignItems: 'center', // Center the text
    justifyContent: 'center',
    height: 200,
    width: 160,
  },
  subCont: {
    display: 'flex',
    alignItems: 'center', // Center the text
    justifyContent: 'center',
    textAlign: 'center',
  },
  subImg: {
    width: 40,
    height: 40,
    textAlign: 'center',
    margin: 'auto',
    marginBottom: 20,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    display: 'flex',
    alignItems: 'center', // Center the text
    justifyContent: 'center',
    fontFamily: 'latto',
  },
});

export default SubjectScreen;
