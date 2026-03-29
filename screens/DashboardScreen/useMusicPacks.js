import { useState } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const getSafeFileName = (name) =>
  name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp3';

const useMusicPacks = ({ isOnline }) => {
  const [musicPacks, setMusicPacks]           = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [downloadingPackId, setDownloadingPackId] = useState(null);
  const [downloadStatus, setDownloadStatus]   = useState('');
  const [downloadedPacks, setDownloadedPacks] = useState([]);
  const [partialStatus, setPartialStatus]     = useState({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [packToDelete, setPackToDelete]       = useState(null);

  const checkExistingDownloads = async (packs) => {
    const loadedIds = [];
    const partials  = {};
    for (const pack of packs) {
      const packFolder = `${FileSystem.documentDirectory}music_packs/${pack.id}/`;
      const dirInfo    = await FileSystem.getInfoAsync(packFolder);
      if (!dirInfo.exists) continue;

      let found = 0;
      for (const file of pack.files) {
        const info = await FileSystem.getInfoAsync(packFolder + getSafeFileName(file.name));
        if (info.exists) found++;
      }
      if (found === pack.files.length) {
        loadedIds.push(pack.id);
      } else if (found > 0) {
        partials[pack.id] = `${found}/${pack.files.length}`;
      } else {
        await FileSystem.deleteAsync(packFolder, { idempotent: true });
      }
    }
    setDownloadedPacks(loadedIds);
    setPartialStatus(partials);
  };

  const fetchMusicPackages = async () => {
    if (!isOnline) return;
    setLoadingPackages(true);
    try {
      const response = await fetch(`https://fsdgroup.com.ng/Edu/music/music.json?t=${Date.now()}`);
      const json     = await response.json();
      if (json.packs) {
        setMusicPacks(json.packs);
        checkExistingDownloads(json.packs);
      }
    } catch (err) {
      console.error('Error fetching music:', err);
    } finally {
      setLoadingPackages(false);
    }
  };

  const downloadPack = async (pack) => {
    if (!isOnline) { Alert.alert('Offline', 'You need internet to download packs.'); return; }
    if (downloadingPackId) return;

    setDownloadingPackId(pack.id);
    setDownloadStatus('Checking...');
    try {
      const packFolder = `${FileSystem.documentDirectory}music_packs/${pack.id}/`;
      const dirInfo    = await FileSystem.getInfoAsync(packFolder);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(packFolder, { intermediates: true });

      let count = 0;
      const total = pack.files.length;

      for (const file of pack.files) {
        const safeName  = getSafeFileName(file.name);
        const finalUri  = packFolder + safeName;
        const tempUri   = finalUri + '.tmp';
        setDownloadStatus(`${count}/${total}`);

        const fileInfo = await FileSystem.getInfoAsync(finalUri);
        if (!fileInfo.exists) {
          const res = await FileSystem.downloadAsync(file.url, tempUri);
          if (res.status !== 200) {
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
            throw new Error(`Failed to download ${file.name}`);
          }
          await FileSystem.moveAsync({ from: tempUri, to: finalUri });
          count++;
        } else {
          count++;
        }
      }

      setDownloadStatus('Done!');
      Alert.alert('Success!', 'Pack download complete.');
      setDownloadedPacks(prev => [...prev, pack.id]);
      setPartialStatus(prev => { const next = { ...prev }; delete next[pack.id]; return next; });
    } catch (err) {
      Alert.alert('Download Paused', "Internet connection lost. Tap 'Resume' to continue.");
      checkExistingDownloads([pack]);
    } finally {
      setDownloadingPackId(null);
      setDownloadStatus('');
    }
  };

  const promptDelete  = (pack) => { setPackToDelete(pack); setDeleteModalVisible(true); };
  const cancelDelete  = () => { setDeleteModalVisible(false); setPackToDelete(null); };
  const performDelete = async () => {
    if (!packToDelete) return;
    try {
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}music_packs/${packToDelete.id}/`, { idempotent: true });
      setDownloadedPacks(prev => prev.filter(id => id !== packToDelete.id));
      setDeleteModalVisible(false);
      setPackToDelete(null);
    } catch (e) { console.error(e); }
  };

  return {
    musicPacks, loadingPackages, downloadingPackId, downloadStatus,
    downloadedPacks, partialStatus,
    deleteModalVisible, packToDelete,
    fetchMusicPackages, downloadPack,
    promptDelete, cancelDelete, performDelete,
  };
};

export default useMusicPacks;
