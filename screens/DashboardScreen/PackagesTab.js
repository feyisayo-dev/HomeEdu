import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { BackgroundMusicContext } from '../../context/BackgroundMusicProvider';
import styles from './dashboardStyles';

const PackagesTab = ({
  musicPacks, loadingPackages, downloadingPackId, downloadStatus,
  downloadedPacks, partialStatus,
  fetchMusicPackages, downloadPack, promptDelete,
}) => {
  const { isMuted, toggleMute } = useContext(BackgroundMusicContext);

  return (
    <ScrollView
      contentContainerStyle={styles.packagesScroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loadingPackages} onRefresh={fetchMusicPackages} tintColor="#864AF9" colors={['#864AF9']} />}
    >
      <View style={[styles.headerContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.SoundTitle}>Sound Store 🎧</Text>
          <Text style={styles.SoundDescription}>Lo-Fi & White Noise for deep focus.</Text>
        </View>
        <TouchableOpacity onPress={toggleMute} style={{ padding: 10, backgroundColor: isMuted ? '#FF6B6B' : '#864AF9', borderRadius: 20, marginLeft: 10 }}>
          <Text style={{ fontSize: 18 }}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
      </View>

      {loadingPackages && musicPacks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#864AF9" />
          <Text style={styles.loadingText}>Fetching sounds...</Text>
        </View>
      ) : (
        <View style={styles.packageGrid}>
          {musicPacks.map(pack => {
            const isDownloading = downloadingPackId === pack.id;
            const isDownloaded  = downloadedPacks.includes(pack.id);
            const partialText   = partialStatus[pack.id];

            return (
              <View key={pack.id} style={[styles.packageCard, { backgroundColor: pack.tagColor || '#FFFFFF' }]}>
                <View>
                  <Text style={styles.packageTitle}>{pack.title}</Text>
                  <Text style={styles.packageDesc}>{pack.description}</Text>
                  <View style={styles.infoBadge}>
                    <Text style={styles.infoBadgeText}>🎵 {pack.files.length} Tracks</Text>
                  </View>
                </View>

                <View style={styles.dashedDivider} />

                <View style={styles.packageFooter}>
                  {isDownloaded && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => promptDelete(pack)}>
                      <Text style={{ fontSize: 20 }}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.downloadFullBtn, isDownloading && styles.downloadingBtn, isDownloaded && styles.downloadedBtn]}
                    onPress={() => !isDownloaded && downloadPack(pack)}
                    disabled={isDownloading || isDownloaded}
                    activeOpacity={0.8}
                  >
                    {isDownloading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.downloadBtnText} numberOfLines={1}>{downloadStatus}</Text>
                      </View>
                    ) : isDownloaded ? (
                      <Text style={[styles.downloadBtnText, { color: '#004d00' }]} numberOfLines={1}>INSTALLED ✅</Text>
                    ) : partialText ? (
                      <Text style={[styles.downloadBtnText, { color: '#D97706' }]} numberOfLines={1}>RESUME ({partialText}) 📥</Text>
                    ) : (
                      <Text style={styles.downloadBtnText} numberOfLines={1}>DOWNLOAD PACK 📥</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.cardCorner} />
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default PackagesTab;
