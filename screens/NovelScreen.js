import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const NovelScreen = ({ navigation }) => {
    const [novels, setNovels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Track WHICH item is downloading and WHAT the percentage is
    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        fetchNovels();
    }, []);

    const fetchNovels = async () => {
        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/novels');
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

    const handleNovelPress = async (item) => {
        const fileName = `${item.NovelId}.pdf`;
        const localUri = `${FileSystem.documentDirectory}${fileName}`;

        // 1. Check if file exists
        const fileInfo = await FileSystem.getInfoAsync(localUri);

        if (fileInfo.exists) {
            console.log("Opening from cache:", localUri);
            navigation.navigate('Passage', { sourceUri: localUri, title: item.title });
        } else {
            // 2. Start Download
            setDownloadingId(item.NovelId);
            setDownloadProgress(0); // Reset progress

            // Callback function to handle progress updates
            const callback = downloadProgress => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                const percentage = Math.round(progress * 100);
                setDownloadProgress(percentage);
            };

            // Create the resumable download object
            const downloadResumable = FileSystem.createDownloadResumable(
                item.pdf_url,
                localUri,
                {},
                callback
            );

            try {
                console.log("Downloading from:", item.pdf_url);

                // Start the download
                const { uri } = await downloadResumable.downloadAsync();

                console.log('Finished downloading to ', uri);
                navigation.navigate('Passage', { sourceUri: uri, title: item.title });

            } catch (e) {
                Alert.alert("Error", "Could not download novel.");
                console.error(e);
            } finally {
                setDownloadingId(null);
                setDownloadProgress(0);
            }
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#864AF9" style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>Available Novels</Text>

            <FlatList
                data={novels}
                keyExtractor={(item) => item.NovelId.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.novelItem}
                        onPress={() => handleNovelPress(item)}
                        disabled={downloadingId !== null} // Prevent double clicks
                    >
                        <Image source={{ uri: item.image_url }} style={styles.coverImg} />

                        <View style={styles.textContainer}>
                            <Text style={styles.novelTitle}>{item.title}</Text>
                            <Text style={styles.novelAuthor}>{item.author}</Text>

                            {/* DYNAMIC PROGRESS TEXT */}
                            {downloadingId === item.NovelId ? (
                                <View style={styles.progressContainer}>
                                    <ActivityIndicator size="small" color="#864AF9" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#864AF9', fontSize: 12, fontWeight: 'bold' }}>
                                        Downloading... {downloadProgress}%
                                    </Text>
                                </View>
                            ) : (
                                <Text style={{ color: 'gray', fontSize: 12 }}>Tap to Read</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FE', padding: 16 },
    headerTitle: { fontSize: 22, fontWeight: '700', color: '#2D3748', marginBottom: 20 },
    novelItem: {
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 3
    },
    coverImg: { width: 60, height: 90, borderRadius: 8, backgroundColor: '#eee' },
    textContainer: { marginLeft: 16, justifyContent: 'center', flex: 1 },
    novelTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
    novelAuthor: { fontSize: 14, color: '#718096', marginBottom: 4 },

    // New style for the row with spinner + text
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4
    }
});

export default NovelScreen;