import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Modal, // Import Modal
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications"; // 1. Import Notifications

// --- NOTIFICATION HANDLER CONFIG ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const NovelScreen = ({ navigation }) => {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadedIds, setDownloadedIds] = useState(new Set());
  
  // Active Download State
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // --- EXIT GUARD STATE ---
  const [exitModalVisible, setExitModalVisible] = useState(false);
  const [pendingNavAction, setPendingNavAction] = useState(null);

  useEffect(() => {
    loadNovels();
  }, []);

  useEffect(() => {
    if (novels.length > 0) {
      checkExistingFiles();
    }
  }, [novels]);

  // --- 2. THE EXIT GUARD LOGIC (Intercepts Back Button) ---
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If NOTHING is downloading, let the user leave peacefully
      if (!downloadingId) {
        return;
      }

      // If we are downloading, BLOCK the exit
      e.preventDefault();

      // Save where the user wanted to go, and show the warning modal
      setPendingNavAction(e.data.action);
      setExitModalVisible(true);
    });

    return unsubscribe;
  }, [navigation, downloadingId]); // Re-run listener when downloading status changes

  // --- 3. HELPER: SEND NOTIFICATION ---
  const sendDownloadNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: true, 
      },
      trigger: null, // Fire immediately
    });
  };

  const loadNovels = async () => {
    setLoading(true);
    try {
      const cachedData = await AsyncStorage.getItem("novels_cache");
      if (cachedData) {
        setNovels(JSON.parse(cachedData));
      }
      const response = await fetch("https://homeedu.fsdgroup.com.ng/api/novels");
      const data = await response.json();
      if (data.status === 200) {
        setNovels(data.data);
        await AsyncStorage.setItem("novels_cache", JSON.stringify(data.data));
      }
    } catch (err) {
      console.log("Using offline data.");
    } finally {
      setLoading(false);
    }
  };

  const checkExistingFiles = async () => {
    const existing = new Set();
    for (const novel of novels) {
      const localUri = `${FileSystem.documentDirectory}${novel.NovelId}.pdf`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) existing.add(novel.NovelId);
    }
    setDownloadedIds(existing);
  };

  const handleDelete = (item) => {
    Alert.alert("Delete Novel", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
            try {
                await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${item.NovelId}.pdf`);
                setDownloadedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item.NovelId);
                    return next;
                });
            } catch(e) {}
        },
      },
    ]);
  };

  const handleNovelPress = async (item) => {
    const fileName = `${item.NovelId}.pdf`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
      navigation.navigate("Passage", { sourceUri: localUri, title: item.title });
    } else {
      // START DOWNLOAD
      setDownloadingId(item.NovelId);
      setDownloadProgress(0);

      // Notify User: "Download Started"
      sendDownloadNotification("⬇️ Downloading...", `Getting "${item.title}" ready for you.`);

      const callback = (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(Math.round(progress * 100));
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        item.pdf_url,
        localUri,
        {},
        callback
      );

      try {
        const { uri } = await downloadResumable.downloadAsync();
        setDownloadedIds((prev) => new Set(prev).add(item.NovelId));
        
        // Notify User: "Download Complete"
        sendDownloadNotification("✅ Download Complete", `You can now read "${item.title}" offline.`);
        
        navigation.navigate("Passage", { sourceUri: uri, title: item.title });
      } catch (e) {
        Alert.alert("Error", "Download failed.");
      } finally {
        setDownloadingId(null);
        setDownloadProgress(0);
      }
    }
  };

  // --- FORCE EXIT FUNCTION ---
  const handleForceLeave = () => {
    setExitModalVisible(false);
    // Execute the action that was blocked (e.g., Go Back)
    if (pendingNavAction) {
      navigation.dispatch(pendingNavAction);
    }
  };

  if (loading && novels.length === 0)
    return <ActivityIndicator size="large" color="#864AF9" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <View style={styles.counterBadge}>
          <Ionicons name="cloud-done-outline" size={16} color="#fff" />
          <Text style={styles.counterText}>{downloadedIds.size} / {novels.length}</Text>
        </View>
      </View>

      <FlatList
        data={novels}
        keyExtractor={(item) => item.NovelId.toString()}
        renderItem={({ item }) => {
          const isDownloaded = downloadedIds.has(item.NovelId);
          return (
            <TouchableOpacity
              style={styles.novelItem}
              onPress={() => handleNovelPress(item)}
              disabled={downloadingId !== null} // Disable other clicks while downloading
            >
              <Image source={{ uri: item.image_url }} style={styles.coverImg} />
              <View style={styles.textContainer}>
                <Text style={styles.novelTitle}>{item.title}</Text>
                <Text style={styles.novelAuthor}>{item.author}</Text>
                {downloadingId === item.NovelId ? (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator size="small" color="#864AF9" style={{ marginRight: 8 }} />
                    <Text style={styles.statusText}>{downloadProgress}%</Text>
                  </View>
                ) : (
                  <Text style={{ color: isDownloaded ? "#27ae60" : "#A0AEC0", fontSize: 12, fontWeight: isDownloaded ? "600" : "400" }}>
                    {isDownloaded ? "Available Offline" : "Tap to Download"}
                  </Text>
                )}
              </View>
              {isDownloaded && downloadingId !== item.NovelId && (
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* --- CUSTOM WARNING MODAL --- */}
      <Modal
        visible={exitModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setExitModalVisible(false)} // Android hardware back
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.warningIcon}>
              <Text style={{ fontSize: 40 }}>⚠️</Text>
            </View>
            <Text style={styles.modalTitle}>Download in Progress!</Text>
            <Text style={styles.modalMessage}>
              Leaving this screen now will <Text style={{fontWeight:'bold', color: '#D00000'}}>CORRUPT</Text> the novel file.
              {"\n\n"}Please wait for the download to finish.
            </Text>
            
            <View style={styles.modalBtnRow}>
              {/* Button 1: Stay (Safe) */}
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={() => setExitModalVisible(false)}
              >
                <Text style={styles.modalBtnTextWhite}>STAY HERE</Text>
              </TouchableOpacity>

              {/* Button 2: Leave (Dangerous) */}
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnDestructive]}
                onPress={handleForceLeave}
              >
                <Text style={styles.modalBtnTextRed}>RISK IT & LEAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FE", padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#2D3748" },
  counterBadge: { flexDirection: "row", backgroundColor: "#864AF9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignItems: "center" },
  counterText: { color: "#fff", fontSize: 12, fontWeight: "bold", marginLeft: 6 },
  novelItem: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 12, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3, alignItems: "center" },
  coverImg: { width: 60, height: 90, borderRadius: 8, backgroundColor: "#eee" },
  textContainer: { marginLeft: 16, justifyContent: "center", flex: 1 },
  novelTitle: { fontSize: 16, fontWeight: "700", color: "#2D3748" },
  novelAuthor: { fontSize: 14, color: "#718096", marginBottom: 4 },
  progressContainer: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  statusText: { color: "#864AF9", fontSize: 12, fontWeight: "bold" },
  deleteButton: { padding: 10, marginLeft: 8 },

  // --- MODAL STYLES (Neo-Brutalist) ---
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "85%", backgroundColor: "#FFF", borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 3, borderColor: "#000", shadowColor: "#000", shadowOffset: {width: 6, height: 6}, shadowOpacity: 1, elevation: 10 },
  warningIcon: { marginBottom: 16, backgroundColor: "#FFF5F5", width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#000" },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#000", marginBottom: 10, textTransform: "uppercase", textAlign: "center" },
  modalMessage: { fontSize: 15, color: "#555", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  modalBtnRow: { width: "100%", gap: 12 },
  modalBtn: { width: "100%", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#000", shadowColor: "#000", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1 },
  modalBtnPrimary: { backgroundColor: "#864AF9" },
  modalBtnDestructive: { backgroundColor: "#FFF", borderColor: "#FF3B30" },
  modalBtnTextWhite: { color: "#FFF", fontWeight: "900", fontSize: 16 },
  modalBtnTextRed: { color: "#FF3B30", fontWeight: "900", fontSize: 14 },
});

export default NovelScreen;