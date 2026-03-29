import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import NetInfo from '@react-native-community/netinfo';
import NeoBrutalistConfirmModal from '../../components/NeoBrutalistConfirmModal';

import styles from './subjectStyles';
import useDistrictWindow from './useDistrictWindow';
import useOfflinePackages from './useOfflinePackages';
import DownloadModal from './DownloadModal';

const SubjectScreen = ({ navigation }) => {
  const { userData } = useUser();

  // ── Online data ─────────────────────────────────────────────────────────────
  const [subjects, setSubjects]           = useState([]);
  const [schoolWork, setSchoolWork]       = useState([]);
  const [schoolDetails, setSchoolDetails] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  // ── Network ─────────────────────────────────────────────────────────────────
  const [isOffline, setIsOffline]               = useState(false);
  const [isNetworkOffline, setIsNetworkOffline] = useState(false);

  // ── Decrypt overlay ─────────────────────────────────────────────────────────
  const [isDecrypting, setIsDecrypting] = useState(false);

  // ── District window + access rules ──────────────────────────────────────────
  const isDistrictExamWindowActive = useDistrictWindow();
  const isPremiumUser = ['beta', 'paid'].includes(userData?.status ?? '');

  // ── Offline packages hook ────────────────────────────────────────────────────
  const offline = useOfflinePackages({
    userData,
    isPremiumUser,
    isDistrictExamWindowActive,
  });

  // ── NetInfo listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setTimeout(() => {
        // During the district exam window the app behaves as if it is fully
        // offline regardless of the actual network connection — no API calls
        // are made and only downloaded subjects are shown.
        const networkOffline = !state.isConnected;
        setIsNetworkOffline(networkOffline);
        setIsOffline(networkOffline || isDistrictExamWindowActive);
      }, 1000);
    });
    offline.loadLocalManifest();
    return () => unsubscribe();
  }, [isDistrictExamWindowActive]);

  // When the district window opens/closes mid-session, sync isOffline immediately.
  useEffect(() => {
    if (isDistrictExamWindowActive) {
      // Window just opened — force offline mode, no network calls
      setIsOffline(true);
      setLoading(false);
    } else {
      // Window just closed — restore real network state
      setIsOffline(isNetworkOffline);
    }
  }, [isDistrictExamWindowActive]);

  // ── Fetch online data when connection available ──────────────────────────────
  useEffect(() => {
    // Hard guard: never touch the API during the district exam window
    if (isDistrictExamWindowActive) {
      setLoading(false);
      return;
    }
    if (!isOffline) fetchOnlineData();
    else setLoading(false);
  }, [userData?.class, isOffline, isDistrictExamWindowActive]);

  const fetchOnlineData = async () => {
    // Safety net — should never be reached during the window, but just in case
    if (isDistrictExamWindowActive) return;

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const [subjectsRes, workRes] = await Promise.allSettled([
        axios.post('https://homeedu.fsdgroup.com.ng/api/subjects', { class: userData.class }),
        axios.get('https://homeedu.fsdgroup.com.ng/api/student/school-work', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (workRes.status === 'fulfilled' && workRes.value.data.status === 200) {
        setSchoolWork(workRes.value.data.data);
        setSchoolDetails(workRes.value.data.school_details || null);
      } else {
        console.warn('schoolWork fetch failed:', workRes.reason ?? workRes.value?.data);
        setSchoolWork([]);
        setSchoolDetails(null);
      }

      if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data.status === 200) {
        setSubjects(subjectsRes.value.data.data);
      } else {
        setError('Failed to load general subjects.');
      }
    } catch {
      setError('An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Navigation helpers ───────────────────────────────────────────────────────
  const handleButtonPress = () => {
    navigation.navigate('Exam', {
      type: userData.class === 'JAMB' ? 'JAMB' : 'classExam',
      subject: null, topic: null, subtopic: null,
      userClass: userData.class,
    });
  };

  const startSchoolWork = (work) => {
    navigation.navigate('Instruction', {
      type:        work.district_id ? 'DistrictWork' : 'schoolWork',
      subtopicId:  work.subtopicId,
      subject:     work.subject,
      title:       work.title,
      duration:    work.duration_minutes,
      instructions: work.instructions,
      userClass:   work.target_class,
      teacherName: work.district_id ? 'District Admin' : work.teacher?.name,
    });
  };

  const handleOfflineSubjectPress = async (manifestItem) => {
    setIsDecrypting(true);
    await new Promise(r => setTimeout(r, 50));
    try {
      const encryptedString = await FileSystem.readAsStringAsync(manifestItem.fileUri);
      const rawKey = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_KEY;
      const rawIv  = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_IV;

      if (!rawKey || !rawIv) throw new Error('Security keys missing.');

      const key       = CryptoJS.enc.Utf8.parse(rawKey);
      const iv        = CryptoJS.enc.Utf8.parse(rawIv);
      const decrypted = CryptoJS.AES.decrypt(encryptedString, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
      const json      = decrypted.toString(CryptoJS.enc.Utf8);
      if (!json) throw new Error('Decryption empty.');

      const parsedData = JSON.parse(json);

      if (manifestItem.type === 'subject') {
        navigation.navigate('Topic', {
          isOffline: true,
          offlineTopics: parsedData.data.topics,
          subject:   manifestItem.subjectName,
          userClass: userData.class,
        });
      } else {
        const examData = parsedData.data;
        navigation.navigate('Instruction', {
          type:         manifestItem.type === 'district' ? 'DistrictWork' : 'schoolWork',
          subtopicId:   examData.subtopicId,
          subject:      examData.subject,
          title:        examData.title,
          duration:     examData.duration_minutes,
          instructions: examData.instructions,
          userClass:    examData.target_class,
          teacherName:  manifestItem.type === 'district' ? 'District Admin' : (examData.teacher?.name || 'Teacher'),
          openDate:     examData.open_date,
          closeDate:    examData.close_date,
          isOffline:    true,
          offlineQuestions: examData.questions,
        });
      }
    } catch (err) {
      Alert.alert('Corrupted File', 'Could not unlock the offline file.');
    } finally {
      setIsDecrypting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  const districtMocks     = schoolWork.filter(w => w.district_id !== null);
  const schoolAssignments = schoolWork.filter(w => w.district_id === null);

  // During district window: show download button to EVERYONE (free + premium)
  // Outside window: only show to premium
  const showDownloadButton = !isOffline && (isPremiumUser || isDistrictExamWindowActive);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Banners ── */}
      {isDistrictExamWindowActive ? (
        <View style={[styles.offlineBanner, { backgroundColor: '#6D28D9' }]}>
          <Ionicons name="school" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>🏫 District Exam Window Active — Offline Access Free for Everyone!</Text>
        </View>
      ) : isNetworkOffline ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
          <Text style={styles.offlineBannerText}>No Internet: Displaying saved subjects only</Text>
        </View>
      ) : null}

      {/* ── Main list ── */}
      <FlatList
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.subjectSelectionTitleWithButton} numberOfLines={1}>
                {userData?.class}
              </Text>

              {!isOffline && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {showDownloadButton && (
                    <TouchableOpacity
                      style={styles.downloadIconBtn}
                      onPress={() => offline.setShowDownloadModal(true)}
                    >
                      <Ionicons name="cloud-download-outline" size={20} color="#864AF9" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.headerButton} onPress={handleButtonPress}>
                    <Text style={styles.headerButtonText}>Free Exam</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* District mocks strip */}
            {!isOffline && districtMocks.length > 0 && (
              <View style={styles.schoolWorkSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, styles.districtSectionTitle]}>🏛️ District Mocks</Text>
                </View>
                <FlatList
                  data={districtMocks}
                  keyExtractor={item => item.subtopicId.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.workCard, styles.districtCardBorder]} onPress={() => startSchoolWork(item)}>
                      <Text style={styles.workTitle}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}

            {/* Section header row */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                {isOffline || offline.downloadedSubjects.length > 0 ? '📦 Saved Subjects' : '📚 General Subjects'}
              </Text>
              {offline.downloadedSubjects.length > 0 && (
                <TouchableOpacity onPress={() => offline.setShowClearModal(true)} style={styles.clearStorageBtn}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.clearStorageText}>Clear Space</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        }

        // When offline: show downloaded subjects only if user can access them
        data={isOffline ? (offline.canAccessOffline ? offline.downloadedSubjects : []) : subjects}

        keyExtractor={(item) => {
          if (isOffline) {
            const id = item.subjectId ?? item.examId ?? item.type;
            return id?.toString() ?? Math.random().toString();
          }
          return item.SubjectId.toString();
        }}

        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.subjectItem}
            onPress={() => isOffline
              ? handleOfflineSubjectPress(item)
              : navigation.navigate('Topic', { subjectId: item.SubjectId, userClass: userData.class, subject: item.Subject })
            }
          >
            <View style={styles.subCont}>
              <Image
                source={item.Icon ? { uri: item.Icon } : require('../../assets/education.png')}
                style={styles.subImg}
              />
              <Text style={styles.subjectText} numberOfLines={2}>
                {isOffline ? item.subjectName : item.Subject}
              </Text>
              {isOffline && (
                <View style={styles.savedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                  <Text style={{ fontSize: 10, color: '#10B981', fontWeight: 'bold' }}> SAVED</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        numColumns={2}
        columnWrapperStyle={styles.subjectListWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}

        ListEmptyComponent={
          // User is offline but can't access vault → show paywall
          isOffline && !offline.canAccessOffline ? (
            <View style={styles.premiumUpsellContainer}>
              <View style={styles.lockCircle}>
                <Ionicons name="lock-closed" size={40} color="#864AF9" />
              </View>
              <Text style={styles.premiumUpsellTitle}>Offline Vault Locked</Text>
              <Text style={styles.premiumUpsellText}>
                Upgrade to Premium to practice your downloaded exams anytime without internet.
              </Text>
              <TouchableOpacity style={styles.upsellBtn} onPress={() => navigation.navigate('Subscription')}>
                <Text style={styles.upsellBtnText}>Unlock Premium Access</Text>
              </TouchableOpacity>
              <Text style={styles.premiumUpsellSubtext}>
                ⏳ District Exams unlock for free every Sunday from 8:30 AM to 12:30 PM (WAT).
              </Text>
            </View>
          ) : isOffline ? (
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748B' }}>
              No offline subjects downloaded yet.
            </Text>
          ) : null
        }
      />

      {/* ── Confirm modals ── */}
      <NeoBrutalistConfirmModal
        visible={offline.showUpgradeModal}
        onClose={() => offline.setShowUpgradeModal(false)}
        onConfirm={() => { offline.setShowUpgradeModal(false); navigation.navigate('Subscription'); }}
        title="Upgrade to Premium 🚀"
        message="Free users can download up to 4 subjects. Upgrade to Premium for unlimited offline access!"
        confirmText="Upgrade Now"
        cancelText="Maybe Later"
        isDangerous={false}
      />

      <NeoBrutalistConfirmModal
        visible={offline.showClearModal}
        onClose={() => offline.setShowClearModal(false)}
        onConfirm={offline.handleConfirmClear}
        title="Clear Offline Storage"
        message="Are you sure you want to delete all saved subjects? You will need internet to download them again."
        confirmText="Delete All"
        cancelText="Cancel"
        isDangerous={true}
      />

      {/* ── Download modal ── */}
      <DownloadModal
        visible={offline.showDownloadModal}
        downloadStep={offline.downloadStep}
        schoolDetails={schoolDetails}
        selectedExamType={offline.selectedExamType}
        setSelectedExamType={offline.setSelectedExamType}
        subjects={subjects}
        downloadedSubjects={offline.downloadedSubjects}
        selectedOfflineSubjects={offline.selectedOfflineSubjects}
        toggleOfflineSelection={offline.toggleOfflineSelection}
        calculateDownloadSize={offline.calculateDownloadSize}
        totalDownloadSize={offline.totalDownloadSize}
        downloadProgress={offline.downloadProgress}
        downloadMessage={offline.downloadMessage}
        startDownload={offline.startDownload}
        setDownloadStep={offline.setDownloadStep}
        closeModal={offline.closeModal}
      />

      {/* ── Decrypting overlay ── */}
      {isDecrypting && (
        <View style={styles.decryptingOverlay}>
          <ActivityIndicator size="large" color="#864AF9" />
          <Text style={styles.decryptingText}>Unlocking securely...</Text>
        </View>
      )}
    </View>
  );
};

export default SubjectScreen;