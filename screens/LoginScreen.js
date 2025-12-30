import React, { useContext, useState, useEffect } from 'react'; // Added useEffect
import { View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUserData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true); // New state for initial check

  // 1. Check if user is already logged in when screen loads
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('userData');
        if (savedUser) {
          // If data exists, restore it to context and go to Dashboard
          const parsedUser = JSON.parse(savedUser);
          setUserData(parsedUser);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        }
      } catch (error) {
        console.log('Error loading saved login:', error);
      } finally {
        setCheckingLogin(false);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/login', {
        email,
        password,
      });

      if (response.data.userData) {
        // 2. Save user data to local storage
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.userData));

        setUserData(response.data.userData); 
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        }); 
      } else {
        Alert.alert('Success', response.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false); 
    }
  };

  // Optional: Show a blank screen or loader while checking for existing login
  if (checkingLogin) {
    return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#864AF9" />
        </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/Rectangle_106.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.top}>
        <Text style={styles.toptext}>Login</Text>
        <Text style={styles.topsubtext}>Sign in to continue your journey</Text>
      </View>
      <View style={styles.container}>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#666666"
        />
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 5, paddingHorizontal: 10, backgroundColor: '#dddddd', marginBottom: 24, borderColor: '#fcfcfc' }}>
             {/* Note: I moved styling to the View to make the eye icon align better with input */}
          <TextInput
            style={{ flex: 1, paddingVertical: 10, color: '#000000', fontFamily: 'latto' }}
            placeholder="Password"
            secureTextEntry={!showPassword} 
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#666666"
          />

          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="gray" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogin} style={styles.btn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Login</Text>
          )}
        </TouchableOpacity>
        <Text onPress={() => navigation.navigate('Register')
        } style={styles.link}>
          Don't have an account? <Text style={styles.regLink}>Register here</Text>
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
  top: {
    height: '20%',
    width: '100%',
    paddingLeft: 20,
    display: 'flex',
    justifyContent: 'center',
  },
  toptext: {
    fontSize: 36,
    fontWeight: '700', // Changed 700 to string '700' for Android compatibility
    color: '#fcfcfc',
    fontFamily: 'latto',
  },
  topsubtext: {
    fontSize: 16,
    fontWeight: '400',
    color: '#f4f4f4',
    fontFamily: 'latto',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start', // Changed start to flex-start
    padding: 20,
    paddingTop: 100,
    backgroundColor: '#fcfcfc',
    borderTopLeftRadius: 20, // Removed %
    borderTopRightRadius: 0,
  },
  title: {
    fontSize: 32,
    marginBottom: 32,
    textAlign: 'center',
    color: '#864AF9',
    borderRadius: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    marginBottom: 24,
    padding: 10,
    borderRadius: 8,
    borderColor: '#fcfcfc',
    color: '#000000',
    backgroundColor: '#dddddd',
    fontFamily: 'latto',
  },
  btn: {
    marginTop: 32,
    backgroundColor: '#864AF9',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '90%',
    alignItems: 'center',
    marginHorizontal: 'auto', // Changed margin: auto
  },
  btnText: {
    color: '#fcfcfc',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'latto',
  },
  link: {
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
  },
  regLink: {
    color: '#864af9',
  },
});