import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image, ActivityIndicator, Modal, Linking, Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from '../context/UserContext';

// ⚠️ CHANGE THIS VERSION NUMBER EVERY TIME YOU BUILD A NEW APK
const CURRENT_ANDROID_VERSION = "1.2.0";
const CURRENT_IOS_VERSION = "1.1.1";

// ⚠️ MAINTENANCE MODE TOGGLE - Set to true to enable maintenance mode
const MAINTENANCE_MODE = false; // Change to true when servers are down
const MAINTENANCE_CONFIG = {
  title: "Under Maintenance",
  message: "We're currently performing maintenance to improve your experience. Please check back soon.",
  estimated_time: "2-3 hours",
  support_url: null,
};

const currentTime = new Date().getTime();
const VERSION_CHECK_URL = `https://www.fsdgroup.com.ng/Edu/version.json?time=${currentTime}`;

const { width } = Dimensions.get('window');

const HomePage = ({ navigation }) => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(MAINTENANCE_MODE);
  const [updateData, setUpdateData] = useState(null);

  const { setUserData } = useContext(UserContext);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // --- STEP 1: CHECK MAINTENANCE MODE ---
        if (MAINTENANCE_MODE) {
          setCheckingAuth(false);
          return; // Block app usage immediately
        }

        // --- STEP 2: CHECK FOR UPDATES ---
        const response = await fetch(VERSION_CHECK_URL);
        const data = await response.json();

        // 🚨 CRITICAL: Determine which version to compare based on the OS
        const currentAppVersion = Platform.OS === 'ios' ? CURRENT_IOS_VERSION : CURRENT_ANDROID_VERSION;
        const serverAppVersion = Platform.OS === 'ios' ? data.ios_version : data.android_version;

        // Check if the server provided a version for this OS, and if it doesn't match our app
        if (data && serverAppVersion && serverAppVersion !== currentAppVersion) {
          setUpdateData(data);
          setShowUpdateModal(true);

          // If force_update is true, block the app
          if (data.force_update) {
            setCheckingAuth(false);
            return;
          }
        }

        // --- STEP 3: IF NO UPDATE OR MAINTENANCE, CHECK LOGIN SESSION ---
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
        // Fallback logic
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

  // Handle dismissing the update modal (only works if force_update is false)
  const handleDismissUpdate = () => {
    if (updateData && !updateData.force_update) {
      setShowUpdateModal(false);
    }
  };

  if (checkingAuth) {
    return (
      <ImageBackground
        source={require('../assets/Rectangle_106.png')}
        style={styles.loadingContainer}
      >
        <View style={styles.illustration}>
          <Image source={require('../assets/EduGraphics.png')} style={styles.illustrationimg} />
        </View>
        <View style={styles.loadingContentWrapper}>
          <ActivityIndicator size="large" color="#864AF9" />
          <Text style={styles.loadingText}>Checking for updates...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/Rectangle_106.png')}
      style={styles.background}
    >
      {/* --- MAINTENANCE MODE MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMaintenanceModal}
        onRequestClose={() => { }} // Block Android back button
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 40 }}>🔧</Text>
            </View>

            <Text style={styles.modalTitle}>
              {MAINTENANCE_CONFIG.title}
            </Text>

            <Text style={styles.modalMessage}>
              {MAINTENANCE_CONFIG.message}
            </Text>

            {MAINTENANCE_CONFIG.estimated_time && (
              <View style={styles.versionTag}>
                <Text style={styles.versionText}>
                  Estimated time: {MAINTENANCE_CONFIG.estimated_time}
                </Text>
              </View>
            )}

            {MAINTENANCE_CONFIG.support_url && (
              <TouchableOpacity
                style={[styles.updateButton, styles.secondaryBtn]}
                onPress={() => Linking.openURL(MAINTENANCE_CONFIG.support_url)}
              >
                <Text style={styles.secondaryBtnText}>Contact Support</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* --- UPDATE MODAL (Can be dismissed if force_update is false) --- */}
      {!showMaintenanceModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showUpdateModal}
          onRequestClose={handleDismissUpdate}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Close button - only show if force_update is false */}
              {updateData && !updateData.force_update && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleDismissUpdate}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              )}

              <View style={styles.iconCircle}>
                <Text style={{ fontSize: 40 }}>🚀</Text>
              </View>

              <Text style={styles.modalTitle}>
                {updateData?.title || "Time to Update!"}
              </Text>

              <Text style={styles.modalMessage}>
                {updateData?.message || "A new version of HomeEdu is available."}
              </Text>

              <View style={styles.versionTag}>
                <Text style={styles.versionText}>
                  New Version: {Platform.OS === 'ios' ? updateData?.ios_version : updateData?.android_version}
                </Text>
              </View>

              {/* Primary Update Button (Dynamic for App Store / Play Store) */}
              <TouchableOpacity
                style={[styles.updateButton, styles.primaryBtn]}
                onPress={() => {
                  const url = Platform.OS === 'ios' ? updateData?.app_store_url : updateData?.play_store_url;
                  Linking.openURL(url);
                }}
              >
                <Text style={styles.primaryBtnText}>
                  Update via {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}
                </Text>
              </TouchableOpacity>

              {/* Website Download - ONLY show on Android (Apple bans this) */}
              {Platform.OS === 'android' && (
                <TouchableOpacity
                  style={[styles.updateButton, styles.secondaryBtn]}
                  onPress={() => Linking.openURL(updateData?.website_url)}
                >
                  <Text style={styles.secondaryBtnText}>Download directly from Website</Text>
                </TouchableOpacity>
              )}

              {/* "Maybe Later" button - only show if force_update is false */}
              {updateData && !updateData.force_update && (
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={handleDismissUpdate}
                >
                  <Text style={styles.dismissButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>
      )}

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
    backgroundColor: '#fcfcfc',
  },
  loadingContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    borderTopLeftRadius: 25,
    marginTop: -25,
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

  // --- 🎨 MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#864AF9',
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
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'latto',
  },
  dismissButton: {
    marginTop: 8,
    paddingVertical: 10,
  },
  dismissButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'latto',
  },
});

export default HomePage;