import { useState } from 'react';
import { Alert } from 'react-native';
import CryptoJS from 'crypto-js';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const OFFLINE_DIR       = FileSystem.documentDirectory + 'offline_packages/';
const OFFLINE_IMAGE_DIR = FileSystem.documentDirectory + 'offline_images/';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Image cacher ──────────────────────────────────────────────────────────────
const extractAndCacheImages = async (fileUri) => {
  try {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(OFFLINE_IMAGE_DIR, { intermediates: true });
    }

    const encryptedString = await FileSystem.readAsStringAsync(fileUri);
    const rawKey = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_KEY;
    const rawIv  = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_IV;

    const key       = CryptoJS.enc.Utf8.parse(rawKey);
    const iv        = CryptoJS.enc.Utf8.parse(rawIv);
    const decrypted = CryptoJS.AES.decrypt(encryptedString, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
    const json      = decrypted.toString(CryptoJS.enc.Utf8);
    if (!json) throw new Error('Decryption empty.');

    const parsedData = JSON.parse(json);
    const foundUrls  = [];

    const searchForImages = (obj) => {
      if (!obj) return;
      if (Array.isArray(obj)) { obj.forEach(searchForImages); return; }
      if (typeof obj === 'object') {
        if (obj.image && typeof obj.image === 'string' && obj.image.startsWith('http')) {
          foundUrls.push(obj.image);
        }
        if (obj.content && typeof obj.content === 'string') {
          const re = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi;
          let m;
          while ((m = re.exec(obj.content)) !== null) foundUrls.push(m[1]);
        }
        Object.values(obj).forEach(searchForImages);
      }
    };
    searchForImages(parsedData);

    const unique = [...new Set(foundUrls)];
    for (const url of unique) {
      const safeFilename = url.replace(/[^a-zA-Z0-9.]/g, '_');
      const localUri     = OFFLINE_IMAGE_DIR + safeFilename;
      const info         = await FileSystem.getInfoAsync(localUri);
      if (!info.exists) {
        try { await FileSystem.downloadAsync(url, localUri); } catch {}
      }
    }
  } catch (err) {
    console.error('Image cacher error:', err.message);
  }
};

