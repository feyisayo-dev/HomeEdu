import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ParentEmailCheck = () => {
    const navigation = useNavigation();

    // State for Parent Email Modal
    const [isOpen, setIsOpen] = useState(false);
    const [parentMail, setParentMail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // State for Session Expiry Modal
    const [isSessionExpired, setIsSessionExpired] = useState(false);

    // State for Custom Alert Modal
    const [alertModal, setAlertModal] = useState({
        visible: false,
        type: 'success', // 'success' or 'error'
        title: '',
        message: ''
    });

    // ✅ 1. THE CHECK
    useEffect(() => {
        const checkStatus = async () => {
            try {
                // A. Get Token
                const token = await AsyncStorage.getItem('token');

                // If no token, force login immediately
                if (!token) {
                    setIsSessionExpired(true);
                    setIsLoading(false);
                    return;
                }

                // B. Call API with Token
                const response = await fetch('https://homeedu.fsdgroup.com.ng/api/student/check-parent-email', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                });

                // C. Handle Unauthenticated (401)
                if (response.status === 401) {
                    setIsSessionExpired(true);
                    setIsLoading(false);
                    return;
                }

                const data = await response.json();
                console.log("Check Data:", data);

                if (response.ok && data.has_parent_email === false) {
                    setIsOpen(true);
                }

            } catch (error) {
                console.error("Check failed", error);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus();
    }, []);

    // ✅ 2. CUSTOM ALERT FUNCTION
    const showAlert = (type, title, message) => {
        setAlertModal({
            visible: true,
            type,
            title,
            message
        });
    };

    const closeAlert = () => {
        setAlertModal({
            ...alertModal,
            visible: false
        });
        
        // If success, close parent email modal too
        if (alertModal.type === 'success') {
            setIsOpen(false);
        }
    };

    // ✅ 3. THE SAVE
    const handleSubmit = async () => {
        // Validate email
        if (!parentMail.trim()) {
            showAlert('error', 'Email Required', 'Please enter your parent\'s email address.');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(parentMail)) {
            showAlert('error', 'Invalid Email', 'Please enter a valid email address.');
            return;
        }

        setIsSaving(true);
        try {
            const token = await AsyncStorage.getItem('token');

            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/student/update-parent-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ parent_email: parentMail })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('success', 'Email Saved!', 'Your parent will now receive weekly progress reports.');
            } else {
                showAlert('error', 'Save Failed', data.message || 'Could not save email. Please try again.');
            }
        } catch (error) {
            showAlert('error', 'Network Error', 'Unable to connect to server. Please check your internet connection.');
        } finally {
            setIsSaving(false);
        }
    };

    // ✅ 4. REDIRECT FUNCTION
    const handleLogout = async () => {
        // Clear stored data
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userData');

        // Close modal
        setIsSessionExpired(false);

        // Reset navigation to Login screen
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    if (isLoading) return null;

    return (
        <>
            {/* --- MODAL 1: PARENT EMAIL INPUT --- */}
            <Modal transparent={true} visible={isOpen} animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        {/* Icon Circle */}
                        <View style={styles.iconCircle}>
                            <Text style={styles.iconEmoji}>📧</Text>
                        </View>

                        <Text style={styles.modalTitle}>Parent Email Required</Text>
                        
                        <Text style={styles.modalMessage}>
                            Please provide your parent's email address to receive weekly progress reports and stay updated on your academic journey.
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="parent@example.com"
                            placeholderTextColor="#aaa"
                            value={parentMail}
                            onChangeText={setParentMail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isSaving}
                        />

                        <TouchableOpacity
                            style={[styles.primaryBtn, isSaving && styles.btnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Save Email</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL 2: SESSION EXPIRED --- */}
            <Modal transparent={true} visible={isSessionExpired} animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        {/* Icon Circle */}
                        <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                            <Text style={styles.iconEmoji}>🔒</Text>
                        </View>

                        <Text style={styles.modalTitle}>Session Expired</Text>
                        
                        <Text style={styles.modalMessage}>
                            Your session has timed out or you are not logged in. Please log in again to continue using HomeEdu.
                        </Text>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: '#DC2626' }]}
                            onPress={handleLogout}
                        >
                            <Text style={styles.primaryBtnText}>Go to Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* --- MODAL 3: CUSTOM ALERT (SUCCESS/ERROR) --- */}
            <Modal transparent={true} visible={alertModal.visible} animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        {/* Dynamic Icon Circle based on type */}
                        <View style={[
                            styles.iconCircle,
                            alertModal.type === 'success' 
                                ? { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }
                                : { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }
                        ]}>
                            <Text style={styles.iconEmoji}>
                                {alertModal.type === 'success' ? '✅' : '❌'}
                            </Text>
                        </View>

                        <Text style={[
                            styles.modalTitle,
                            alertModal.type === 'error' && { color: '#DC2626' }
                        ]}>
                            {alertModal.title}
                        </Text>
                        
                        <Text style={styles.modalMessage}>
                            {alertModal.message}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                alertModal.type === 'success' 
                                    ? { backgroundColor: '#10B981' }
                                    : { backgroundColor: '#DC2626' }
                            ]}
                            onPress={closeAlert}
                        >
                            <Text style={styles.primaryBtnText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
    iconEmoji: {
        fontSize: 40,
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
        marginBottom: 25,
        lineHeight: 24,
        fontFamily: 'latto',
    },
    input: {
        width: '100%',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        fontSize: 16,
        fontFamily: 'latto',
        color: '#1A1A1A',
    },
    primaryBtn: {
        width: '100%',
        backgroundColor: '#864AF9',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
        minHeight: 54,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'latto',
    },
    btnDisabled: {
        opacity: 0.6,
    },
});

export default ParentEmailCheck;