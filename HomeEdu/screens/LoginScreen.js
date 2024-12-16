import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground } from 'react-native';
import axios from 'axios';
import { UserContext } from '../context/UserContext';


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUserData } = useContext(UserContext); // Access the context

  const handleLogin = async () => {
    try {
      const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/login', {
        email,
        password,
      });

      if (response.data.userData) {
        setUserData(response.data.userData); // Save userData in context
        navigation.navigate('Dashboard'); // Navigate without passing userData
      } else {
        Alert.alert('Success', response.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <Text style={styles.title}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="white"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="white"
        />
        <Button title="Login" onPress={handleLogin} color="#841584" />
        <Text onPress={() => navigation.navigate('Register')} style={styles.link}>
          Don't have an account? Register here
        </Text>
      </View>
    </ImageBackground>
  );
}


const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Add transparency overlay
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: 'white',
    borderRadius: 10
  },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    borderColor: 'white',
    color: 'white',
  },
  link: {
    color: '#add8e6',
    marginTop: 10,
    textAlign: 'center',
  },
});
