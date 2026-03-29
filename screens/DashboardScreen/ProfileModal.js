import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import styles from './dashboardStyles';

const InputField = ({ label, value, onChange, isEditing, onToggle, keyboardType = 'default' }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.modalLabel}>{label}</Text>
    <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
      <TextInput style={styles.modalInput} value={value} onChangeText={onChange} editable={isEditing} keyboardType={keyboardType} />
      <TouchableOpacity style={styles.editIcon} onPress={onToggle}>
        <Ionicons name={isEditing ? 'checkmark' : 'pencil'} size={18} color="#000" />
      </TouchableOpacity>
    </View>
  </View>
);

const ProfileModal = ({
  visible, onClose,
  userData, availableClasses, navigation,
  isUploadingImage, uploadProgress, pickImage,
  tempFullName, setTempFullName, isEditingName, toggleEditName,
  tempUsername, setTempUsername, isEditingUsername, setIsEditingUsername, saveUsername,
  tempEmail, setTempEmail, isEditingEmail, setIsEditingEmail, saveEmail,
  tempPhone, setTempPhone, isEditingPhone, setIsEditingPhone, savePhone,
  tempClass, setTempClass, isEditingClass, setIsEditingClass, saveClass,
  handleLogout,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Your Profile</Text>

          {/* Avatar */}
          <TouchableOpacity onPress={pickImage} disabled={isUploadingImage} style={{ marginBottom: 20 }}>
            <View>
              <Image
                source={{ uri: userData?.localAvatar || userData?.avatar }}
                style={[styles.modalAvatar, { opacity: isUploadingImage ? 0.5 : 1 }]}
              />
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
              {isUploadingImage && (
                <View style={styles.uploadOverlay}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>{uploadProgress}%</Text>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginTop: 4 }} />
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={{ width: '100%', gap: 16 }}>
            <InputField label="Full Name:" value={tempFullName} onChange={setTempFullName} isEditing={isEditingName} onToggle={toggleEditName} />
            <InputField label="Username:" value={tempUsername} onChange={setTempUsername} isEditing={isEditingUsername} onToggle={() => isEditingUsername ? saveUsername() : setIsEditingUsername(true)} />
            <InputField label="Email:" value={tempEmail} onChange={setTempEmail} isEditing={isEditingEmail} onToggle={() => isEditingEmail ? saveEmail() : setIsEditingEmail(true)} />
            <InputField label="Phone:" value={tempPhone} onChange={setTempPhone} isEditing={isEditingPhone} onToggle={() => isEditingPhone ? savePhone() : setIsEditingPhone(true)} keyboardType="phone-pad" />

            {/* Class picker */}
            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Class:</Text>
              <View style={styles.inputContainer}>
                {isEditingClass ? (
                  <Picker selectedValue={tempClass} style={styles.modalInput} onValueChange={setTempClass}>
                    <Picker.Item label="Select a class" value="" />
                    {availableClasses.map(c => <Picker.Item key={c.id} label={c.ClassName} value={c.ClassName} />)}
                  </Picker>
                ) : (
                  <TextInput style={styles.modalInput} value={tempClass} editable={false} />
                )}
                <TouchableOpacity style={styles.editIcon} onPress={() => isEditingClass ? saveClass() : setIsEditingClass(true)}>
                  <Ionicons name={isEditingClass ? 'checkmark' : 'pencil'} size={18} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>LOGOUT</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingBottom: 30, width: '100%' }}>
            <TouchableOpacity
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={{ marginTop: 24, paddingVertical: 12, width: '100%', alignItems: 'center' }}
              onPress={() => { onClose(); setTimeout(() => navigation.navigate('Settings'), 300); }}
            >
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  </Modal>
);

export default ProfileModal;
