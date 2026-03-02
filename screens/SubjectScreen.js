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
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SubjectScreen = ({ navigation }) => {
  const [subjects, setSubjects] = useState([]);
  const [schoolWork, setSchoolWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { userData } = useUser();

  useEffect(() => {
    const fetchData = async () => {
      console.log("🚀 Fetching data for Class:", userData.class);

      try {
        const token = await AsyncStorage.getItem('token');
        console.log("🔑 Token retrieved:", token ? "Exists" : "MISSING");

        const subjectsPromise = axios.post(
          'https://homeedu.fsdgroup.com.ng/api/subjects',
          { class: userData.class }
        );

        const schoolWorkPromise = axios.get(
          'https://homeedu.fsdgroup.com.ng/api/student/school-work',
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const [subjectsRes, workRes] = await Promise.allSettled([
          subjectsPromise,
          schoolWorkPromise
        ]);

        if (subjectsRes.status === 'fulfilled') {
          console.log("✅ Subjects Loaded:", subjectsRes.value.data.data.length, "items");
        } else {
          console.error("❌ Subjects Failed:", subjectsRes.reason.response?.data || subjectsRes.reason.message);
        }

        if (workRes.status === 'fulfilled') {
          console.log("✅ School Work API Result:", workRes.value.data);
          if (workRes.value.data.status === 200) {
            setSchoolWork(workRes.value.data.data);
          }
        } else {
          console.warn("⚠️ School Work Status:", workRes.reason.response?.status);
          console.warn("⚠️ School Work Message:", workRes.reason.response?.data?.message);
        }

        if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data.status === 200) {
          setSubjects(subjectsRes.value.data.data);
        } else {
          setError('Failed to load general subjects.');
        }

      } catch (err) {
        console.error("🔥 Global Fetch Error:", err);
        setError('An error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData.class]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // ── Split School Work into Districts vs Regular ──────────────────────────
  const districtMocks = schoolWork.filter(item => item.district_id !== null);
  const schoolAssignments = schoolWork.filter(item => item.district_id === null);

  // ── Navigation Handlers ──────────────────────────────────────────────────
  const handleButtonPress = () => {
    console.log("Navigating to Exam with params:", {
      type: 'classExam',
      class: userData.class,
    });
    if (userData.class === "JAMB") {
      navigation.navigate('Exam', {
        type: 'JAMB',
        subject: null,
        topic: null,
        subtopic: null,
        userClass: userData.class,
      });
    } else {
      navigation.navigate('Exam', {
        type: 'classExam',
        subject: null,
        topic: null,
        subtopic: null,
        userClass: userData.class,
      });
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
      openDate: work.open_date,
      closeDate: work.close_date,
      availability: work.availability,
    });
  };

  // ── Renderers ────────────────────────────────────────────────────────────
  const renderWorkCard = (item, isDistrict) => (
    <TouchableOpacity
      style={[styles.workCard, isDistrict && styles.districtCardBorder]}
      onPress={() => startSchoolWork(item)}
      activeOpacity={0.8}
    >
      <View style={styles.workHeader}>
        <Text
          style={[styles.workSubject, isDistrict && { color: '#C2410C' }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {isDistrict ? 'District Mock' : item.subject}
        </Text>
        <View style={[
          styles.statusBadge,
          item.availability === 'upcoming' ? styles.statusUpcoming :
            item.availability === 'closed' ? styles.statusClosed : styles.statusOpen
        ]}>
          <Text style={[
            styles.statusText,
            item.availability === 'upcoming' ? { color: '#D97706' } :
              item.availability === 'closed' ? { color: '#64748B' } : { color: '#065F46' }
          ]}>
            {item.availability === 'open' ? 'Active' : item.availability}
          </Text>
        </View>
      </View>

      <Text style={styles.workTitle} numberOfLines={2} ellipsizeMode="tail">
        {item.title}
      </Text>

      <View style={styles.workMetaRow}>
        <Ionicons
          name={isDistrict ? 'ribbon-outline' : 'time-outline'}
          size={14}
          color={isDistrict ? '#C2410C' : '#64748B'}
        />
        <Text style={[styles.workMetaText, isDistrict && { color: '#C2410C' }]}>
          {isDistrict ? `${item.duration_minutes} Mins` : `${item.duration_minutes} Mins`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSubject = ({ item }) => (
    <TouchableOpacity
      style={styles.subjectItem}
      onPress={() =>
        navigation.navigate('Topic', {
          subjectId: item.SubjectId,
          userClass: userData.class,
          subject: item.Subject,
        })
      }
    >
      <View style={styles.subCont}>
        <Image
          source={
            item.Icon
              ? { uri: item.Icon }
              : require('../assets/education.png')
          }
          style={styles.subImg}
        />
        <Text style={styles.subjectText} numberOfLines={2} ellipsizeMode="tail">
          {item.Subject}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* ── Header Row ── */}
            <View style={styles.headerRow}>
              <Text style={styles.subjectSelectionTitleWithButton} numberOfLines={1} ellipsizeMode="tail">
                {userData.class}
              </Text>
              <TouchableOpacity style={styles.headerButton} onPress={handleButtonPress}>
                <Text style={styles.headerButtonText}>Take Free Exam</Text>
              </TouchableOpacity>
            </View>

            {/* ── District Mocks Section ── */}
            {districtMocks.length > 0 && (
              <View style={styles.schoolWorkSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, styles.districtSectionTitle]}>
                    🏛️ District Standardized Mocks
                  </Text>
                  <View style={styles.officialBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#C2410C" />
                    <Text style={styles.officialBadgeText}>OFFICIAL</Text>
                  </View>
                </View>
                <FlatList
                  data={districtMocks}
                  keyExtractor={(item) => item.subtopicId}
                  renderItem={({ item }) => renderWorkCard(item, true)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.workList}
                />
              </View>
            )}

            {/* ── School Assignments Section ── */}
            {schoolAssignments.length > 0 && (
              <View style={styles.schoolWorkSection}>
                <Text style={styles.sectionTitle}>🏫 School Assignments</Text>
                <FlatList
                  data={schoolAssignments}
                  keyExtractor={(item) => item.subtopicId}
                  renderItem={({ item }) => renderWorkCard(item, false)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.workList}
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginBottom: 16, marginTop: 4 }]}>
              📚 General Subjects
            </Text>
          </>
        }
        data={subjects}
        keyExtractor={(item) => item.SubjectId.toString()}
        renderItem={renderSubject}
        numColumns={2}
        columnWrapperStyle={styles.subjectListWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FE',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  subjectSelectionTitleWithButton: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    flex: 1,
    marginRight: 12,
  },
  headerButton: {
    backgroundColor: '#864AF9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#864AF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── Section Titles ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  districtSectionTitle: {
    color: '#C2410C',
    marginBottom: 0,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 12,
  },
  officialBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#C2410C',
    letterSpacing: 1,
  },

  // ── School Work Cards ────────────────────────────────────────────────────
  schoolWorkSection: {
    marginBottom: 24,
  },
  workList: {
    paddingBottom: 10,
    paddingRight: 16,
  },
  workCard: {
    backgroundColor: '#FFFFFF',
    width: width * 0.65,
    padding: 16,
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 120,
  },
  districtCardBorder: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
  },
  workHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  workSubject: {
    fontSize: 12,
    fontWeight: '800',
    color: '#864AF9',
    textTransform: 'uppercase',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    flexShrink: 0,
  },
  statusOpen: { backgroundColor: '#DEF7EC' },
  statusClosed: { backgroundColor: '#F1F5F9' },
  statusUpcoming: { backgroundColor: '#FEF3C7' },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  workTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    lineHeight: 21,
  },
  workMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    gap: 4,
  },
  workMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── General Subject Grid ─────────────────────────────────────────────────
  subjectListWrapper: {
    justifyContent: 'space-between',
  },
  subjectItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: (width - 48) / 2,
    height: 160,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(134, 74, 249, 0.1)',
  },
  subCont: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  subImg: {
    width: 50,
    height: 50,
    marginBottom: 12,
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
  },
});

export default SubjectScreen;