import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ImageBackground, Image, TouchableOpacity } from 'react-native';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { ActivityIndicator } from 'react-native';


export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUserData } = useContext(UserContext); // Access the context
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/login', {
        email,
        password,
      });

      if (response.data.userData) {
        setUserData(response.data.userData); // Save userData in context
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        }); // Navigate without passing userData
      } else {
        Alert.alert('Success', response.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false); // hide loader
    }
  };

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
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholderTextColor="#666666"
        />
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
//  <Text style={styles.title}>HomeEdu</Text>

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
    // alignItems: 'center',
    justifyContent: 'center',
  },
  toptext: {
    fontSize: 36,
    fontWeight: 700,
    color: '#fcfcfc',
    fontFamily: 'latto',
  },
  topsubtext: {
    fontSize: 16,
    fontWeight: 400,
    color: '#f4f4f4',
    fontFamily: 'latto',
  },
  container: {
    flex: 1,
    justifyContent: 'start',
    padding: 20,
    paddingTop: 100,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Add transparency overlay
    backgroundColor: '#fcfcfc',
    borderTopLeftRadius: '20%',
    borderTopRightRadius: '0',
  },
  illustrationimg: {
    height: 150,
    width: 140,
    display: 'flex',
    //alignItems: 'center',
    //justifyContent: 'center',
    margin: 'auto',
    objectFit: 'contain'
  },
  title: {
    fontSize: 32,
    marginBottom: 32,
    textAlign: 'center',
    color: '#864AF9',
    borderRadius: 10,
    fontWeight: 600,
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
    borderRadiu: 8,
    backgroundColor: '#864AF9',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '90%',
    alignItems: 'center',
    color: 'fcfcfc',
    margin: 'auto',
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
