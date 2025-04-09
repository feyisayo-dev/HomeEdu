import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground,Image } from 'react-native';

const HomePage = ({ navigation }) => {
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
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    backgroundColor: '#fcfcfc'
  },
  illustration:{
    height: '40%',
    width: '100%',
    backgroundColor: '#864AF9'
  },
  illustrationimg: {
    height: 415,
    width: 398,
    objectFit: 'contain',
    position: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
   // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
   backgroundColor: '#fcfcfc',
   borderTopLeftRadius: '25%',
   borderTopRightRadius: '0%',
  // height: 600,
   //width: 500
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
    fontWeight: 'bold', //oluwafeyisayofummi@gmail.com   1oladejoA@#
    fontFamily: 'latto',
  },
});

export default HomePage;