// ── Decrypt a single manifest item and return parsed data ─────────────────────
export const decryptManifestItem = async (fileUri) => {
  const encryptedString = await FileSystem.readAsStringAsync(fileUri);
  const rawKey = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_KEY;
  const rawIv  = process.env.EXPO_PUBLIC_OFFLINE_ENCRYPTION_IV;

  if (!rawKey || !rawIv) throw new Error('Security keys missing.');

  const key       = CryptoJS.enc.Utf8.parse(rawKey);
  const iv        = CryptoJS.enc.Utf8.parse(rawIv);
  const decrypted = CryptoJS.AES.decrypt(encryptedString, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const json      = decrypted.toString(CryptoJS.enc.Utf8);

  if (!json) throw new Error('Decryption resulted in empty data.');
  return JSON.parse(json);
};

// ── Hook ──────────────────────────────────────────────────────────────────────
const useOfflinePackages = ({ userData, isPremiumUser, isDistrictExamWindowActive }) => {
  const [downloadedSubjects, setDownloadedSubjects] = useState([]);
  const [showDownloadModal, setShowDownloadModal]   = useState(false);
  const [selectedOfflineSubjects, setSelectedOfflineSubjects] = useState([]);
  const [selectedExamType, setSelectedExamType]     = useState(null); // 'district' | 'teacher' | null
  const [downloadStep, setDownloadStep]             = useState('select');
  const [packagesInfo, setPackagesInfo]             = useState([]);
  const [totalDownloadSize, setTotalDownloadSize]   = useState(0);
  const [downloadProgress, setDownloadProgress]     = useState(0);
  const [downloadMessage, setDownloadMessage]       = useState('Downloading...');
  const [showUpgradeModal, setShowUpgradeModal]     = useState(false);
  const [showClearModal, setShowClearModal]         = useState(false);

  // During the district exam window every user gets access,
  // otherwise only premium users can download.
  const canAccessOffline = isPremiumUser || isDistrictExamWindowActive;

  // ── Manifest ────────────────────────────────────────────────────────────────
  const loadLocalManifest = async () => {
    try {
      const raw = await AsyncStorage.getItem(`@offline_manifest_${userData.class}`);
      if (raw) setDownloadedSubjects(JSON.parse(raw));
    } catch (e) {
      console.log('Error loading manifest', e);
    }
  };

  // ── Subject selection in download modal ──────────────────────────────────────
  const toggleOfflineSelection = (subjectId) => {
    if (selectedOfflineSubjects.includes(subjectId)) {
      setSelectedOfflineSubjects(prev => prev.filter(id => id !== subjectId));
      return;
    }

    // During the district window, free users can download freely.
    // Outside the window, free users hit the 4-subject cap.
    if (!isPremiumUser && !isDistrictExamWindowActive) {
      const total = downloadedSubjects.length + selectedOfflineSubjects.length;
      if (total >= 4) { setShowUpgradeModal(true); return; }
    }

    if (selectedOfflineSubjects.length >= 4) {
      Alert.alert('Batch Limit', 'To keep downloads fast, please download 4 subjects at a time.');
      return;
    }

    setSelectedOfflineSubjects(prev => [...prev, subjectId]);
  };

  // ── Step 1: calculate size ───────────────────────────────────────────────────
  const calculateDownloadSize = async () => {
    if (selectedOfflineSubjects.length === 0 && !selectedExamType) return;
    setDownloadStep('calculating');
    try {
      const token   = await AsyncStorage.getItem('token');
      const payload = { class: userData.class };
      if (selectedOfflineSubjects.length > 0) payload.subject_ids = selectedOfflineSubjects;
      if (selectedExamType) payload.exam_type = selectedExamType;

      const response = await axios.post(
        'https://homeedu.fsdgroup.com.ng/api/offline-packages-urls',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 200) {
        const downloads = response.data.downloads;
        setPackagesInfo(downloads);
        const totalBytes = downloads.reduce((acc, curr) => acc + curr.size_bytes, 0);
        setTotalDownloadSize((totalBytes / (1024 * 1024)).toFixed(2));
        setDownloadStep('confirm');
      } else {
        Alert.alert('Error', 'Could not prepare offline packages.');
        setDownloadStep('select');
      }
    } catch {
      Alert.alert('Error', 'Network error while preparing download.');
      setDownloadStep('select');
    }
  };

  // ── Step 2: download ─────────────────────────────────────────────────────────
  const startDownload = async () => {
    setDownloadStep('downloading');
    setDownloadProgress(0);
    setDownloadMessage('Downloading Exam Data...');

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing.');

      const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
      if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(OFFLINE_DIR, { intermediates: true });

      // Pre-fetch reports for offline cache
      try {
        const reportRes = await axios.get(`https://homeedu.fsdgroup.com.ng/api/report/${userData.username}`);
        if (reportRes.data.status === 200) {
          await AsyncStorage.setItem(`@cached_user_reports_${userData.username}`, JSON.stringify(reportRes.data.data));
        }
      } catch {}

      let newManifest = [...downloadedSubjects];

      for (let i = 0; i < packagesInfo.length; i++) {
        const pkg       = packagesInfo[i];
        const isSubject = pkg.type === 'subject';
        const uniqueId  = isSubject ? pkg.subjectId : pkg.examId;
        const fileUri   = OFFLINE_DIR + `${pkg.type}_${uniqueId}.enc`;

        setDownloadMessage(`Downloading ${pkg.subjectName}...`);

        const downloadResumable = FileSystem.createDownloadResumable(
          pkg.url,
          fileUri,
          { headers: { Authorization: `Bearer ${token}` } },
          (progress) => {
            const written   = progress.totalBytesWritten;
            const expected  = progress.totalBytesExpectedToWrite;
            let pct = expected > 0 ? written / expected
              : pkg.size_bytes > 0 ? written / pkg.size_bytes
              : 0.5;
            pct = Math.max(0, Math.min(1, pct));
            setDownloadProgress(((i + pct) / packagesInfo.length) * 100);
          }
        );

        try {
          const result = await downloadResumable.downloadAsync();
          if (result.status === 429) throw new Error('Downloading too fast. Please try again in 1 minute.');
          if (result.status !== 200) throw new Error(`Server rejected download with status: ${result.status}`);

          const manifestItem = {
            type:        pkg.type,
            subjectId:   isSubject ? uniqueId : null,
            examId:      isSubject ? null : uniqueId,
            subjectName: pkg.subjectName,
            fileUri,
            _key: `${pkg.type}_${uniqueId}`,
          };

          newManifest = newManifest.filter(item => {
            const itemId = item.type === 'subject' ? item.subjectId : item.examId;
            return !(item.type === pkg.type && itemId === uniqueId);
          });
          newManifest.push(manifestItem);

          setDownloadMessage(`Syncing Images for ${pkg.subjectName}...`);
          await extractAndCacheImages(fileUri);

          if (i < packagesInfo.length - 1) await sleep(1500);
        } catch (err) {
          const info = await FileSystem.getInfoAsync(fileUri);
          if (info.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true });
          throw new Error(err.message || `Failed to download ${pkg.subjectName}.`);
        }
      }

      await AsyncStorage.setItem(`@offline_manifest_${userData.class}`, JSON.stringify(newManifest));
      setDownloadedSubjects(newManifest);
      Alert.alert('Success', 'Offline packages and images secured successfully!');
      closeModal();
    } catch (err) {
      Alert.alert('Download Failed', err.message || 'There was an error saving the files.');
      setDownloadStep('select');
    }
  };

  // ── Clear storage ────────────────────────────────────────────────────────────
  const handleConfirmClear = async () => {
    setShowClearModal(false);
    try {
      const dirInfo = await FileSystem.getInfoAsync(OFFLINE_DIR);
      if (dirInfo.exists) await FileSystem.deleteAsync(OFFLINE_DIR, { idempotent: true });
      await AsyncStorage.removeItem(`@offline_manifest_${userData.class}`);
      setDownloadedSubjects([]);
      Alert.alert('Storage Cleared', 'All offline packages have been removed.');
    } catch {
      Alert.alert('Error', 'Could not delete all files. Please restart the app and try again.');
    }
  };

  const closeModal = () => {
    setShowDownloadModal(false);
    setDownloadStep('select');
    setSelectedOfflineSubjects([]);
    setSelectedExamType(null);
    setDownloadProgress(0);
  };

  return {
    // State
    downloadedSubjects, canAccessOffline,
    showDownloadModal, setShowDownloadModal,
    selectedOfflineSubjects,
    selectedExamType, setSelectedExamType,
    downloadStep, setDownloadStep,
    totalDownloadSize, downloadProgress, downloadMessage,
    showUpgradeModal, setShowUpgradeModal,
    showClearModal, setShowClearModal,
    // Actions
    loadLocalManifest, toggleOfflineSelection,
    calculateDownloadSize, startDownload,
    handleConfirmClear, closeModal,
    OFFLINE_DIR,
  };
};

export default useOfflinePackages;
