import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DeleteAccountComponent({ navigation }) {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const arrowBounce1 = useRef(new Animated.Value(0)).current;
  const arrowBounce2 = useRef(new Animated.Value(0)).current;
  const arrowBounce3 = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Staggered arrow bounce animations
    const createArrowAnimation = (animValue, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: -10,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createArrowAnimation(arrowBounce1, 0).start();
    createArrowAnimation(arrowBounce2, 200).start();
    createArrowAnimation(arrowBounce3, 400).start();
  }, []);

  const partialOptions = [
    { label: "Address", value: "address" },
    { label: "Phone Number", value: "phoneNumber" },
    { label: "Parent Name", value: "parentName" },
    { label: "Parent Contact", value: "parentContact" },
    { label: "Profile Picture", value: "thumbnail" },
    { label: "Full Name", value: "fullName" }
  ];

  const toggleField = (value) => {
    if (selectedFields.includes(value)) {
      setSelectedFields(selectedFields.filter(f => f !== value));
    } else {
      setSelectedFields([...selectedFields, value]);
    }
  };

  const executeDelete = async () => {
    if (!deleteType) {
      Alert.alert("Error", "Please select a deletion option.");
      return;
    }

    if (deleteType === 'partial' && selectedFields.length === 0) {
      Alert.alert("Error", "Please select at least one field to remove.");
      return;
    }

    const safetyMsg = deleteType === "full"
      ? "Are you absolutely sure? Your account will be gone forever."
      : "Are you sure you want to wipe this data?";

    Alert.alert("Confirm Deletion", safetyMsg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Proceed",
        style: "destructive",
        onPress: () => submitToAPI()
      }
    ]);
  };

  const submitToAPI = async () => {
    setIsProcessing(true);

    try {
      const userStr = await AsyncStorage.getItem("userData");
      const rawToken = await AsyncStorage.getItem("token");

      if (!userStr || !rawToken) {
        Alert.alert("Auth Error", "Could not find your login session.");
        setIsProcessing(false);
        return;
      }

      const user = JSON.parse(userStr);
      const cleanToken = rawToken.replace(/"/g, '');
      const USER_EMAIL_OR_ID = user.email;

      const payload = { action: deleteType };
      if (deleteType === "partial") {
        payload.fields = selectedFields;
      }

      const API_ENDPOINT = `https://homeedu.fsdgroup.com.ng/api/delete-student/${USER_EMAIL_OR_ID}`;

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${cleanToken}`
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("Success", result.message || "Action completed successfully.");
        setDeleteModalVisible(false);

        if (deleteType === "full") {
          await AsyncStorage.removeItem("userData");
          await AsyncStorage.removeItem("token");
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else {
          await AsyncStorage.removeItem("userData");
          await AsyncStorage.removeItem("token");
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      } else {
        Alert.alert("Error", result.message || "Failed to process request.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Network Error", "Could not connect to the server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      {/* Animated Delete Account Button */}
      <View style={styles.deleteSection}>
        {/* Top Arrow */}
        <Animated.View 
          style={[
            styles.arrowContainer, 
            styles.topArrow,
            { transform: [{ translateY: arrowBounce1 }] }
          ]}
        >
          <Ionicons name="arrow-down" size={28} color="#EF4444" />
          <Text style={styles.arrowText}>Tap Here</Text>
        </Animated.View>

        {/* Glow Effect */}
        <Animated.View 
          style={[
            styles.glowCircle,
            { opacity: glowOpacity }
          ]} 
        />

        {/* Main Button */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            style={styles.deleteButton}
            onPress={() => {
              setDeleteType(null);
              setSelectedFields([]);
              setDeleteModalVisible(true);
            }}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="warning" size={24} color="white" style={styles.warningIcon} />
              <View>
                <Text style={styles.deleteButtonTitle}>Delete Account</Text>
                <Text style={styles.deleteButtonSubtitle}>⚠️ Permanent Action</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Side Arrows */}
        <Animated.View 
          style={[
            styles.arrowContainer, 
            styles.leftArrow,
            { transform: [{ translateX: arrowBounce2 }] }
          ]}
        >
          <Ionicons name="arrow-forward" size={24} color="#DC2626" />
        </Animated.View>

        <Animated.View 
          style={[
            styles.arrowContainer, 
            styles.rightArrow,
            { transform: [{ translateX: Animated.multiply(arrowBounce3, -1) }] }
          ]}
        >
          <Ionicons name="arrow-back" size={24} color="#DC2626" />
        </Animated.View>

        {/* Warning Text */}
        <Text style={styles.warningText}>
          ⚠️ This action cannot be undone
        </Text>
      </View>

      {/* Modal */}
      <Modal visible={deleteModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Account Data Settings</Text>

            {/* Full Delete Option */}
            <TouchableOpacity
              onPress={() => setDeleteType('full')}
              style={[
                styles.optionCard,
                deleteType === 'full' && styles.optionCardSelectedFull
              ]}
            >
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  deleteType === 'full' && styles.optionTitleSelectedFull
                ]}>
                  Delete Account Permanently
                </Text>
                <Text style={styles.optionDescription}>
                  Removes account, login access, and all history.
                </Text>
              </View>
              {deleteType === 'full' && (
                <Ionicons name="checkmark-circle" size={24} color="#EF4444" />
              )}
            </TouchableOpacity>

            {/* Partial Delete Option */}
            <TouchableOpacity
              onPress={() => setDeleteType('partial')}
              style={[
                styles.optionCard,
                deleteType === 'partial' && styles.optionCardSelectedPartial
              ]}
            >
              <View style={styles.optionTextContainer}>
                <Text style={[
                  styles.optionTitle,
                  deleteType === 'partial' && styles.optionTitleSelectedPartial
                ]}>
                  Remove Specific Profile Data
                </Text>
                <Text style={styles.optionDescription}>
                  Keep account, but clear personal details.
                </Text>
              </View>
              {deleteType === 'partial' && (
                <Ionicons name="checkmark-circle" size={24} color="#864AF9" />
              )}
            </TouchableOpacity>

            {/* Partial Options Checkboxes */}
            {deleteType === 'partial' && (
              <View style={styles.checkboxContainer}>
                <Text style={styles.checkboxTitle}>Select data to wipe:</Text>
                <View style={styles.checkboxGrid}>
                  {partialOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => toggleField(opt.value)}
                      style={[
                        styles.checkboxItem,
                        selectedFields.includes(opt.value) && styles.checkboxItemSelected
                      ]}
                    >
                      <Ionicons
                        name={selectedFields.includes(opt.value) ? "checkbox" : "square-outline"}
                        size={20}
                        color={selectedFields.includes(opt.value) ? "#864AF9" : "#9CA3AF"}
                        style={styles.checkboxIcon}
                      />
                      <Text style={styles.checkboxLabel}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                disabled={isProcessing}
                onPress={() => setDeleteModalVisible(false)}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={isProcessing}
                onPress={executeDelete}
                style={[styles.button, styles.actionButton]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    {deleteType === 'partial' ? 'Remove Selected' : 'Delete Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  deleteSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 24,
    position: 'relative',
    paddingVertical: 40,
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FEE2E2',
    top: '50%',
    left: '50%',
    marginLeft: -100,
    marginTop: -100,
    zIndex: 0,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: 280,
    elevation: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: '#B91C1C',
    zIndex: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIcon: {
    marginRight: 12,
  },
  deleteButtonTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  deleteButtonSubtitle: {
    color: '#FEE2E2',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  arrowContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 2,
  },
  topArrow: {
    top: -10,
  },
  leftArrow: {
    left: 20,
    top: '50%',
    marginTop: -12,
  },
  rightArrow: {
    right: 20,
    top: '50%',
    marginTop: -12,
  },
  arrowText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  warningText: {
    marginTop: 16,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  optionCardSelectedFull: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionCardSelectedPartial: {
    borderColor: '#864AF9',
    backgroundColor: '#F3E8FF',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#374151',
  },
  optionTitleSelectedFull: {
    color: '#EF4444',
  },
  optionTitleSelectedPartial: {
    color: '#864AF9',
  },
  optionDescription: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  checkboxContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  checkboxTitle: {
    fontWeight: 'bold',
    color: '#864AF9',
    marginBottom: 12,
    fontSize: 14,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  checkboxItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  checkboxItemSelected: {
    backgroundColor: '#F3E8FF',
  },
  checkboxIcon: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  cancelButtonText: {
    fontWeight: 'bold',
    color: '#4B5563',
    fontSize: 15,
  },
  actionButton: {
    backgroundColor: '#EF4444',
    marginLeft: 8,
  },
  actionButtonText: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 15,
  },
});