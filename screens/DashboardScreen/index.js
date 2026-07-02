import React, { useEffect, useState, useMemo, useRef, useContext, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  Image,
  ActivityIndicator, Modal, Alert, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';

import { useUser } from '../../context/UserContext';
import { TutorialProvider, TutorialStep, useTutorial } from '../../context/TutorialSysytem';
import * as NotificationService from '../../context/NotificationService';
import JoinSchoolModal from '../../components/JoinMySchool';
import ParentEmailCheck from '../../components/ParentModal';
import NeoAlert from '../../components/NeoAlert';
import { updateStatsWidget } from '../../src/utils/widgetHelper';
import useDistrictWindow from '../../src/utils/districtWindow';

// ── Split files ───────────────────────────────────────────────────────────────
import styles from './dashboardStyles';
import SponsorshipBanner from './SponsorshipBanner';
import ProfileModal from './ProfileModal';
import ReportsModal from './ReportsModal';
import PackagesTab from './PackagesTab';
import useDashboard from './useDashboard';
import useMusicPacks from './useMusicPacks';
import useTimetable from './useTimetable';
import Footer from './Footer';

// ─────────────────────────────────────────────────────────────────────────────
const DashboardContent = ({ route, navigation }) => {
  const { start, canStart, stop, isActive, scrollViewRef } = useTutorial();
  const { userData, setUserData } = useUser();
  const { setIsForcedOffline } = useDistrictWindow();
  const [activeScreenTab, setActiveScreenTab] = useState('dashboard');
  const [modalVisible, setModalVisible] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [SchoolmodalVisible, setSchoolModalVisible] = useState(false);
  const [neoAlertConfig, setNeoAlertConfig] = useState({ visible: false, title: '', message: '', buttons: [] });
  const tutorialHasStarted = useRef(false);
  const notificationSetupDone = useRef(false);
  const notificationTimeout = useRef(null);
  // ── Redirect if no user ───────────────────────────────────────────────────
  useEffect(() => {
    if (!userData) {
      const data = route.params?.userData;
      if (data) setUserData(data);
      else navigation.replace('Login');
    }
  }, [userData]);
  const closeAlert = () => {
    setNeoAlertConfig(prev => ({
      ...prev,
      visible: false
    }));
  };
  const checkServerHealthAndConfig = async () => {
    try {
      // 1. Setup a 3-second timeout (Don't let the user wait forever)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // 2. Fetch the static JSON config
      const response = await fetch('https://fsdgroup.com.ng/Edu/app-status.json', {
        signal: controller.signal,
        cache: 'no-store' // Always get the latest
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Server returned an error');

      const config = await response.json();

      if (config.forceOffline) {
        setNeoAlertConfig({
          visible: true,
          title: "Traffic Cop Active 🚦",
          message: config.message || "We are currently hosting a massive test! Switching you to local mode.",
          buttons: [{ text: "Got it", onPress: handleGoOffline }] // ✅ Perfect routing
        });
      }

    } catch (error) {
      console.log("Server health check failed:", error.message);
      triggerOfflinePrompt();
    }
  };

  const triggerOfflinePrompt = () => {
    setNeoAlertConfig({
      visible: true,
      title: "Server Overload ⚠️",
      message: "Our servers are experiencing heavy traffic right now. Would you like to switch to Offline Mode to keep practicing?",
      buttons: [
        { text: "Retry", style: "cancel", onPress: () => checkServerHealthAndConfig() },
        { text: "Go Offline", onPress: () => handleGoOffline() }
      ]
    });
  };

  // Inside your Dashboard component

  const handleGoOffline = () => {
    closeAlert();

    // 1. Manually force the global state to offline
    setIsForcedOffline(true);

    // 2. Move the user to the Subject screen
    // (Ensure 'Subject' matches the name in your Stack Navigator)
    navigation.navigate('Subject');
  };

  useEffect(() => {
    if (!dash.isDistrictWindowActive) {
      checkServerHealthAndConfig();
    }
  }, []);
  // ── Main data hook ────────────────────────────────────────────────────────
  const dash = useDashboard({ userData, setUserData, navigation });

  // ── Music packs hook ──────────────────────────────────────────────────────
  const music = useMusicPacks({ isOnline: dash.isOnline });

  // ── Timetable hook ────────────────────────────────────────────────────────
  const tt = useTimetable({ subjects: dash.subjects });

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    if (userData?.username) dash.fetchDashboardData();
  }, [userData?.username]);

  // ── Fetch music when tab opens ────────────────────────────────────────────
  useEffect(() => {
    if (activeScreenTab === 'packages' && music.musicPacks.length === 0) {
      music.fetchMusicPackages();
    }
  }, [activeScreenTab, music.musicPacks.length]);

  // ── Notifications ─────────────────────────────────────────────────────────
  useEffect(() => {
    const setup = async () => {
      if (!userData || notificationSetupDone.current) return;
      if (notificationTimeout.current) clearTimeout(notificationTimeout.current);
      notificationTimeout.current = setTimeout(async () => {
        const ok = await NotificationService.registerForPushNotifications();
        if (ok) {
          await NotificationService.rescheduleAll(dash.streaks, dash.userStars, dash.subjects);
          notificationSetupDone.current = true;
        }
        await updateStatsWidget(dash.streaks, dash.userStars);
      }, 500);
    };
    setup();
    return () => { if (notificationTimeout.current) clearTimeout(notificationTimeout.current); };
  }, [userData]);

  useEffect(() => {
    if (notificationSetupDone.current) updateStatsWidget(dash.streaks, dash.userStars);
  }, [dash.streaks, dash.userStars]);

  // ── Tutorial ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = async () => {
      if (!isActive && tutorialHasStarted.current) {
        await AsyncStorage.setItem('hasSeenDashboardTutorial', 'true');
        tutorialHasStarted.current = false;
      }
    };
    handle();
  }, [isActive]);

  // ── Section data ──────────────────────────────────────────────────────────
  const sections = useMemo(() => [
    { type: 'info', id: 1, name: 'Profile' },
    { type: 'streaks', id: 2, name: 'Streaks' },
    { type: 'reports', id: 3, name: 'Reports' },
    { type: 'timetable', id: 4, name: 'Timetable' },
    { type: 'leaderboard', id: 5, name: 'Leaderboard' },
    { type: 'subjects', id: 6, name: 'Subjects' },
  ], []);

  if (!userData) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#864AF9" /></View>;
  }

  // ── Section renderers ─────────────────────────────────────────────────────
  const renderSectionContent = (item) => {
    switch (item.type) {

      case "info":
        return (
          <TouchableOpacity
            style={styles.infoContainer}
            onPress={() => setShowProfileModal(true)}
          >
            <View style={styles.leftInfo}>
              <Text style={styles.hello}> Hello </Text>
              <Text style={styles.infoUsername}> {userData?.username}</Text>
            </View>
            <Image
              source={{ uri: userData?.localAvatar || userData?.avatar }}
              style={styles.infoAvatar}
            />
          </TouchableOpacity>
        );

      case 'streaks':
        return (
          <View style={styles.streaksContainer}>
            <Text style={styles.streaksTitle}>Streaks</Text>
            <Text style={styles.streaksCount}>{dash.streaks} 📚</Text>
          </View>
        );

      case 'reports':
        return (
          <View style={styles.reportsContainer}>
            <Text style={styles.title}>Reports</Text>
            {dash.loading ? (
              <ActivityIndicator size="small" color="#864AF9" />
            ) : dash.error ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 30 }}>📶</Text>
                <Text style={{ color: 'red', fontWeight: 'bold', textAlign: 'center', marginTop: 10 }}>{dash.error}</Text>
                <TouchableOpacity onPress={dash.fetchDashboardData} style={{ marginTop: 10, padding: 8, backgroundColor: '#eee', borderRadius: 8 }}>
                  <Text>Tap to Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {dash.reports.slice(0, 2).map((report, i) => (
                  <View key={i} style={styles.reportItem}>
                    <Text style={styles.reportTitle}>{report.exam_name || report.subtopic_name || 'Exam'}</Text>
                    <Text style={styles.reportScore}>Score: {report.Score}%</Text>
                  </View>
                ))}
                {dash.reports.length > 0 && (
                  <TouchableOpacity style={styles.seeMoreButton} onPress={() => setModalVisible(true)}>
                    <Text style={styles.seeMoreButtonText}>See More</Text>
                  </TouchableOpacity>
                )}
                {dash.reports.length === 0 && <Text style={styles.noTimetableData}>No reports yet.</Text>}
              </>
            )}
          </View>
        );

      case 'timetable':
        return (
          <View style={styles.timetableContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.timetableTitle}>Today's Timetable</Text>
              <TouchableOpacity onPress={tt.openTimetableEditor} style={styles.editIconBtn}>
                <Ionicons name="pencil" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {dash.loading ? (
              <ActivityIndicator size="small" color="#864AF9" style={{ marginVertical: 20 }} />
            ) : tt.timetableData.length > 0 ? (
              tt.timetableData.map((it, i) => (
                <View key={i} style={styles.timetableItem}>
                  <View style={styles.timeStrip}>
                    <Text style={styles.subjectTime}>{it.time.split(' ')[0]}</Text>
                    <Text style={styles.subjectAmPm}>{it.time.split(' ')[1]}</Text>
                  </View>
                  <View style={styles.subjectContent}>
                    <Text style={styles.subjectName}>{it.subject}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noTimetableData}>No schedule available</Text>
            )}

            {/* Timetable editor modal */}
            <Modal visible={tt.isEditingTimetable} transparent animationType="fade" onRequestClose={() => tt.setIsEditingTimetable(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Schedule ✏️</Text>
                  <Text style={{ color: '#666', marginBottom: 15, fontSize: 12 }}>Tap the time box to scroll to a time.</Text>
                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                    {tt.tempTimetable.map((it, i) => {
                      const parts = it.time.includes(' - ') ? it.time.split(' - ') : [it.time, '12:00 PM'];
                      return (
                        <View key={i} style={styles.editorRow}>
                          <Text style={styles.rowLabel}>Period {i + 1}</Text>
                          <View style={styles.timeRangeContainer}>
                            <TouchableOpacity style={styles.timeBox} onPress={() => tt.openTimePicker(i, it.time, 'start')}>
                              <Text style={styles.timeLabel}>FROM</Text>
                              <Text style={styles.timeValue}>{parts[0]}</Text>
                            </TouchableOpacity>
                            <Ionicons name="arrow-forward" size={16} color="#bbb" />
                            <TouchableOpacity style={styles.timeBox} onPress={() => tt.openTimePicker(i, it.time, 'end')}>
                              <Text style={styles.timeLabel}>TO</Text>
                              <Text style={styles.timeValue}>{parts[1]}</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.pickerWrapper}>
                            <Picker selectedValue={it.subject} onValueChange={(v) => tt.handleTimetableChange(v, i)} style={styles.picker} dropdownIconColor="#000">
                              <Picker.Item label="Free Period" value="Free Period" color="#999" />
                              {dash.subjects.map((sub, si) => <Picker.Item key={si} label={sub.Subject} value={sub.Subject} color="#000" />)}
                            </Picker>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {tt.showTimePicker && (
                    <DateTimePicker testID="dateTimePicker" value={tt.pickerDate} mode="time" is24Hour={false} display="spinner" onChange={tt.onTimeChange} />
                  )}
                  {Platform.OS === 'ios' && tt.showTimePicker && (
                    <TouchableOpacity style={styles.closePickerBtn} onPress={() => tt.setShowTimePicker(false)}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={tt.resetTimetable}>
                      <Text style={styles.resetBtnText}>RESET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={tt.saveTimetable}>
                      <Text style={styles.saveBtnText}>SAVE</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.closeModalBtn} onPress={() => tt.setIsEditingTimetable(false)}>
                    <Text style={styles.closeModalText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );

      case 'leaderboard':
        return (
          <View style={styles.leaderboardContainer}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            {dash.leaderboard.length > 0 ? (
              dash.leaderboard.map((entry, i) => (
                <View key={i} style={styles.leaderboardItem}>
                  <Text style={styles.leaderboardRank}>{entry.real_rank}</Text>
                  <Text style={styles.leaderboardName}>{entry.username === userData?.username ? 'You' : entry.username}</Text>
                  <Text style={styles.leaderboardScore}>{entry.stars} ⭐</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noLeaderboardData}>No data available</Text>
            )}
          </View>
        );

      case 'subjects':
        return (
          <View style={styles.subjectsContainer}>
            <Text style={styles.subjectsTitle}>Explore Subjects</Text>
            <Text style={styles.subjectsDescription}>Dive into your courses and learn at your pace!</Text>
            <TouchableOpacity style={styles.subjectsButton} onPress={() => navigation.navigate('Subject')}>
              <Text style={styles.subjectsButtonText}>View All Subjects</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.subjectsButton, { marginTop: 16 }]} onPress={() => setSchoolModalVisible(true)}>
              <Text style={styles.subjectsButtonText}>Join My School</Text>
            </TouchableOpacity>
          </View>
        );

      default: return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.mainWrapper}>
      {/* Top tabs */}
      <View style={styles.topTabContainer}>
        {['dashboard', 'packages'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.topTab, activeScreenTab === tab && styles.activeTopTab]} onPress={() => setActiveScreenTab(tab)}>
            <Text style={[styles.topTabText, activeScreenTab === tab && styles.activeTopTabText]}>
              {tab === 'dashboard' ? 'Dashboard' : 'Packages 📦'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeScreenTab === 'dashboard' ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={dash.fetchRefreshedUser} tintColor="#864AF9" colors={['#864AF9']} />}
        >
          <SponsorshipBanner sponsorship={dash.sponsorship} />
          {sections.map(section => (
            <TutorialStep key={section.type} stepId={section.id}>
              {renderSectionContent(section)}
            </TutorialStep>
          ))}
          <Footer />
        </ScrollView>
      ) : (
        <PackagesTab
          musicPacks={music.musicPacks}
          loadingPackages={music.loadingPackages}
          downloadingPackId={music.downloadingPackId}
          downloadStatus={music.downloadStatus}
          downloadedPacks={music.downloadedPacks}
          partialStatus={music.partialStatus}
          fetchMusicPackages={music.fetchMusicPackages}
          downloadPack={music.downloadPack}
          promptDelete={music.promptDelete}
        />
      )}

      {/* Profile modal */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userData={userData}
        availableClasses={dash.availableClasses}
        navigation={navigation}
        isUploadingImage={dash.isUploadingImage}
        uploadProgress={dash.uploadProgress}
        pickImage={dash.pickImage}
        tempFullName={dash.tempFullName} setTempFullName={dash.setTempFullName}
        isEditingName={dash.isEditingName} toggleEditName={dash.toggleEditName}
        tempUsername={dash.tempUsername} setTempUsername={dash.setTempUsername}
        isEditingUsername={dash.isEditingUsername} setIsEditingUsername={dash.setIsEditingUsername} saveUsername={dash.saveUsername}
        tempEmail={dash.tempEmail} setTempEmail={dash.setTempEmail}
        isEditingEmail={dash.isEditingEmail} setIsEditingEmail={dash.setIsEditingEmail} saveEmail={dash.saveEmail}
        tempPhone={dash.tempPhone} setTempPhone={dash.setTempPhone}
        isEditingPhone={dash.isEditingPhone} setIsEditingPhone={dash.setIsEditingPhone} savePhone={dash.savePhone}
        tempClass={dash.tempClass} setTempClass={dash.setTempClass}
        isEditingClass={dash.isEditingClass} setIsEditingClass={dash.setIsEditingClass} saveClass={dash.saveClass}
        handleLogout={dash.handleLogout}
      />

      {/* Reports modal */}
      <ReportsModal visible={modalVisible} onClose={() => setModalVisible(false)} reports={dash.reports} />

      {/* Delete pack modal */}
      <Modal visible={music.deleteModalVisible} transparent animationType="fade" onRequestClose={music.cancelDelete}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.trashIconContainer}><Text style={{ fontSize: 40 }}>🗑️</Text></View>
            <Text style={styles.modalTitle}>Delete Sound Pack?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove{' '}
              <Text style={{ fontWeight: 'bold', color: '#000' }}>"{music.packToDelete?.title}"</Text>?{'\n'}You can download it again later.
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={music.cancelDelete}>
                <Text style={styles.modalBtnTextBlack}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnDestructive]} onPress={music.performDelete}>
                <Text style={styles.modalBtnTextRed}>YES, DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <JoinSchoolModal isVisible={SchoolmodalVisible} onClose={() => setSchoolModalVisible(false)} onJoinSuccess={() => { }} />
      <ParentEmailCheck />
      <NeoAlert
        visible={neoAlertConfig.visible}
        title={neoAlertConfig.title}
        message={neoAlertConfig.message}
        buttons={neoAlertConfig.buttons}
        onClose={() => setNeoAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const DashboardScreen = (props) => {
  const tutorialSteps = [
    { id: 1, text: "This is your profile section. Tap here to view and edit your details!", name: "Profile" },
    { id: 2, text: "Keep your learning streak alive! Practice daily to grow this number.", name: "Streaks" },
    { id: 3, text: "Track your progress here. See how well you performed in recent exams.", name: "Reports" },
    { id: 4, text: "Check your daily schedule here so you never miss a class.", name: "Timetable" },
    { id: 5, text: "See where you stand! Compete with classmates for the top spot.", name: "Leaderboard" },
    { id: 6, text: "Ready to start learning? Tap here to pick a subject and take a quiz.", name: "Subjects" },
  ];
  return (
    <TutorialProvider steps={tutorialSteps}>
      <DashboardContent {...props} />
    </TutorialProvider>
  );
};

export default DashboardScreen;
