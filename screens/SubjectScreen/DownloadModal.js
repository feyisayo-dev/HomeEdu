import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from './subjectStyles';

const DownloadModal = ({
  visible,
  downloadStep,
  schoolDetails,
  selectedExamType,
  setSelectedExamType,
  subjects,
  downloadedSubjects,
  selectedOfflineSubjects,
  toggleOfflineSelection,
  calculateDownloadSize,
  totalDownloadSize,
  downloadProgress,
  downloadMessage,
  startDownload,
  setDownloadStep,
  closeModal,
}) => (
  <Modal visible={visible} animationType="slide" transparent>
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

        {/* ── SELECT ── */}
        {downloadStep === 'select' && (
          <View style={{ flex: 1, width: '100%' }}>

            {/* School / District exam buttons */}
            {schoolDetails != null && (
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.modalSub}>Grouped School Exams (Select One)</Text>

                {schoolDetails.district_id && (
                  <TouchableOpacity
                    style={[
                      styles.modalSubjectCard,
                      selectedExamType === 'district' && styles.modalSubjectCardActive,
                      { marginBottom: 10, flex: 0, width: '100%', alignItems: 'center' },
                    ]}
                    onPress={() => setSelectedExamType(prev => prev === 'district' ? null : 'district')}
                  >
                    <Text style={[styles.modalSubjectText, selectedExamType === 'district' && { color: '#864AF9' }]}>
                      🏛️ All District Mocks
                    </Text>
                    {selectedExamType === 'district' && <Ionicons name="checkmark-circle" size={16} color="#864AF9" />}
                  </TouchableOpacity>
                )}

                {schoolDetails.school_id && (
                  <TouchableOpacity
                    style={[
                      styles.modalSubjectCard,
                      selectedExamType === 'teacher' && styles.modalSubjectCardActive,
                      { marginBottom: 10, flex: 0, width: '100%', alignItems: 'center' },
                    ]}
                    onPress={() => setSelectedExamType(prev => prev === 'teacher' ? null : 'teacher')}
                  >
                    <Text style={[styles.modalSubjectText, selectedExamType === 'teacher' && { color: '#864AF9' }]}>
                      🏫 All School Exams
                    </Text>
                    {selectedExamType === 'teacher' && <Ionicons name="checkmark-circle" size={16} color="#864AF9" />}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Standard subjects grid */}
            <Text style={styles.modalSub}>Standard Subjects (Max 4)</Text>
            <FlatList
              data={subjects}
              keyExtractor={item => item.SubjectId.toString()}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              showsVerticalScrollIndicator={false}
              extraData={selectedOfflineSubjects}
              renderItem={({ item }) => {
                const isSelected          = selectedOfflineSubjects.includes(item.SubjectId);
                const isAlreadyDownloaded = downloadedSubjects.some(d => d.subjectId === item.SubjectId);
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalSubjectCard,
                      isSelected && styles.modalSubjectCardActive,
                      isAlreadyDownloaded && { opacity: 0.5 },
                      { marginBottom: 10 },
                    ]}
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
              style={[
                styles.modalBtn,
                selectedOfflineSubjects.length === 0 && !selectedExamType && { backgroundColor: '#ccc', borderColor: '#ccc' },
              ]}
              disabled={selectedOfflineSubjects.length === 0 && !selectedExamType}
              onPress={calculateDownloadSize}
            >
              <Text style={styles.modalBtnText}>Calculate Size</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── CALCULATING ── */}
        {downloadStep === 'calculating' && (
          <View style={styles.modalCenter}>
            <ActivityIndicator size="large" color="#864AF9" />
            <Text style={{ marginTop: 10, fontWeight: '600' }}>Checking file sizes...</Text>
          </View>
        )}

        {/* ── CONFIRM ── */}
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

        {/* ── DOWNLOADING ── */}
        {downloadStep === 'downloading' && (
          <View style={styles.modalCenter}>
            <Ionicons name="cloud-download" size={60} color="#864AF9" />
            <Text style={[styles.sizeText, { fontSize: 20, textAlign: 'center' }]}>{downloadMessage}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
            </View>
            <Text style={{ marginTop: 10, fontWeight: '700' }}>{Math.round(downloadProgress)}%</Text>
          </View>
        )}

      </View>
    </View>
  </Modal>
);

export default DownloadModal;
