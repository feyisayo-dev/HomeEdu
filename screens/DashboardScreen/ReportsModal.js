import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList } from 'react-native';
import styles from './dashboardStyles';

const ReportsModal = ({ visible, onClose, reports }) => {
  const [activeTab, setActiveTab] = useState('recent');

  const data =
    activeTab === 'recent' ? reports.slice(0, 20)
    : activeTab === 'best'  ? [...reports].sort((a, b) => b.Score - a.Score).slice(0, 20)
    :                          [...reports].sort((a, b) => a.Score - b.Score).slice(0, 20);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>All Reports</Text>

          <View style={styles.tabContainer}>
            {['recent', 'best', 'worst'].map(tab => (
              <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab === 'recent' ? 'Recent' : tab === 'best' ? 'Top' : 'Low'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={data}
            keyExtractor={(_, i) => i.toString()}
            showsVerticalScrollIndicator={false}
            style={styles.modalReportList}
            renderItem={({ item }) => (
              <View style={styles.modalReportItem}>
                <Text style={styles.modalReportTitle}>{item.exam_name || item.subtopic_name || 'Exam'}</Text>
                <Text style={styles.modalReportScore}>{item.Score}%</Text>
              </View>
            )}
          />

          <TouchableOpacity style={styles.cancelReportBtn} onPress={onClose}>
            <Text style={styles.cancelReportText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ReportsModal;
