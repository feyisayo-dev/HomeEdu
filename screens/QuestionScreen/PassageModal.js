import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from './questionStyles';
import { renderFormattedContent } from './renderFormatted';

const PassageModal = ({ visible, onClose, content }) => (
  <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
    <View style={styles.passageModalOverlay}>
      <View style={styles.passageModalContent}>
        <View style={styles.passageModalHeader}>
          <Text style={styles.passageModalTitle}>📖 Read Passage</Text>
          <TouchableOpacity onPress={onClose} style={styles.passageCloseButton}>
            <Text style={styles.passageCloseButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.passageModalBody} showsVerticalScrollIndicator={false}>
          {renderFormattedContent(content, styles.passageText)}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default PassageModal;
