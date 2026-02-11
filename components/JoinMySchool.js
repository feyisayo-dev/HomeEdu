import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput,
  StyleSheet, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Ensure @expo/vector-icons is installed

const JoinSchoolModal = ({ isVisible, onClose, onJoinSuccess }) => {
  const [step, setStep] = useState(1); // 1: Code, 2: Details
  const [loading, setLoading] = useState(false);

  // Data
  const [schoolCode, setSchoolCode] = useState('');
  const [schoolData, setSchoolData] = useState(null); // Holds school info & classes
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  // --- API: VERIFY SCHOOL CODE ---
  const verifySchoolCode = async () => {
    if (!schoolCode) return Alert.alert("Error", "Enter a code");

    setLoading(true);
    try {
      // This endpoint should return the School ID and list of Classes available
      const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/verify-school/${schoolCode}`);
      const data = await response.json();

      if (response.ok) {
        console.log("School Data:", data);
        setSchoolData(data.data); // { id: "uuid", name: "Best Brains", classes: ["JSS 1", "JSS 2"] }
        setStep(2); // Move to next step
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
      // Fetch teachers for this school + class, get unique subjects
      const response = await fetch(`https://homeedu.fsdgroup.com.ng/api/get-class-subjects?school_code=${schoolCode}&class=${className}`);
      const data = await response.json();

      // Expecting data.subjects = ["Mathematics", "Physics", "English"]
      if (response.ok) {
        setAvailableSubjects(data.subjects);
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
  const submitJoin = async () => {
    if (!selectedClass || selectedSubjects.length === 0) {
      return Alert.alert("Incomplete", "Please select a class and at least one subject.");
    }

    setLoading(true);
    try {
      const response = await fetch('https://homeedu.fsdgroup.com.ng/api/join-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization Bearer token here
        },
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: selectedClass,
          subjects: selectedSubjects
        })
      });

      if (response.ok) {
        Alert.alert("Success", `You have joined ${schoolData.name}!`);
        onJoinSuccess();
        onClose();
      } else {
        Alert.alert("Failed", "Could not join school.");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Join My School 🏫</Text>
            <TouchableOpacity onPress={onClose}>
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
                data={schoolData?.classes || []} // e.g. ["JSS 1", "JSS 2"]
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

              {/* Subject Selection (Only shows after class selected) */}
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
                      ListEmptyComponent={<Text style={{ color: '#999', fontStyle: 'italic' }}>No teachers found for this class yet.</Text>}
                    />
                  )}

                  <TouchableOpacity style={[styles.btnPrimary, { marginTop: 20 }]} onPress={submitJoin}>
                    <Text style={styles.btnText}>Complete Registration</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
};

// --- STYLES (Neo-Brutalist Lite) ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end', // Bottom Sheet style
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
  btnText: {
    color: 'white',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  // Chip Styles (Class)
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
    backgroundColor: '#00E676', // Mint green
  },
  chipText: {
    fontWeight: '700',
    color: 'black',
  },
  chipTextActive: {
    color: 'black',
  },
  // Subject Grid Styles
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
});

export default JoinSchoolModal;