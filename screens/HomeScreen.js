import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../context/UserContext';

const HomePage = ({ navigation }) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { setUserData } = useContext(UserContext);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        // 1. Check if user data exists in storage
        const savedUser = await AsyncStorage.getItem('userData');
        
        if (savedUser) {
          // 2. If found, restore to context and go to Dashboard
          const parsedUser = JSON.parse(savedUser);
          setUserData(parsedUser);
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        } else {
          // 3. If not found, stop loading and show the page
          setCheckingAuth(false);
        }
      } catch (error) {
        console.log('Error checking session:', error);
        setCheckingAuth(false);
      }
    };

    checkUserSession();
  }, []);

  // Show a loading spinner while checking storage
  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/Rectangle_106.png')}
      style={styles.background}
    >
      <View style={styles.illustration}>
        <Image source={require('../assets/EduGraphics.png')} style={styles.illustrationimg} />
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to HomeEdu!</Text>
        <Text style={styles.subtitle}>Learn, Test, and Excel</Text>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
  },
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    backgroundColor: '#fcfcfc'
  },
  illustration: {
    height: '40%',
    width: '100%',
    backgroundColor: '#864AF9'
  },
  illustrationimg: {
    height: 415,
    width: 398,
    resizeMode: 'contain', // Changed objectFit to resizeMode for RN compatibility
    alignSelf: 'center',   // Replaces alignItems/justifyContent in parent
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fcfcfc',
    borderTopLeftRadius: 25, // Changed '25%' to number for better compatibility
    borderTopRightRadius: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#864AF9',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'latto',
  },
  subtitle: {
    fontSize: 18,
    color: '#aaaaaa',
    marginBottom: 30,
    textAlign: 'center',
    fontFamily: 'latto',
  },
  button: {
    backgroundColor: '#864AF9',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fcfcfc',
    fontSize: 18,
    fontWeight: 'bold', 
    fontFamily: 'latto',
  },
});

export default HomePage;