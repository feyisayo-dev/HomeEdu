import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { useUser } from '../context/UserContext';

const SubjectScreen = ({navigation}) => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData } = useUser(); // Assuming userData contains the class info

  useEffect(() => {
    const fetchSubjects = async () => {
        try {
          console.log("This is class",userData.class)

          const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/subjects', {
            class: userData.class,
          });
          if (response.data.status === 200) {
            setSubjects(response.data.data);
          } else {
            setError("Failed to load subjects.");
          }
        } catch (err) {
          setError("An error occurred while fetching subjects.");
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

  return (
<View style={styles.container}>
  <Text style={styles.title}>Subjects for Class {userData.class}</Text>
  <FlatList
    data={subjects}
    keyExtractor={(item) => item.SubjectId.toString()}
    renderItem={({ item }) => (
      <View style={styles.subjectItem}>
        <Text 
          style={styles.subjectText}
          onPress={() => navigation.navigate('Topic', { subjectId: item.Subject })} // Pass SubjectId here
        > 
          {item.Subject}
        </Text>
      </View>
    )}
  />
</View>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subjectItem: {
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 10,
  },
  subjectText: {
    fontSize: 16,
    color: '#333',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default SubjectScreen;
