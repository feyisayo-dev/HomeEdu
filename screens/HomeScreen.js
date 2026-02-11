import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image, ActivityIndicator, Modal, Linking, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../context/UserContext';

// ⚠️ CHANGE THIS VERSION NUMBER EVERY TIME YOU BUILD A NEW APK
const CURRENT_APP_VERSION = "1.1.5"; 
const currentTime = new Date().getTime();
// ⚠️ REPLACE WITH THE LINK TO YOUR JSON FILE
const VERSION_CHECK_URL = `https://www.fsdgroup.com.ng/Edu/version.json?time=${currentTime}`; 

const { width } = Dimensions.get('window');

const HomePage = ({ navigation }) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateData, setUpdateData] = useState(null);
  
  const { setUserData } = useContext(UserContext);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // --- STEP 1: CHECK FOR UPDATES ---
        const response = await fetch(VERSION_CHECK_URL);
        const data = await response.json();

        if (data && data.android_version !== CURRENT_APP_VERSION) {
            setUpdateData(data);
            setShowUpdateModal(true);
            setCheckingAuth(false);
            return; 
        }

        // --- STEP 2: IF NO UPDATE, CHECK LOGIN SESSION ---
        const savedUser = await AsyncStorage.getItem('userData');
        
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUserData(parsedUser);
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          });
        } else {
          setCheckingAuth(false);
        }

      } catch (error) {
        console.log('Error checking updates or session:', error);
        // Fallback: allow entry if check fails (e.g. no internet)
        const savedUser = await AsyncStorage.getItem('userData');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUserData(parsedUser);
            navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
        } else {
            setCheckingAuth(false);
        }
      }
    };

    initializeApp();
  }, []);

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#864AF9" />
        <Text style={styles.loadingText}>Checking for updates...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/Rectangle_106.png')}
      style={styles.background}
    >
        {/* --- FORCE UPDATE MODAL --- */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={showUpdateModal}
            onRequestClose={() => {}} // Block Android back button
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    
                    {/* Decorative Header Circle */}
                    <View style={styles.iconCircle}>
                        <Text style={{fontSize: 40}}>🚀</Text>
                    </View>
                    
                    <Text style={styles.modalTitle}>
                        {updateData?.title || "Time to Update!"}
                    </Text>
                    
                    <Text style={styles.modalMessage}>
                        {updateData?.message || "A new version of HomeEdu is available with better performance and new features."}
                    </Text>

                    <View style={styles.versionTag}>
                        <Text style={styles.versionText}>New Version: {updateData?.android_version || "Latest"}</Text>
                    </View>

                    {/* Button 1: Play Store (Primary) */}
                    <TouchableOpacity 
                        style={[styles.updateButton, styles.primaryBtn]} 
                        onPress={() => Linking.openURL(updateData?.play_store_url)}
                    >
                        <Text style={styles.primaryBtnText}>Update via Play Store</Text>
                    </TouchableOpacity>

                    {/* Button 2: Website (Secondary) */}
                    <TouchableOpacity 
                        style={[styles.updateButton, styles.secondaryBtn]} 
                        onPress={() => Linking.openURL(updateData?.website_url)}
                    >
                        <Text style={styles.secondaryBtnText}>Download directly from Website</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

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
  loadingText: {
    marginTop: 15,
    fontFamily: 'latto',
    fontSize: 16,
    color: '#666'
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
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fcfcfc',
    borderTopLeftRadius: 25,
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

  // --- 🎨 NEW MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)', // Darker background for focus
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 24,
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: 'center',
    elevation: 10, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#F3E8FF', // Very light purple bg
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'latto',
  },
  modalMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontFamily: 'latto',
  },
  versionTag: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 25,
  },
  versionText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
    fontFamily: 'latto',
  },
  updateButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#864AF9', // Main Brand Color
    shadowColor: '#864AF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'latto',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#4A5568', // Dark Grey
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'latto',
  },
});

export default HomePage;