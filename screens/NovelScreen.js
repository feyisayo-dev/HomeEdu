import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons"; // Import for the Delete Icon

const NovelScreen = ({ navigation }) => {
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  // New state to track which novels are currently saved on the device
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  // Track WHICH item is downloading and WHAT the percentage is
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    fetchNovels();
  }, []);

  // Whenever novels are loaded, check which ones exist locally
  useEffect(() => {
    if (novels.length > 0) {
      checkExistingFiles();
    }
  }, [novels]);

  const fetchNovels = async () => {
    try {
      const response = await fetch(
        "https://homeedu.fsdgroup.com.ng/api/novels"
      );
      const data = await response.json();
      if (data.status === 200) {
        setNovels(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. NEW LOGIC: Check file existence ---
  const checkExistingFiles = async () => {
    const existing = new Set();
    // Check every novel in the list
    for (const novel of novels) {
      const localUri = `${FileSystem.documentDirectory}${novel.NovelId}.pdf`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        existing.add(novel.NovelId);
      }
    }
    setDownloadedIds(existing);
  };

  // --- 2. NEW LOGIC: Delete function ---
  const handleDelete = (item) => {
    Alert.alert("Delete Novel", `Remove "${item.title}" from storage?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const localUri = `${FileSystem.documentDirectory}${item.NovelId}.pdf`;
            await FileSystem.deleteAsync(localUri);

            // Update UI: Remove ID from the set of downloaded items
            setDownloadedIds((prev) => {
              const next = new Set(prev);
              next.delete(item.NovelId);
              return next;
            });

            Alert.alert("Success", "Novel deleted to save space.");
          } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not delete file.");
          }
        },
      },
    ]);
  };

  const handleNovelPress = async (item) => {
    const fileName = `${item.NovelId}.pdf`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;

    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
      console.log("Opening from cache:", localUri);
      navigation.navigate("Passage", {
        sourceUri: localUri,
        title: item.title,
      });
    } else {
      // Start Download
      setDownloadingId(item.NovelId);
      setDownloadProgress(0);

      const callback = (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        const percentage = Math.round(progress * 100);
        setDownloadProgress(percentage);
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        item.pdf_url,
        localUri,
        {},
        callback
      );

      try {
        const { uri } = await downloadResumable.downloadAsync();
        console.log("Finished downloading to ", uri);

        // Add to downloaded set so the delete button appears
        setDownloadedIds((prev) => new Set(prev).add(item.NovelId));

        navigation.navigate("Passage", { sourceUri: uri, title: item.title });
      } catch (e) {
        Alert.alert("Error", "Could not download novel.");
        console.error(e);
      } finally {
        setDownloadingId(null);
        setDownloadProgress(0);
      }
    }
  };

  if (loading)
    return (
      <ActivityIndicator size="large" color="#864AF9" style={{ flex: 1 }} />
    );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Available Novels</Text>

      <FlatList
        data={novels}
        keyExtractor={(item) => item.NovelId.toString()}
        renderItem={({ item }) => {
          const isDownloaded = downloadedIds.has(item.NovelId);

          return (
            <TouchableOpacity
              style={styles.novelItem}
              onPress={() => handleNovelPress(item)}
              disabled={downloadingId !== null}
            >
              <Image source={{ uri: item.image_url }} style={styles.coverImg} />

              <View style={styles.textContainer}>
                <Text style={styles.novelTitle}>{item.title}</Text>
                <Text style={styles.novelAuthor}>{item.author}</Text>

                {downloadingId === item.NovelId ? (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator
                      size="small"
                      color="#864AF9"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: "#864AF9",
                        fontSize: 12,
                        fontWeight: "bold",
                      }}
                    >
                      Downloading... {downloadProgress}%
                    </Text>
                  </View>
                ) : (
                  // Change text based on status
                  <Text
                    style={{
                      color: isDownloaded ? "#27ae60" : "gray",
                      fontSize: 12,
                    }}
                  >
                    {isDownloaded
                      ? "Downloaded • Tap to Read"
                      : "Tap to Download"}
                  </Text>
                )}
              </View>

              {/* --- 3. DELETE BUTTON (Only shows if downloaded) --- */}
              {isDownloaded && downloadingId !== item.NovelId && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                >
                  <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FE", padding: 16 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 20,
  },
  novelItem: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
    alignItems: "center", // Align delete button vertically
  },
  coverImg: { width: 60, height: 90, borderRadius: 8, backgroundColor: "#eee" },
  textContainer: { marginLeft: 16, justifyContent: "center", flex: 1 },
  novelTitle: { fontSize: 16, fontWeight: "700", color: "#2D3748" },
  novelAuthor: { fontSize: 14, color: "#718096", marginBottom: 4 },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  // Style for the delete icon area
  deleteButton: {
    padding: 10,
    marginLeft: 8,
  },
});

export default NovelScreen;
