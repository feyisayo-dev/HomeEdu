import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  StyleSheet, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JoinSchoolModal = ({ isVisible, onClose, onJoinSuccess }) => {
  const [step, setStep] = useState(1); // 1: Code, 2: Details, 3: Conflict
  const [loading, setLoading] = useState(false);

  // Data
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolData, setSchoolData] = useState(null); 
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  
  // Conflict Data
  const [conflictMessage, setConflictMessage] = useState('');

  // --- API: VERIFY SCHOOL CODE ---
  const verifySchoolCode = async () => {
    if (!schoolCode) return Alert.alert("Error", "Enter a code");

    setLoading(true);
    try {
      const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/verify-school/${schoolCode}`);
      const data = await response.json();

      if (response.ok && data.status === 200) {
        setSchoolData(data.data);
        setStep(2); 
      } else {
        Alert.alert("Invalid Code", "School not found.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Could not verify school.");
    } finally {
      setLoading(false);
    }
  };

  // --- API: FETCH SUBJECTS FOR CLASS ---
  const handleClassSelect = async (className) => {
    setSelectedClass(className);
    setLoading(true);

    try {
      const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/get-class-subjects?school_code=${schoolCode}&class=${className}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: TOGGLE SUBJECT ---
  const toggleSubject = (subject) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  // --- FINAL: JOIN SCHOOL ---
  const submitJoin = async (forceJoin = false) => {
    if (!selectedClass || selectedSubjects.length === 0) {
      return Alert.alert("Incomplete", "Please select a class and at least one subject.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert("Error", "You are not logged in.");
        setLoading(false);
        return;
      }

      const response = await fetch('https://homeedu.fsdgroup.com.ng/api/join-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: selectedClass,
          subjects: selectedSubjects,
          confirm_leave: forceJoin
        })
      });

      const responseData = await response.json();

      if (response.ok && responseData.status === 200) {
        // SUCCESS
        Alert.alert("Success", responseData.message || `You have joined ${schoolData.name}!`);
        onJoinSuccess();
        handleClose(); // Reset state and close
      } 
      // --- HANDLE EXISTING SCHOOL CONFLICT WITH CUSTOM UI ---
      else if (response.status === 409 && responseData.requires_confirmation) {
        setLoading(false);
        setConflictMessage(responseData.message);
        setStep(3); // Move to Custom Conflict UI
      } 
      else {
        if (response.status === 401) {
          Alert.alert("Session Expired", "Please login again.");
        } else {
          Alert.alert("Failed", responseData.message || "Could not join school.");
        }
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      if (loading && step !== 3) {
        setLoading(false);
      }
    }
  };

  // Reset modal state when closing
  const handleClose = () => {
    setStep(1);
    setSchoolCode('');
    setSelectedClass(null);
    setSelectedSubjects([]);
    setConflictMessage('');
    onClose();
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
                {step === 3 ? "Action Required ⚠️" : "Join My School 🏫"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          {/* STEP 1: ENTER CODE */}
          {step === 1 && (
            <View>
              <Text style={styles.label}>Enter School Code</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SCH-8821"
                placeholderTextColor="#999"
                value={schoolCode}
                onChangeText={setSchoolCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.btnPrimary} onPress={verifySchoolCode} disabled={loading}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Find School</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: DETAILS */}
          {step === 2 && (
            <View style={{ maxHeight: 500 }}>
              <Text style={styles.subTitle}>Joining: <Text style={{ color: '#864AF9' }}>{schoolData?.name}</Text></Text>

              {/* Class Selection */}
              <Text style={styles.label}>Select Your Class</Text>
              <FlatList
                data={schoolData?.available_classes || []}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, selectedClass === item && styles.chipActive]}
                    onPress={() => handleClassSelect(item)}
                  >
                    <Text style={[styles.chipText, selectedClass === item && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={{ marginBottom: 20 }}
              />

              {/* Subject Selection */}
              {selectedClass && (
                <>
                  <Text style={styles.label}>Select Subjects ({selectedSubjects.length})</Text>
                  {loading ? <ActivityIndicator color="#864AF9" /> : (
                    <FlatList
                      data={availableSubjects}
                      numColumns={2}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.subjectItem, selectedSubjects.includes(item) && styles.subjectActive]}
                          onPress={() => toggleSubject(item)}
                        >
                          <Text style={selectedSubjects.includes(item) ? styles.chipTextActive : styles.chipText}>
                            {item}
                          </Text>
                          {selectedSubjects.includes(item) && <Ionicons name="checkmark-circle" size={16} color="white" />}
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={<Text style={{ color: '#999', fontStyle: 'italic' }}>No subjects found for this class.</Text>}
                    />
                  )}

                  <TouchableOpacity style={[styles.btnPrimary, { marginTop: 20 }]} onPress={() => submitJoin(false)}>
                    <Text style={styles.btnText}>Complete Registration</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* STEP 3: CONFLICT UI (Already in a school) */}
          {step === 3 && (
            <View style={styles.conflictContainer}>
              <View style={styles.warningIconWrapper}>
                <Ionicons name="warning" size={40} color="#000" />
              </View>
              
              <Text style={styles.conflictMessage}>{conflictMessage}</Text>
              
              <Text style={styles.conflictSubText}>
                Leaving your current school will disconnect you from its classes and assignments.
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.btnSecondary} 
                  onPress={handleClose}
                >
                  <Text style={[styles.btnText, {color: 'black'}]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.btnDestructive} 
                  onPress={() => {
                    setStep(2); // Optionally go back to step 2 while loading
                    submitJoin(true); // Force join
                  }}
                >
                  <Text style={styles.btnText}>Leave & Join New</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

// --- STYLES (Neo-Brutalist) ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', 
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    borderWidth: 3,
    borderColor: 'black',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: 'black',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    backgroundColor: '#F8F9FE',
  },
  
  // Buttons
  btnPrimary: {
    backgroundColor: '#864AF9',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black',
    shadowColor: 'black',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black',
    shadowColor: 'black',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginRight: 10,
  },
  btnDestructive: {
    flex: 1.5,
    backgroundColor: '#EF4444', // Red
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'black',
    shadowColor: 'black',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  btnText: {
    color: 'white',
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  // Chips & Grid
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 30,
    marginRight: 10,
    backgroundColor: 'white',
  },
  chipActive: {
    backgroundColor: '#00E676', 
  },
  chipText: {
    fontWeight: '700',
    color: 'black',
  },
  chipTextActive: {
    color: 'black',
  },
  subjectItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 5,
    padding: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  subjectActive: {
    backgroundColor: '#864AF9',
    borderColor: 'black',
  },

  // Conflict UI Styles
  conflictContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  warningIconWrapper: {
    backgroundColor: '#FDE68A',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'black',
    marginBottom: 20,
    shadowColor: 'black',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  conflictMessage: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: 'black',
    marginBottom: 10,
  },
  conflictSubText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  }
});

export default JoinSchoolModal;