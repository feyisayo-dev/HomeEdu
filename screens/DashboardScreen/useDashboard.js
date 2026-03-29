import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import { updateStatsWidget } from '../../src/utils/widgetHelper';

const BASE = 'https://homeedu.fsdgroup.com.ng/api';

// ── Shared helper ─────────────────────────────────────────────────────────────
export const truncateText = (text, max = 18) => {
  if (!text) return null;
  return text.length > max ? text.substring(0, max) + '...' : text;
};

export const cacheImage = async (remoteUri, username) => {
  if (!remoteUri) return null;
  try {
    const fileName = remoteUri.split('/').pop().split('?')[0];
    const localPath = `${FileSystem.documentDirectory}${username}_${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) return localPath;
    const downloadRes = await FileSystem.downloadAsync(remoteUri, localPath);
    return downloadRes.uri;
  } catch {
    return remoteUri;
  }
};

// ── Hook ──────────────────────────────────────────────────────────────────────
const useDashboard = ({ userData, setUserData, navigation }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [sponsorship, setSponsorship] = useState(null);
  const [streaks, setStreaks] = useState(0);
  const [userStars, setUserStars] = useState(0);
  const [reports, setReports] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Profile edit temps
  const [tempFullName, setTempFullName] = useState(userData?.fullName || '');
  const [tempUsername, setTempUsername] = useState(userData?.username || '');
  const [tempEmail, setTempEmail] = useState(userData?.email || '');
  const [tempPhone, setTempPhone] = useState(userData?.phoneNumber || '');
  const [tempClass, setTempClass] = useState(userData?.class || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);

  // ── NetInfo listener ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsub();
  }, []);

  // ── Sponsorship from cache ──────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('sponsorship').then(raw => {
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.is_sponsored) setSponsorship(parsed);
    }).catch(() => { });
  }, []);

  // ── Avatar cache verify ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData) return;
    const verify = async () => {
      if (userData.localAvatar) {
        const info = await FileSystem.getInfoAsync(userData.localAvatar);
        if (!info.exists) {
          const newLocal = await cacheImage(userData.avatar, userData.username);
          const fixed = { ...userData, localAvatar: newLocal };
          setUserData(fixed);
          AsyncStorage.setItem('userData', JSON.stringify(fixed));
        }
      } else if (userData.avatar) {
        const newLocal = await cacheImage(userData.avatar, userData.username);
        const fixed = { ...userData, localAvatar: newLocal };
        setUserData(fixed);
        AsyncStorage.setItem('userData', JSON.stringify(fixed));
      }
    };
    verify();
  }, [userData?.username]);

  // ── Main fetch ──────────────────────────────────────────────────────────────
  // ── Helper: Populate State ──────────────────────────────────────────────────
  const populateDashboardState = async (data) => {
    setStreaks(data.streaks || 0);
    setUserStars(data.stars || 0);
    setReports((data.reports || []).map(r => ({
      ...r,
      Score: Number(parseFloat(r.Score).toFixed(2)),
      subtopic_name: truncateText(r.subtopic_name),
      exam_name: truncateText(r.exam_name),
    })));
    setLeaderboard(data.leaderboard || []);
    setSubjects(data.subjects || []);
    setAvailableClasses(data.classes || []);

    if (Platform.OS === 'android') {
      await updateStatsWidget(data.streaks || 0, data.stars || 0);
    }
  };

  // ── Main fetch ──────────────────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { navigation.navigate('Login'); return; }
      if (!userData?.username) return;

      const cacheKey = `@dashboard_cache_${userData.username}`;

      // 🌐 ONLINE: Try to fetch fresh data
      if (isOnline) {
        try {
          const response = await axios.post(
            `${BASE}/students/dashboard/mobile`,
            { username: userData.username, class: userData.class },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (response.data.status === 200) {
            const data = response.data.data;

            // 📦 Save fresh data to vault for offline use!
            await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
            await populateDashboardState(data);

            setLoading(false);
            return; // Success! Exit early.
          }
        } catch (apiErr) {
          // If the API fails (e.g., poor network), catch it and fallback to offline mode
          console.log("API failed, falling back to cache...");
        }
      }

      // 📦 OFFLINE (Or API Failed): Load from Cache
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);
      if (cachedDataStr) {
        const cachedData = JSON.parse(cachedDataStr);
        await populateDashboardState(cachedData);
        // Optional: You can set a minor warning so they know it's not live data
        // setError('Offline Mode: Displaying saved data'); 
      } else {
        // Only show a hard error if they are offline AND have never loaded the dashboard before
        setError('No Internet Connection ⚠️');
      }

    } catch (err) {
      setError('Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const fetchRefreshedUser = async () => {
    if (!isOnline) return;
    setRefreshing(true);
    try {
      await fetchDashboardData();
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE}/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: userData?.username }),
      });

      if (response.status === 401 || response.status === 403) { await handleLogout(); return; }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        if (text.includes('login') || text.includes('unauthorized') || text.includes('unauthenticated')) {
          await handleLogout();
          return;
        }
        throw new Error('Server returned invalid response format');
      }

      const result = await response.json();
      if (result.status === 401 || result.status === 403 || result.message === 'Unauthenticated') {
        await handleLogout(); return;
      }
      if (response.ok && result.status === 200) {
        const remoteUrl = result.user.userData?.avatar;
        const localUri = await cacheImage(remoteUrl, userData?.username);
        const updated = { ...userData, ...result.user.userData, avatar: remoteUrl, localAvatar: localUri };
        setUserData(updated);
        await AsyncStorage.setItem('userData', JSON.stringify(updated));
        if (result.sponsorship?.is_sponsored) {
          await AsyncStorage.setItem('sponsorship', JSON.stringify(result.sponsorship));
          setSponsorship(result.sponsorship);
        } else {
          await AsyncStorage.removeItem('sponsorship');
          setSponsorship(null);
        }
      }
    } catch (err) {
      if (err.message?.toLowerCase().includes('unauthorized') || err.message?.toLowerCase().includes('unauthenticated')) {
        await handleLogout();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token && isOnline) {
        try {
          await axios.post(`${BASE}/logout`, {}, { headers: { Authorization: `Bearer ${token.replace(/"/g, '')}` } });
        } catch { }
      }
      await AsyncStorage.multiRemove(['userData', 'token', 'sponsorship']);
      setUserData(null);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
      Alert.alert('Error', 'Error logging out.');
    }
  };

  // ── Profile saves (all share the same pattern) ──────────────────────────────
  const saveField = async (endpoint, body, onSuccess) => {
    if (!isOnline) { Alert.alert('Offline', 'You need internet to update your profile.'); return; }
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      Object.entries(body).forEach(([k, v]) => formData.append(k, v));
      const response = await fetch(`${BASE}/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.status === 200 || response.status === 200)) {
        onSuccess();
      } else if (data.status === 101) {
        Alert.alert('Error', 'Already taken.');
      } else {
        Alert.alert('Error', data.message || 'Failed to save.');
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
  };

  const toggleEditName = async () => {
    if (!isEditingName) { setIsEditingName(true); return; }
    await saveField('editname', { fullname: tempFullName, username: userData?.username }, async () => {
      const updated = { ...userData, fullName: tempFullName };
      setUserData(updated);
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      setIsEditingName(false);
      Alert.alert('Success', 'Name updated!');
    });
  };

  const saveUsername = async () => {
    await saveField('editusername', { old_username: userData?.username, new_username: tempUsername }, async () => {
      const updated = { ...userData, username: tempUsername };
      setUserData(updated);
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      setIsEditingUsername(false);
      Alert.alert('Success', 'Username updated!');
    });
  };

  const saveEmail = async () => {
    await saveField('editemail', { username: userData?.username, email: tempEmail }, async () => {
      const updated = { ...userData, email: tempEmail };
      setUserData(updated);
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      setIsEditingEmail(false);
      Alert.alert('Success', 'Email updated!');
    });
  };

  const savePhone = async () => {
    await saveField('editphone', { username: userData?.username, phone: tempPhone }, async () => {
      const updated = { ...userData, phoneNumber: tempPhone };
      setUserData(updated);
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      setIsEditingPhone(false);
      Alert.alert('Success', 'Phone updated!');
    });
  };

  const saveClass = async () => {
    await saveField('editclass', { username: userData?.username, class: tempClass }, async () => {
      const updated = { ...userData, class: tempClass };
      setUserData(updated);
      await AsyncStorage.setItem('userData', JSON.stringify(updated));
      setIsEditingClass(false);
      Alert.alert('Success', 'Class updated!');
    });
  };

  // ── Image upload ────────────────────────────────────────────────────────────
  const pickImage = async () => {
    if (!isOnline) { Alert.alert('Offline', 'You need internet to update your photo.'); return; }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission Required', 'Permission to access gallery is required!'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images', allowsEditing: true, quality: 1 });
      if (!result.canceled) uploadProfileImage(result.assets[0]);
    } catch {
      Alert.alert('Error', 'Could not open gallery.');
    }
  };

  const uploadProfileImage = async (image) => {
    if (!userData?.username || !image?.uri) { Alert.alert('Error', 'Missing data.'); return; }
    const token = await AsyncStorage.getItem('token');
    setIsUploadingImage(true);
    setUploadProgress(0);

    const cleanUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;
    const fileName = image.uri.split('/').pop();
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('username', userData.username);
    formData.append('profile_image', { uri: cleanUri, name: fileName, type: fileType });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/EditProfileImage`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = async () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && res.status === 200) {
          const remoteUrl = 'https://homeedu.fsdgroup.com.ng/storage/' + res.profile_image;
          const localUri = await cacheImage(remoteUrl, userData.username);
          const updated = { ...userData, avatar: remoteUrl, localAvatar: localUri };
          setUserData(updated);
          await AsyncStorage.setItem('userData', JSON.stringify(updated));
          Alert.alert('Success', 'Profile photo updated!');
        } else {
          Alert.alert('Error', 'Upload failed.');
        }
      } catch {
        Alert.alert('Error', 'Upload failed.');
      } finally {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }
    };
    xhr.onerror = () => { Alert.alert('Error', 'Upload failed.'); setIsUploadingImage(false); };
    xhr.send(formData);
  };

  return {
    isOnline, sponsorship, setSponsorship,
    streaks, userStars, reports, leaderboard, subjects, availableClasses,
    loading, error, refreshing,
    isUploadingImage, uploadProgress,
    fetchDashboardData, fetchRefreshedUser, handleLogout,
    // profile edit
    tempFullName, setTempFullName, isEditingName, toggleEditName,
    tempUsername, setTempUsername, isEditingUsername, setIsEditingUsername, saveUsername,
    tempEmail, setTempEmail, isEditingEmail, setIsEditingEmail, saveEmail,
    tempPhone, setTempPhone, isEditingPhone, setIsEditingPhone, savePhone,
    tempClass, setTempClass, isEditingClass, setIsEditingClass, saveClass,
    pickImage,
  };
};

export default useDashboard;
