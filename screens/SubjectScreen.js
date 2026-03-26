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
  Modal,
  Alert
} from 'react-native';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import NeoBrutalistConfirmModal from '../components/NeoBrutalistConfirmModal';
const { width } = Dimensions.get('window');

const SubjectScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [schoolWork, setSchoolWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Offline Mode States
  const [isOffline, setIsOffline] = useState(false);
  const [downloadedSubjects, setDownloadedSubjects] = useState([]); // Manifest of saved files
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedOfflineSubjects, setSelectedOfflineSubjects] = useState([]);
  const [downloadStep, setDownloadStep] = useState('select'); // 'select' | 'confirm' | 'downloading'
  const [packagesInfo, setPackagesInfo] = useState([]);
  const [totalDownloadSize, setTotalDownloadSize] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const { userData } = useUser();

  // ── Network & Initial Data Fetch ──────────────────────────────────────────
  useEffect(() => {
    // Listen for network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    loadLocalManifest();

    return () => unsubscribe();
  }, []);

  const clearOfflineData = () => {
    setShowClearModal(true);
  };

  const handleConfirmClear = async () => {
    setShowClearModal(false);

    try {
      // Wipe the entire folder
      const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(OFFLINE_DIR, { idempotent: true });
      }

      // Clear the memory manifest
      await AsyncStorage.removeItem(`@offline_manifest_${userData.class}`);

      // Reset the React state
      setDownloadedSubjects([]);

      // Show success with another modal (or you can use Alert for this)
      Alert.alert("Storage Cleared", "All offline packages have been removed.");
    } catch (error) {
      console.error("Error clearing storage:", error);
      Alert.alert("Error", "Could not delete all files. Please restart the app and try again.");
    }
  };



  useEffect(() => {
    if (!isOffline) {
      fetchOnlineData();
    } else {
      setLoading(false); // If offline, skip the API calls
    }
  }, [userData.class, isOffline]);

  const fetchOnlineData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const subjectsPromise = axios.post(
        'https://homeedu.fsdgroup.com.ng/api/subjects',
        { class: userData.class }
      );
      const schoolWorkPromise = axios.get(
        'https://homeedu.fsdgroup.com.ng/api/student/school-work',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const [subjectsRes, workRes] = await Promise.allSettled([subjectsPromise, schoolWorkPromise]);

      if (workRes.status === 'fulfilled' && workRes.value.data.status === 200) {
        setSchoolWork(workRes.value.data.data);
      }
      if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data.status === 200) {
        setSubjects(subjectsRes.value.data.data);
      } else {
        setError('Failed to load general subjects.');
      }
    } catch (err) {
      setError('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Offline File System Logic ──────────────────────────────────────────────
  const OFFLINE_DIR = FileSystem.documentDirectory + 'offline_packages/';

  // Load the list of subjects already downloaded from AsyncStorage
  const loadLocalManifest = async () => {
    try {
      const manifestStr = await AsyncStorage.getItem(`@offline_manifest_${userData.class}`);
      if (manifestStr) {
        setDownloadedSubjects(JSON.parse(manifestStr));
      }
    } catch (e) {
      console.log("Error loading manifest", e);
    }
  };

  const toggleOfflineSelection = (subjectId) => {
    if (selectedOfflineSubjects.includes(subjectId)) {
      setSelectedOfflineSubjects(selectedOfflineSubjects.filter(id => id !== subjectId));
      return;
    }

    const isPremium = userData?.status === 'paid';

    if (!isPremium) {
      const totalLifetimeSubjects = downloadedSubjects.length + selectedOfflineSubjects.length;

      if (totalLifetimeSubjects >= 4) {
        // TRIGGER THE NEO-BRUTALIST UPGRADE MODAL
        setShowUpgradeModal(true);
        return;
      }
    }

    if (selectedOfflineSubjects.length >= 4) {
      Alert.alert("Batch Limit", "To keep downloads fast, please download 4 subjects at a time.");
      return;
    }

    setSelectedOfflineSubjects([...selectedOfflineSubjects, subjectId]);
  };


  // Step 1: Hit API to get URLs and calculate size
  const calculateDownloadSize = async () => {
    if (selectedOfflineSubjects.length === 0) return;
    setDownloadStep('calculating');

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/offline-packages-urls', {
        class: userData.class,
        subject_ids: selectedOfflineSubjects
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 200) {
        const downloads = response.data.downloads;
        setPackagesInfo(downloads);

        // Sum up the sizes and convert to MB
        const totalBytes = downloads.reduce((acc, curr) => acc + curr.size_bytes, 0);
        setTotalDownloadSize((totalBytes / (1024 * 1024)).toFixed(2));

        setDownloadStep('confirm');
      } else {
        Alert.alert("Error", "Could not prepare offline packages.");
        setDownloadStep('select');
      }
    } catch (error) {
      Alert.alert("Error", "Network error while preparing download.");
      setDownloadStep('select');
    }
  };

  // A simple function to pause execution and let the server breathe
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Step 2: Actually download the files using expo-file-system
  const startDownload = async () => {
    setDownloadStep('downloading');
    setDownloadProgress(0);

    try {
      // 1. Grab and validate the token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error("Authentication token missing. Please log in again.");
      }

      // 2. Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });
      }

      let newManifest = [...downloadedSubjects];

      // 3. Loop through and download requested packages
      for (let i = 0; i < packagesInfo.length; i++) {
        const pkg = packagesInfo[i];
        const fileUri = OFFLINE_DIR + `${pkg.subjectId}.enc`;

        const downloadResumable = FileSystem.createDownloadResumable(
          pkg.url,
          fileUri,
          { headers: { Authorization: `Bearer ${token}` } },
          (downloadProgress) => {
            const written = downloadProgress.totalBytesWritten;
            const expected = downloadProgress.totalBytesExpectedToWrite;

            let progress = 0;
            if (expected > 0) {
              progress = written / expected;
            } else if (pkg.size_bytes && pkg.size_bytes > 0) {
              progress = written / pkg.size_bytes;
            } else {
              progress = 0.5;
            }
            progress = Math.max(0, Math.min(progress, 1));
            setDownloadProgress(((i + progress) / packagesInfo.length) * 100);
          }
        );

        try {
          const result = await downloadResumable.downloadAsync();

          // 🛑 NEW: Explicitly catch the Laravel Rate Limit error!
          if (result.status === 429) {
            throw new Error("Server is catching its breath! You are downloading too fast. Please try again in 1 minute.");
          } else if (result.status !== 200) {
            throw new Error(`Server rejected download with status: ${result.status}`);
          }

          const manifestItem = {
            subjectId: pkg.subjectId,
            subjectName: pkg.subjectName,
            fileUri: fileUri
          };

          newManifest = newManifest.filter(item => item.subjectId !== pkg.subjectId);
          newManifest.push(manifestItem);

          // 🛑 NEW: Let the server breathe for 1.5 seconds before asking for the next file!
          // We only sleep if it's NOT the last item in the array.
          if (i < packagesInfo.length - 1) {
            await sleep(1500);
          }

        } catch (downloadError) {
          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(fileUri, { idempotent: true });
          }
          console.error(`Failed to download ${pkg.subjectName}:`, downloadError);
          // Pass the specific 429 error message up to the user, otherwise show generic error
          throw new Error(downloadError.message || `Failed to download ${pkg.subjectName}. Check your connection.`);
        }
      }

      // 4. Save manifest ONLY after successful downloads
      await AsyncStorage.setItem(`@offline_manifest_${userData.class}`, JSON.stringify(newManifest));
      setDownloadedSubjects(newManifest);

      Alert.alert("Success", "Offline packages secured and downloaded successfully!");
      closeModal();
    } catch (error) {
      console.error("Download Error Details:", error);
      Alert.alert("Download Failed", error.message || "There was an error saving the files. Please try again.");
      setDownloadStep('select');
    }
  };

  const closeModal = () => {
    setShowDownloadModal(false);
    setDownloadStep('select');
    setSelectedOfflineSubjects([]);
    setDownloadProgress(0);
  };

  // ── Navigation Handlers ──────────────────────────────────────────────────
  const handleOfflineSubjectPress = async (manifestItem) => {
    try {
      // 1. Read the ENCRYPTED string from the phone's storage
      const encryptedString = await FileSystem.readAsStringAsync(manifestItem.fileUri);

      // 2. Safely fetch keys from Expo environment variables
      const rawKey = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_KEY;
      const rawIv = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_IV;

      if (!rawKey || !rawIv) {
        throw new Error("Security keys are missing. App cannot decrypt files.");
      }

      // 3. Parse keys for CryptoJS
      const key = CryptoJS.enc.Utf8.parse(rawKey);
      const iv = CryptoJS.enc.Utf8.parse(rawIv);

      // 4. 🔒 Decrypt the data securely in RAM
      const decrypted = CryptoJS.AES.decrypt(encryptedString, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // 5. Convert back to string
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error("Decryption resulted in empty data. Invalid key or corrupted file.");
      }

      // 6. Parse the original JSON
      const parsedData = JSON.parse(decryptedString);

      // 7. Navigate with decrypted topics!
      navigation.navigate('Topic', {
        isOffline: true,
        offlineTopics: parsedData.data.topics,
        subject: manifestItem.subjectName,
        userClass: userData.class,
      });

    } catch (error) {
      console.error("Decryption/Read Error:", error);
      Alert.alert(
        "Corrupted File",
        "Could not unlock the offline file. Please delete it from your downloads and try again."
      );
    }
  };
  const handleButtonPress = () => {
    if (userData.class === "JAMB") {
      navigation.navigate('Exam', { type: 'JAMB', subject: null, topic: null, subtopic: null, userClass: userData.class });
    } else {
      navigation.navigate('Exam', { type: 'classExam', subject: null, topic: null, subtopic: null, userClass: userData.class });
    }
  };

  const startSchoolWork = (work) => {
    navigation.navigate('Instruction', {
      type: work.district_id ? 'DistrictWork' : 'schoolWork',
      subtopicId: work.subtopicId,
      subject: work.subject,
      title: work.title,
      duration: work.duration_minutes,
      instructions: work.instructions,
      userClass: work.target_class,
      teacherName: work.district_id ? 'District Admin' : work.teacher?.name,
    });
  };

  // ── Renderers ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  const districtMocks = schoolWork.filter(item => item.district_id !== null);
  const schoolAssignments = schoolWork.filter(item => item.district_id === null);

  // Allow premium users to see download button (adjust this logic based on your user status)
  const isPremiumUser = ['beta', 'paid'].includes(userData.status || 'paid'); // Assuming beta/paid for now

  return (
    <View style={styles.container}>
      {/* ── Offline Mode Banner ── */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>Offline Mode: Displaying saved subjects only</Text>
        </View>
      )}

      {/* ── Main List ── */}
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.subjectSelectionTitleWithButton} numberOfLines={1}>
                {userData.class}
              </Text>

              {!isOffline ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {isPremiumUser && (
                    <TouchableOpacity style={styles.downloadIconBtn} onPress={() => setShowDownloadModal(true)}>
                      <Ionicons name="cloud-download-outline" size={20} color="#864AF9" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.headerButton} onPress={handleButtonPress}>
                    <Text style={styles.headerButtonText}>Free Exam</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {/* Hide District/School work if Offline */}
            {!isOffline && districtMocks.length > 0 && (
              <View style={styles.schoolWorkSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, styles.districtSectionTitle]}>🏛️ District Mocks</Text>
                </View>
                <FlatList
                  data={districtMocks}
                  keyExtractor={(item) => item.subtopicId.toString()}
                  renderItem={({ item }) => (
                    /* Your existing work card render logic here (omitted for brevity) */
                    <TouchableOpacity style={[styles.workCard, styles.districtCardBorder]} onPress={() => startSchoolWork(item)}>
                      <Text style={styles.workTitle}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}

            {/* New Code: */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                {isOffline || downloadedSubjects.length > 0 ? '📦 Saved Subjects' : '📚 General Subjects'}
              </Text>

              {downloadedSubjects.length > 0 && (
                <TouchableOpacity onPress={clearOfflineData} style={styles.clearStorageBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.clearStorageText}>Clear Space</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        // If offline, map over the downloaded manifest. If online, map over the API subjects.
        data={isOffline ? downloadedSubjects : subjects}
        keyExtractor={(item) => isOffline ? item.subjectId.toString() : item.SubjectId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subjectItem}
            onPress={() => isOffline
              ? handleOfflineSubjectPress(item)
              : navigation.navigate('Topic', { subjectId: item.SubjectId, userClass: userData.class, subject: item.Subject })
            }
          >
            <View style={styles.subCont}>
              <Image source={item.Icon ? { uri: item.Icon } : require('../assets/education.png')} style={styles.subImg} />
              <Text style={styles.subjectText} numberOfLines={2}>
                {isOffline ? item.subjectName : item.Subject}
              </Text>
              {isOffline && (
                <View style={styles.savedBadge}><Ionicons name="checkmark-circle" size={12} color="#10B981" /><Text style={{ fontSize: 10, color: '#10B981', fontWeight: 'bold' }}> SAVED</Text></View>
              )}
            </View>
          </TouchableOpacity>
        )}
        numColumns={2}
        columnWrapperStyle={styles.subjectListWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          isOffline && <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>No offline subjects downloaded yet.</Text>
        }
      />

      <NeoBrutalistConfirmModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onConfirm={() => {
          setShowUpgradeModal(false);
          navigation.navigate('Subscription'); // Send them to the paywall!
        }}
        title="Beta Limit Reached 🚀"
        message="Free users can only keep 4 offline subjects at a time. Upgrade to Premium for unlimited offline downloads, or clear your storage to swap subjects!"
        confirmText="Upgrade Now"
        cancelText="Maybe Later"
        isDangerous={false}
      />

      <NeoBrutalistConfirmModal
        visible={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleConfirmClear}
        title="Clear Offline Storage"
        message="Are you sure you want to delete all saved subjects? You will need an internet connection to download them again."
        confirmText="Delete All"
        cancelText="Cancel"
        isDangerous={true}
      />

      {/* ── Offline Download Modal ────────────────────────────────────────────── */}
      <Modal visible={showDownloadModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Offline Packages</Text>
              {downloadStep === 'select' && (
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={28} color="#111827" />
                </TouchableOpacity>
              )}
            </View>

            {downloadStep === 'select' && (
              <>
                <Text style={styles.modalSub}>Select up to 4 subjects to save for offline practice.</Text>
                <FlatList
                  data={subjects}
                  keyExtractor={item => item.SubjectId.toString()}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 10 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedOfflineSubjects.includes(item.SubjectId);
                    const isAlreadyDownloaded = downloadedSubjects.some(d => d.subjectId === item.SubjectId);
                    return (
                      <TouchableOpacity
                        style={[styles.modalSubjectCard, isSelected && styles.modalSubjectCardActive, isAlreadyDownloaded && { opacity: 0.5 }]}
                        onPress={() => !isAlreadyDownloaded && toggleOfflineSelection(item.SubjectId)}
                        disabled={isAlreadyDownloaded}
                      >
                        <Text style={[styles.modalSubjectText, isSelected && { color: '#864AF9' }]}>
                          {item.Subject}
                        </Text>
                        {isAlreadyDownloaded && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity
                  style={[styles.modalBtn, selectedOfflineSubjects.length === 0 && { backgroundColor: '#ccc', borderColor: '#ccc' }]}
                  disabled={selectedOfflineSubjects.length === 0}
                  onPress={calculateDownloadSize}
                >
                  <Text style={styles.modalBtnText}>Calculate Size</Text>
                </TouchableOpacity>
              </>
            )}

            {downloadStep === 'calculating' && (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color="#864AF9" />
                <Text style={{ marginTop: 10, fontWeight: '600' }}>Checking file sizes...</Text>
              </View>
            )}

            {downloadStep === 'confirm' && (
              <View style={styles.modalCenter}>
                <Ionicons name="folder-outline" size={60} color="#864AF9" />
                <Text style={styles.sizeText}>Total Size: {totalDownloadSize} MB</Text>
                <Text style={styles.modalSub}>This will be saved directly to your phone storage.</Text>

                <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 20 }}>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 1, backgroundColor: '#FFF' }]} onPress={() => setDownloadStep('select')}>
                    <Text style={[styles.modalBtnText, { color: '#111827' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 2 }]} onPress={startDownload}>
                    <Text style={styles.modalBtnText}>Confirm Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {downloadStep === 'downloading' && (
              <View style={styles.modalCenter}>
                <Ionicons name="cloud-download" size={60} color="#864AF9" />
                <Text style={styles.sizeText}>Downloading...</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                </View>
                <Text style={{ marginTop: 10, fontWeight: '700' }}>{Math.round(downloadProgress)}%</Text>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  // ... (Keep all your existing styles here) ...
  container: { flex: 1, backgroundColor: '#F8F9FE', paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, elevation: 4 },
  subjectSelectionTitleWithButton: { fontSize: 20, fontWeight: '800', color: '#2D3748', flex: 1, marginRight: 12 },
  headerButton: { backgroundColor: '#864AF9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  headerButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  subjectListWrapper: { justifyContent: 'space-between' },
  subjectItem: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 16, elevation: 5, width: (width - 48) / 2, height: 160, borderWidth: 1, borderColor: 'rgba(134, 74, 249, 0.1)' },
  subCont: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  subImg: { width: 50, height: 50, marginBottom: 12 },
  subjectText: { fontSize: 15, fontWeight: '700', color: '#2D3748', textAlign: 'center' },

  // New Styles for Offline Features
  offlineBanner: { backgroundColor: '#EF4444', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 8 },
  offlineBannerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  downloadIconBtn: { padding: 10, backgroundColor: '#F7F3FF', borderRadius: 12, borderWidth: 1, borderColor: '#864AF9' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DEF7EC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginTop: 8 },

  // Neo-Brutalist Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '60%', borderTopWidth: 4, borderColor: '#111827' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 20, fontWeight: '600' },
  modalSubjectCard: { flex: 1, backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 2, borderColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between' },
  modalSubjectCardActive: { backgroundColor: '#F7F3FF', borderColor: '#864AF9' },
  modalSubjectText: { fontWeight: '700', color: '#111827' },
  modalBtn: { backgroundColor: '#864AF9', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 16, borderWidth: 3, borderColor: '#111827', shadowColor: '#111827', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  modalBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, textTransform: 'uppercase' },
  modalCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sizeText: { fontSize: 28, fontWeight: '900', color: '#111827', marginTop: 16 },
  progressBarBg: { width: '100%', height: 20, backgroundColor: '#E5E7EB', borderRadius: 10, marginTop: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#111827' },
  progressBarFill: { height: '100%', backgroundColor: '#10B981' },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  clearStorageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2', // Light red background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  clearStorageText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default SubjectScreen;