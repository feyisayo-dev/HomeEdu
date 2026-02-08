import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import React, { useEffect, useState, useMemo, useRef, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  Modal,
  FlatList
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../context/UserContext";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system/legacy";
import { TutorialProvider, TutorialStep, useTutorial } from '../context/TutorialSysytem';
import { BackgroundMusicContext } from '../context/BackgroundMusicProvider';
import * as NotificationService from '../context/NotificationService'; // Update path as needed
import { requestWidgetUpdate } from 'react-native-android-widget';
import { StatsWidget } from '../src/widgets/StatsWidget';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get("window");

const InputField = ({ label, value, onChange, isEditing, onToggle, keyboardType = 'default' }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.modalLabel}>{label}</Text>
    <View style={[styles.inputContainer, isEditing && styles.inputContainerActive]}>
      <TextInput
        style={styles.modalInput}
        value={value}
        onChangeText={onChange}
        editable={isEditing}
        keyboardType={keyboardType}
      />
      <TouchableOpacity style={styles.editIcon} onPress={onToggle}>
        <Ionicons
          name={isEditing ? "checkmark" : "pencil"}
          size={18}
          color="#000"
        />
      </TouchableOpacity>
    </View>
  </View>
);

const DashboardContent = ({ route, navigation }) => {
  const { start, canStart, stop, isActive, scrollViewRef } = useTutorial();
  const { isMuted, toggleMute } = useContext(BackgroundMusicContext);
  const tutorialHasStarted = useRef(false);
  const { userData, setUserData } = useUser();

  const [activeScreenTab, setActiveScreenTab] = useState("dashboard");
  const [musicPacks, setMusicPacks] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [downloadingPackId, setDownloadingPackId] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadedPacks, setDownloadedPacks] = useState([]);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [streaks, setStreaks] = useState(0);
  const [reports, setReports] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("recent");
  // Edit States
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFullName, setTempFullName] = useState(userData?.fullName || "");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState(userData?.username || "");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState(userData?.email || "");
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState(userData?.phoneNumber || "");
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [tempClass, setTempClass] = useState(userData?.class || "");
  const [timetableData, setTimetableData] = useState([]);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [tempTimetable, setTempTimetable] = useState([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeIndex, setActiveTimeIndex] = useState(-1);
  const [activeTimeType, setActiveTimeType] = useState('start'); // 'start' or 'end'
  const [pickerDate, setPickerDate] = useState(new Date());
  // --- DELETE MODAL STATE ---
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [packToDelete, setPackToDelete] = useState(null); // Stores the pack object
  const [partialStatus, setPartialStatus] = useState({});

  // Helper: Open picker for specific side (Start or End)
  const openTimePicker = (index, fullTimeString, type) => {
    setActiveTimeIndex(index);
    setActiveTimeType(type);

    // fullTimeString looks like "10:00 AM - 11:00 AM"
    const parts = fullTimeString.split(' - ');
    const timeToParse = type === 'start' ? parts[0] : (parts[1] || parts[0]);

    // Parse the time string into a Date object for the picker
    let date = new Date();
    const timeParts = timeToParse ? timeToParse.match(/(\d+):(\d+)\s*(AM|PM)/i) : null;

    if (timeParts) {
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const ampm = timeParts[3].toUpperCase();

      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      date.setHours(hours);
      date.setMinutes(minutes);
    } else {
      // Default fallback
      date.setMinutes(0);
      if (type === 'start') date.setHours(9);
      else date.setHours(10);
    }

    setPickerDate(date);
    setShowTimePicker(true);
  };

  // Helper: Handle the scroll/selection
  const onTimeChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }

    const currentDate = selectedDate || pickerDate;

    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (activeTimeIndex > -1) {
      // 1. Format the new time
      let hours = currentDate.getHours();
      const minutes = currentDate.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      const newTimeString = `${hours}:${minutesStr} ${ampm}`;

      // 2. Get the OLD range string and split it
      const currentRange = tempTimetable[activeTimeIndex].time; // "9:00 AM - 10:00 AM"
      const parts = currentRange.includes(' - ') ? currentRange.split(' - ') : [currentRange, "??"];

      // 3. Reconstruct the range
      let finalRange = "";
      if (activeTimeType === 'start') {
        finalRange = `${newTimeString} - ${parts[1] || '10:00 AM'}`;
      } else {
        finalRange = `${parts[0] || '9:00 AM'} - ${newTimeString}`;
      }

      // 4. Update State
      const newData = [...tempTimetable];
      newData[activeTimeIndex].time = finalRange;
      setTempTimetable(newData);
    }
  };

  const updateHomeWidget = async (streakCount, starCount) => {
    try {
      await requestWidgetUpdate({
        widgetName: 'StatsWidget',
        renderWidget: () => <StatsWidget streaks={streakCount} stars={starCount} />,
        widgetInfo: {
          minWidth: 320,
          minHeight: 100,
          targetCellWidth: 4,
          targetCellHeight: 1,
        }
      });
      console.log("📱 Widget Updated");
    } catch (error) {
      console.log("Widget Error (Ignore if in Expo Go):", error);
    }
  };

  // --- NOTIFICATIONS & WIDGET SETUP ---
  useEffect(() => {
    const setupServices = async () => {
      if (!userData) return;

      const hasPermission = await NotificationService.registerForPushNotifications();

      if (hasPermission) {
        await NotificationService.scheduleDynamicStreak(streaks, userData.stars || 0);
        await NotificationService.scheduleWeeklyClasses(subjects);
      }
      await updateHomeWidget(streaks, userData.stars);
    };

    setupServices();
  }, [userData, streaks, subjects]);

  // Tutorial startup logic
  useEffect(() => {
    const runTutorial = async () => {
      if (tutorialHasStarted.current) return;
      try {
        const hasSeenTutorial = await AsyncStorage.getItem('hasSeenDashboardTutorial');
        if (hasSeenTutorial !== 'true' && canStart && userData) {
          tutorialHasStarted.current = true;
          setTimeout(() => {
            start();
          }, 1000);
        }
      } catch (error) {
        console.log('❌ Tutorial setup error:', error);
      }
    };
    runTutorial();
  }, [canStart, userData, start]);

  // Save tutorial completion
  useEffect(() => {
    const handleTutorialComplete = async () => {
      if (!isActive && tutorialHasStarted.current) {
        await AsyncStorage.setItem('hasSeenDashboardTutorial', 'true');
        tutorialHasStarted.current = false;
      }
    };
    handleTutorialComplete();
  }, [isActive]);

  // Initial user data check
  useEffect(() => {
    if (!userData) {
      const data = route.params?.userData;
      if (data) {
        setUserData(data);
      } else {
        navigation.replace("Login");
      }
    }
  }, [userData, setUserData, route.params, navigation]);

  // Cache verification
  useEffect(() => {
    const verifyCache = async () => {
      if (userData?.localAvatar) {
        const info = await FileSystem.getInfoAsync(userData.localAvatar);
        if (!info.exists) {
          const newLocal = await cacheImage(userData.avatar, userData.username);
          const fixedUser = { ...userData, localAvatar: newLocal };
          setUserData(fixedUser);
          AsyncStorage.setItem("userData", JSON.stringify(fixedUser));
        }
      } else if (userData?.avatar && !userData?.localAvatar) {
        const newLocal = await cacheImage(userData.avatar, userData.username);
        const fixedUser = { ...userData, localAvatar: newLocal };
        setUserData(fixedUser);
        AsyncStorage.setItem("userData", JSON.stringify(fixedUser));
      }
    };

    if (userData) verifyCache();
  }, [userData]);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeScreenTab === "packages" && musicPacks.length === 0) {
      fetchMusicPackages();
    }
  }, [activeScreenTab, musicPacks.length]);

  useEffect(() => {
    if (userData?.class) {
      fetchSubjects();
      fetchLeaderboard();
    }
  }, [userData?.class]);

  useEffect(() => {
    if (userData?.username) {
      fetchReports();
    }
  }, [userData?.username]);

  useFocusEffect(
    useCallback(() => {
      const fetchStreaks = async () => {
        try {
          if (!userData) return;
          const id = userData?.username;
          const response = await axios.get(
            `https://homeedu.fsdgroup.com.ng/api/streaks?username=${id}`
          );
          setStreaks(response.data.streak_count);
        } catch (error) {
          console.error("Error fetching streaks:", error);
        }
      };
      fetchStreaks();
    }, [userData])
  );

  const checkExistingDownloads = async (packs) => {
    const loadedIds = [];
    const partials = {};

    for (const pack of packs) {
      const packFolder = `${FileSystem.documentDirectory}music_packs/${pack.id}/`;
      const dirInfo = await FileSystem.getInfoAsync(packFolder);

      if (!dirInfo.exists) {
        continue;
      }

      let foundCount = 0;
      const totalFiles = pack.files.length;

      for (const file of pack.files) {
        const safeName = getSafeFileName(file.name);
        const fileUri = packFolder + safeName;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
          foundCount++;
        }
      }

      if (foundCount === totalFiles) {
        loadedIds.push(pack.id);
      } else if (foundCount > 0) {
        partials[pack.id] = `${foundCount}/${totalFiles}`;
      } else {
        await FileSystem.deleteAsync(packFolder, { idempotent: true });
      }
    }

    setDownloadedPacks(loadedIds);
    setPartialStatus(partials);
  };

  const fetchMusicPackages = async () => {
    setLoadingPackages(true);
    try {
      const response = await fetch(`https://fsdgroup.com.ng/Edu/music/music.json?t=${new Date().getTime()}`);
      const json = await response.json();
      if (json.packs) {
        setMusicPacks(json.packs);
        checkExistingDownloads(json.packs);
      }
    } catch (error) {
      console.error("Error fetching music:", error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const downloadPack = async (pack) => {
    if (downloadingPackId) return;

    setDownloadingPackId(pack.id);
    setDownloadStatus("Checking...");

    try {
      const packFolder = `${FileSystem.documentDirectory}music_packs/${pack.id}/`;
      const dirInfo = await FileSystem.getInfoAsync(packFolder);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(packFolder, { intermediates: true });
      }

      let count = 0;
      const total = pack.files.length;

      for (const file of pack.files) {
        const safeName = getSafeFileName(file.name);
        const finalUri = packFolder + safeName;
        const fileInfo = await FileSystem.getInfoAsync(finalUri);
        if (fileInfo.exists) count++;
      }

      for (const file of pack.files) {
        const safeName = getSafeFileName(file.name);
        const finalUri = packFolder + safeName;
        const tempUri = finalUri + ".tmp";

        setDownloadStatus(`${count}/${total}`);

        const fileInfo = await FileSystem.getInfoAsync(finalUri);

        if (!fileInfo.exists) {
          const downloadRes = await FileSystem.downloadAsync(file.url, tempUri);

          if (downloadRes.status !== 200) {
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
            throw new Error(`Failed to download ${file.name}`);
          }

          await FileSystem.moveAsync({
            from: tempUri,
            to: finalUri
          });

          count++;
        }
      }

      setDownloadStatus("Done!");
      Alert.alert("Success!", "Pack downloaded complete.");

      setDownloadedPacks((prev) => [...prev, pack.id]);
      setPartialStatus((prev) => {
        const next = { ...prev };
        delete next[pack.id];
        return next;
      });

    } catch (error) {
      console.log("Download Interrupted:", error);
      Alert.alert("Download Paused", "Internet connection lost. Tap 'Resume' to continue.");
      checkExistingDownloads([pack]);

    } finally {
      setDownloadingPackId(null);
      setDownloadStatus("");
    }
  };

  const getSafeFileName = (name) => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".mp3";
  };

  const promptDelete = (pack) => {
    setPackToDelete(pack);
    setDeleteModalVisible(true);
  };

  const performDelete = async () => {
    if (!packToDelete) return;

    try {
      const packFolder = `${FileSystem.documentDirectory}music_packs/${packToDelete.id}/`;
      await FileSystem.deleteAsync(packFolder, { idempotent: true });
      setDownloadedPacks((prev) => prev.filter((id) => id !== packToDelete.id));
      setDeleteModalVisible(false);
      setPackToDelete(null);

    } catch (e) {
      console.error(e);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(
        "https://homeedu.fsdgroup.com.ng/api/getClassForUser"
      );
      const data = await response.json();
      if (data.status === 200) {
        setAvailableClasses(data.class);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.post(
        "https://homeedu.fsdgroup.com.ng/api/subjects",
        { class: userData?.class }
      );
      if (response.data.status === 200) {
        setSubjects(response.data.data);
      } else {
        setSubjects([]);
        setError("No subjects found.");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setSubjects([]);
      } else {
        setError("An error occurred while fetching subjects.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setError(null);
      const response = await axios.get(
        `https://homeedu.fsdgroup.com.ng/api/report/${userData?.username}`
      );

      if (response.data.status === 200) {
        const roundedReports = response.data.data.map((report) => ({
          ...report,
          Score: Number(parseFloat(report.Score).toFixed(2)),
          subtopic_name: truncateText(report.subtopic_name),
          exam_name: truncateText(report.exam_name),
        }));
        setReports(roundedReports);
      } else {
        setReports([]);
        setError("No reports found.");
      }
    } catch (err) {
      if (!err.response) {
        setError("No Internet Connection ⚠️");
      } else if (err.response?.status === 404) {
        setReports([]);
      } else {
        setError("Unable to load reports.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const formData = new FormData();
      formData.append("class", userData?.class);

      const response = await fetch(
        `https://homeedu.fsdgroup.com.ng/api/getleaderboard/${userData?.username}`,
        { method: "POST", body: formData }
      );

      const json = await response.json();
      if (json.status === 200) {
        setLeaderboard(json.data);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const truncateText = (text, max = 18) => {
    if (!text) return null;
    return text.length > max ? text.substring(0, max) + "..." : text;
  };

  const generateClassTimes = () => {
    const currentDay = new Date().getDay();
    const isWeekend = currentDay === 0 || currentDay === 6;
    if (isWeekend) {
      return ["10:00 AM - 11:00 AM", "2:00 PM - 3:00 PM", "7:00 PM - 8:00 PM"];
    } else {
      return ["3:30 PM - 4:30 PM", "6:00 PM - 7:00 PM", "8:00 PM - 9:00 PM"];
    }
  };

  const toggleEditName = async () => {
    if (isEditingName) {
      try {
        const formData = new FormData();
        formData.append("fullname", tempFullName);
        formData.append("username", userData?.username);
        const response = await fetch(
          "https://homeedu.fsdgroup.com.ng/api/editname",
          { method: "POST", body: formData }
        );
        if (response.status === 200) {
          const updatedUser = { ...userData, fullName: tempFullName };
          setUserData(updatedUser);
          await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
          setIsEditingName(false);
          Alert.alert("Success", "Name updated successfully!");
        } else {
          Alert.alert("Error", "Failed to update name");
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Error saving name");
      }
    } else {
      setIsEditingName(true);
    }
  };

  const saveUsername = async () => {
    const formData = new FormData();
    formData.append("old_username", userData?.username);
    formData.append("new_username", tempUsername);
    try {
      const response = await fetch(
        "https://homeedu.fsdgroup.com.ng/api/editusername",
        { method: "POST", body: formData }
      );
      const data = await response.json();
      if (response.ok && data.status === 200) {
        const updatedUser = { ...userData, username: tempUsername };
        setUserData(updatedUser);
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        setIsEditingUsername(false);
        Alert.alert("Success", "Username updated successfully!");
      } else if (data.status === 101) {
        Alert.alert("Error", "Username already taken.");
      } else {
        Alert.alert("Error", "Failed: " + (data.message || ""));
      }
    } catch (error) {
      Alert.alert("Error", "Network error.");
    }
  };

  const saveEmail = async () => {
    const formData = new FormData();
    formData.append("username", userData?.username);
    formData.append("email", tempEmail);
    try {
      const response = await fetch(
        "https://homeedu.fsdgroup.com.ng/api/editemail",
        { method: "POST", body: formData }
      );
      if (response.ok) {
        const updatedUser = { ...userData, email: tempEmail };
        setUserData(updatedUser);
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        setIsEditingEmail(false);
        Alert.alert("Success", "Email updated successfully!");
      } else if (response.status === 101) {
        Alert.alert("Error", "Email already in use.");
      } else {
        Alert.alert("Error", "Failed to update email");
      }
    } catch (error) {
      Alert.alert("Error", "Error updating email");
    }
  };

  const savePhone = async () => {
    const formData = new FormData();
    formData.append("username", userData?.username);
    formData.append("phone", tempPhone);
    try {
      const response = await fetch(
        "https://homeedu.fsdgroup.com.ng/api/editphone",
        { method: "POST", body: formData }
      );
      if (response.ok) {
        const updatedUser = { ...userData, phoneNumber: tempPhone };
        setUserData(updatedUser);
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        setIsEditingPhone(false);
        Alert.alert("Success", "Phone number updated successfully!");
      } else {
        Alert.alert("Error", "Failed to update phone number");
      }
    } catch (error) {
      Alert.alert("Error", "Error updating phone number");
    }
  };

  const saveClass = async () => {
    const formData = new FormData();
    formData.append("username", userData?.username);
    formData.append("class", tempClass);
    try {
      const response = await fetch(
        "https://homeedu.fsdgroup.com.ng/api/editclass",
        { method: "POST", body: formData }
      );
      if (response.ok) {
        const updatedUser = { ...userData, class: tempClass };
        setUserData(updatedUser);
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
        setIsEditingClass(false);
        Alert.alert("Success", "Class updated successfully!");
      } else {
        Alert.alert("Error", "Failed to update class");
      }
    } catch (error) {
      Alert.alert("Error", "Error updating class");
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access gallery is required!");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "Images",
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open gallery.");
    }
  };

  const uploadProfileImage = async (image) => {
    if (!userData?.username || !image || !image.uri) {
      Alert.alert("Error", "Missing username or image data.");
      return;
    }
    setIsUploadingImage(true);
    setUploadProgress(0);
    const cleanUri = Platform.OS === "ios" ? image.uri.replace("file://", "") : image.uri;
    const fileName = image.uri.split("/").pop();
    const fileType = fileName.endsWith(".png") ? "image/png" : "image/jpeg";
    const formData = new FormData();
    formData.append("username", userData?.username);
    formData.append("profile_image", {
      uri: cleanUri,
      name: fileName,
      type: fileType,
    });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://homeedu.fsdgroup.com.ng/api/EditProfileImage");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        let percent = Math.round((event.loaded / event.total) * 100);
        if (percent > 100) percent = 100;
        setUploadProgress(percent);
      }
    };
    xhr.onload = async () => {
      try {
        const responseData = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && responseData.status === 200) {
          const baseUrl = "https://homeedu.fsdgroup.com.ng/storage/";
          const remoteUrl = baseUrl + responseData.profile_image;
          const localUri = await cacheImage(remoteUrl, userData?.username);
          const updatedUser = {
            ...userData,
            avatar: remoteUrl,
            localAvatar: localUri
          };
          setUserData(updatedUser);
          await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
          Alert.alert("Success", "Profile Image Updated!");
        } else {
          Alert.alert("Error", "Upload Failed: " + (responseData.message || "Server Error"));
        }
      } catch (e) {
        Alert.alert("Error", "Server returned an invalid response.");
      } finally {
        setIsUploadingImage(false);
        setUploadProgress(0);
      }
    };
    xhr.onerror = (e) => {
      Alert.alert("Error", "Network Error: Could not upload image.");
      setIsUploadingImage(false);
      setUploadProgress(0);
    };
    xhr.send(formData);
  };

  const cacheImage = async (remoteUri, username) => {
    if (!remoteUri) return null;
    try {
      const fileName = remoteUri.split('/').pop().split('?')[0];
      const localPath = `${FileSystem.documentDirectory}${username}_${fileName}`;
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        return localPath;
      }
      const downloadRes = await FileSystem.downloadAsync(remoteUri, localPath);
      return downloadRes.uri;
    } catch (error) {
      return remoteUri;
    }
  };

  const fetchRefreshedUser = async () => {
    try {
      setRefreshing(true);
      fetchLeaderboard();
      fetchReports();
      fetchSubjects();
      const response = await fetch("https://homeedu.fsdgroup.com.ng/api/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: userData?.username }),
      });
      const result = await response.json();
      if (response.ok && result.status === 200) {
        const remoteUrl = result.user.userData?.avatar;
        const localUri = await cacheImage(remoteUrl, userData?.username);
        const updatedUser = {
          ...userData,
          ...result.user.userData,
          avatar: remoteUrl,
          localAvatar: localUri,
        };
        setUserData(updatedUser);
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error("Refresh Error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userData");
      setUserData(null);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (error) {
      Alert.alert("Error", "Error logging out.");
    }
  };

  const sections = useMemo(() => [
    { type: "info", id: 1, text: "This is your profile section. Tap here to view and edit your details!", name: "Profile" },
    { type: "streaks", id: 2, text: "Keep your learning streak alive! Practice daily to grow this number.", name: "Streaks" },
    { type: "reports", id: 3, text: "Track your progress here. See how well you performed in recent exams.", name: "Reports" },
    { type: "timetable", id: 4, text: "Check your daily schedule here so you never miss a class.", name: "Timetable" },
    { type: "leaderboard", id: 5, text: "See where you stand! Compete with classmates for the top spot.", name: "Leaderboard" },
    { type: "subjects", id: 6, text: "Ready to start learning? Tap here to pick a subject and take a quiz.", name: "Subjects" },
  ], []);

  // ✅ MOVED THESE UP BEFORE THE `if (!userData)` CHECK
  useEffect(() => {
    const loadTimetable = async () => {
      try {
        const saved = await AsyncStorage.getItem('customTimetable');
        const classTimes = generateClassTimes();

        if (saved) {
          setTimetableData(JSON.parse(saved));
        } else if (subjects && subjects.length > 0) {
          const defaultData = subjects.slice(0, 3).map((sub, index) => ({
            time: classTimes[index] || "00:00",
            subject: sub.Subject
          }));
          setTimetableData(defaultData);
        } else {
          const emptyData = classTimes.map(time => ({ time, subject: "Free Period" }));
          setTimetableData(emptyData);
        }
      } catch (e) {
        console.error("Error loading timetable", e);
      }
    };

    loadTimetable();
  }, [subjects]);

  const openTimetableEditor = () => {
    setTempTimetable(JSON.parse(JSON.stringify(timetableData)));
    setIsEditingTimetable(true);
  };

  const handleTimetableChange = (text, index) => {
    const newData = [...tempTimetable];
    newData[index].subject = text;
    setTempTimetable(newData);
  };

  const saveTimetable = async () => {
    try {
      setTimetableData(tempTimetable);
      await AsyncStorage.setItem('customTimetable', JSON.stringify(tempTimetable));
      setIsEditingTimetable(false);
      Alert.alert("Success", "Timetable updated!");
    } catch (e) {
      Alert.alert("Error", "Could not save timetable.");
    }
  };

  const resetTimetable = async () => {
    try {
      await AsyncStorage.removeItem('customTimetable');
      const classTimes = generateClassTimes();
      const defaultData = subjects.slice(0, 3).map((sub, index) => ({
        time: classTimes[index],
        subject: sub.Subject
      }));
      setTimetableData(defaultData);
      setIsEditingTimetable(false);
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ CHECK IS NOW AT THE BOTTOM
  if (!userData) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  const renderSectionContent = (item) => {
    switch (item.type) {
      case "info":
        return (
          <TouchableOpacity
            style={styles.infoContainer}
            onPress={() => setShowProfileModal(true)}
          >
            <View style={styles.leftInfo}>
              <Text style={styles.hello}> Hello </Text>
              <Text style={styles.infoUsername}> {userData?.username}</Text>
            </View>
            <Image
              source={{ uri: userData?.localAvatar || userData?.avatar }}
              style={styles.infoAvatar}
            />
          </TouchableOpacity>
        );

      case "streaks":
        return (
          <View style={styles.streaksContainer}>
            <Text style={styles.streaksTitle}>Streaks</Text>
            <Text style={styles.streaksCount}>{streaks} 📚</Text>
          </View>
        );

      case "reports":
        return (
          <View style={styles.reportsContainer}>
            <Text style={styles.title}>Reports</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#864AF9" />
            ) : error ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 30 }}>📶</Text>
                <Text style={{ color: 'red', fontWeight: 'bold', textAlign: 'center', marginTop: 10 }}>
                  {error}
                </Text>
                <TouchableOpacity onPress={fetchReports} style={{ marginTop: 10, padding: 8, backgroundColor: '#eee', borderRadius: 8 }}>
                  <Text>Tap to Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {reports.slice(0, 2).map((report, index) => (
                  <View key={index} style={styles.reportItem}>
                    <Text style={styles.reportTitle}>
                      {report.exam_name || report.subtopic_name || "Exam"}
                    </Text>
                    <Text style={styles.reportScore}>Score: {report.Score}%</Text>
                  </View>
                ))}

                {reports.length > 0 && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => setModalVisible(true)}
                  >
                    <Text style={styles.seeMoreButtonText}>See More</Text>
                  </TouchableOpacity>
                )}

                {reports.length === 0 && !error && (
                  <Text style={styles.noTimetableData}>No reports yet.</Text>
                )}
              </>
            )}
          </View>
        );
      case "timetable":
        return (
          <View style={styles.timetableContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.timetableTitle}>Today's Timetable</Text>
              <TouchableOpacity onPress={openTimetableEditor} style={styles.editIconBtn}>
                <Ionicons name="pencil" size={20} color="#000" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color="#864AF9" style={{ marginVertical: 20 }} />
            ) : timetableData.length > 0 ? (
              timetableData.map((item, index) => (
                <View key={index} style={styles.timetableItem}>
                  <View style={styles.timeStrip}>
                    <Text style={styles.subjectTime}>{item.time.split(' ')[0]}</Text>
                    <Text style={styles.subjectAmPm}>{item.time.split(' ')[1]}</Text>
                  </View>
                  <View style={styles.subjectContent}>
                    <Text style={styles.subjectName}>{item.subject}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noTimetableData}>No schedule available</Text>
            )}

            <Modal
              visible={isEditingTimetable}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setIsEditingTimetable(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Schedule ✏️</Text>
                  <Text style={{ color: '#666', marginBottom: 15, fontSize: 12 }}>
                    Tap the time box to scroll to a time.
                  </Text>

                  <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                    {tempTimetable.map((item, index) => {
                      const parts = item.time.includes(' - ')
                        ? item.time.split(' - ')
                        : [item.time, "12:00 PM"];

                      return (
                        <View key={index} style={styles.editorRow}>
                          <Text style={styles.rowLabel}>Period {index + 1}</Text>

                          <View style={styles.timeRangeContainer}>
                            <TouchableOpacity
                              style={styles.timeBox}
                              onPress={() => openTimePicker(index, item.time, 'start')}
                            >
                              <Text style={styles.timeLabel}>FROM</Text>
                              <Text style={styles.timeValue}>{parts[0]}</Text>
                            </TouchableOpacity>

                            <Ionicons name="arrow-forward" size={16} color="#bbb" />

                            <TouchableOpacity
                              style={styles.timeBox}
                              onPress={() => openTimePicker(index, item.time, 'end')}
                            >
                              <Text style={styles.timeLabel}>TO</Text>
                              <Text style={styles.timeValue}>{parts[1]}</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.pickerWrapper}>
                            <Picker
                              selectedValue={item.subject}
                              onValueChange={(itemValue) => handleTimetableChange(itemValue, index)}
                              style={styles.picker}
                              dropdownIconColor="#000"
                            >
                              <Picker.Item label="Free Period" value="Free Period" color="#999" />
                              {subjects.map((sub, subIndex) => (
                                <Picker.Item
                                  key={subIndex}
                                  label={sub.Subject}
                                  value={sub.Subject}
                                  color="#000"
                                />
                              ))}
                            </Picker>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {showTimePicker && (
                    <DateTimePicker
                      testID="dateTimePicker"
                      value={pickerDate}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={onTimeChange}
                    />
                  )}

                  {Platform.OS === 'ios' && showTimePicker && (
                    <TouchableOpacity
                      style={styles.closePickerBtn}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.resetBtn]}
                      onPress={resetTimetable}
                    >
                      <Text style={styles.resetBtnText}>RESET</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.saveBtn]}
                      onPress={saveTimetable}
                    >
                      <Text style={styles.saveBtnText}>SAVE</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.closeModalBtn}
                    onPress={() => setIsEditingTimetable(false)}
                  >
                    <Text style={styles.closeModalText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        );


      case "leaderboard":
        return (
          <View style={styles.leaderboardContainer}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            {leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => (
                <View key={index} style={styles.leaderboardItem}>
                  <Text style={styles.leaderboardRank}>{entry.real_rank}</Text>
                  <Text style={styles.leaderboardName}>
                    {entry.username === userData?.username ? "You" : entry.username}
                  </Text>
                  <Text style={styles.leaderboardScore}>{entry.stars} ⭐</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noLeaderboardData}>No data available</Text>
            )}
          </View>
        );

      case "subjects":
        return (
          <>
            <View style={styles.subjectsContainer}>
              <Text style={styles.subjectsTitle}>Explore Subjects</Text>
              <Text style={styles.subjectsDescription}>
                Dive into your courses and learn at your pace!
              </Text>
              <TouchableOpacity
                style={styles.subjectsButton}
                onPress={() => navigation.navigate("Subject")}
              >
                <Text style={styles.subjectsButtonText}>View All Subjects</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subjectsButton, { marginTop: 16 }]}
                onPress={() => navigation.navigate("Novel")}
              >
                <Text style={styles.subjectsButtonText}>Read your Novels</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity
                style={[styles.subjectsButton, { marginTop: 16 }]}
                onPress={() => navigation.navigate("Test")}
              >
                <Text style={styles.subjectsButtonText}>Web</Text>
              </TouchableOpacity> */}
            </View>
          </>
        );
      default:
        return null;
    }
  };

  const renderPackages = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.packagesScroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadingPackages}
            onRefresh={fetchMusicPackages}
            tintColor="#864AF9"
            colors={["#864AF9"]}
          />
        }
      >
        <View style={[styles.headerContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.SoundTitle}>Sound Store 🎧</Text>
            <Text style={styles.SoundDescription}>
              Lo-Fi & White Noise for deep focus.
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleMute}
            style={{
              padding: 10,
              backgroundColor: isMuted ? '#FF6B6B' : '#864AF9',
              borderRadius: 20,
              marginLeft: 10
            }}
          >
            <Text style={{ fontSize: 18 }}>{isMuted ? "🔇" : "🔊"}</Text>
          </TouchableOpacity>
        </View>

        {loadingPackages && musicPacks.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#864AF9" />
            <Text style={styles.loadingText}>Fetching sounds...</Text>
          </View>
        ) : (
          <View style={styles.packageGrid}>
            {musicPacks.map((pack) => {
              const isDownloading = downloadingPackId === pack.id;
              const isDownloaded = downloadedPacks.includes(pack.id);
              const partialText = partialStatus[pack.id];
              return (
                <View
                  key={pack.id}
                  style={[
                    styles.packageCard,
                    { backgroundColor: pack.tagColor || '#FFFFFF' }
                  ]}
                >
                  <View>
                    <Text style={styles.packageTitle}>{pack.title}</Text>
                    <Text style={styles.packageDesc}>{pack.description}</Text>
                    <View style={styles.infoBadge}>
                      <Text style={styles.infoBadgeText}>
                        🎵 {pack.files.length} Tracks
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dashedDivider} />

                  <View style={styles.packageFooter}>

                    {isDownloaded && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => promptDelete(pack)}
                      >
                        <Text style={{ fontSize: 20 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.downloadFullBtn,
                        isDownloading && styles.downloadingBtn,
                        isDownloaded && styles.downloadedBtn,
                      ]}
                      onPress={() => !isDownloaded && downloadPack(pack)}
                      disabled={isDownloading || isDownloaded}
                      activeOpacity={0.8}
                    >
                      {isDownloading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
                          <Text style={styles.downloadBtnText} numberOfLines={1}>
                            {downloadStatus}
                          </Text>
                        </View>
                      ) : isDownloaded ? (
                        <Text style={[styles.downloadBtnText, { color: '#004d00' }]} numberOfLines={1}>
                          INSTALLED ✅
                        </Text>
                      ) : partialText ? (
                        <Text style={[styles.downloadBtnText, { color: '#D97706' }]} numberOfLines={1}>
                          RESUME ({partialText}) 📥
                        </Text>
                      ) : (
                        <Text style={styles.downloadBtnText} numberOfLines={1}>
                          DOWNLOAD PACK 📥
                        </Text>
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
  return (
    <View style={styles.mainWrapper}>
      <View style={styles.topTabContainer}>
        <TouchableOpacity
          style={[styles.topTab, activeScreenTab === "dashboard" && styles.activeTopTab]}
          onPress={() => setActiveScreenTab("dashboard")}
        >
          <Text style={[styles.topTabText, activeScreenTab === "dashboard" && styles.activeTopTabText]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTab, activeScreenTab === "packages" && styles.activeTopTab]}
          onPress={() => setActiveScreenTab("packages")}
        >
          <Text style={[styles.topTabText, activeScreenTab === "packages" && styles.activeTopTabText]}>
            Packages 📦
          </Text>
        </TouchableOpacity>
      </View>

      {activeScreenTab === "dashboard" ? (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchRefreshedUser}
              tintColor="#864AF9"
              colors={["#864AF9"]}
            />
          }
        >
          {sections.map((section) => (
            <TutorialStep key={section.type} stepId={section.id}>
              {renderSectionContent(section)}
            </TutorialStep>
          ))}
        </ScrollView>
      ) : (
        renderPackages()
      )}

      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Your Profile</Text>

              <TouchableOpacity onPress={pickImage} disabled={isUploadingImage} style={{ marginBottom: 20 }}>
                <View>
                  <Image
                    source={{ uri: userData?.localAvatar || userData?.avatar }}
                    style={[
                      styles.modalAvatar,
                      { opacity: isUploadingImage ? 0.5 : 1 },
                    ]}
                  />
                  <View style={styles.avatarBadge}>
                    <Ionicons name="camera" size={16} color="#FFF" />
                  </View>

                  {isUploadingImage && (
                    <View style={styles.uploadOverlay}>
                      <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>
                        {uploadProgress}%
                      </Text>
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginTop: 4 }} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={{ width: '100%', gap: 16 }}>
                <InputField
                  label="Full Name:"
                  value={tempFullName}
                  onChange={setTempFullName}
                  isEditing={isEditingName}
                  onToggle={toggleEditName}
                />
                <InputField
                  label="Username:"
                  value={tempUsername}
                  onChange={setTempUsername}
                  isEditing={isEditingUsername}
                  onToggle={() => isEditingUsername ? saveUsername() : setIsEditingUsername(true)}
                />
                <InputField
                  label="Email:"
                  value={tempEmail}
                  onChange={setTempEmail}
                  isEditing={isEditingEmail}
                  onToggle={() => isEditingEmail ? saveEmail() : setIsEditingEmail(true)}
                />
                <InputField
                  label="Phone:"
                  value={tempPhone}
                  onChange={setTempPhone}
                  isEditing={isEditingPhone}
                  onToggle={() => isEditingPhone ? savePhone() : setIsEditingPhone(true)}
                  keyboardType="phone-pad"
                />

                <View style={styles.inputGroup}>
                  <Text style={styles.modalLabel}>Class:</Text>
                  <View style={styles.inputContainer}>
                    {isEditingClass ? (
                      <Picker
                        selectedValue={tempClass}
                        style={styles.modalInput}
                        onValueChange={(itemValue) => setTempClass(itemValue)}
                      >
                        <Picker.Item label="Select a class" value="" />
                        {availableClasses.map((classItem) => (
                          <Picker.Item
                            key={classItem.id}
                            label={classItem.ClassName}
                            value={classItem.ClassName}
                          />
                        ))}
                      </Picker>
                    ) : (
                      <TextInput
                        style={styles.modalInput}
                        value={tempClass}
                        editable={false}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.editIcon}
                      onPress={() => isEditingClass ? saveClass() : setIsEditingClass(true)}
                    >
                      <Ionicons
                        name={isEditingClass ? "checkmark" : "pencil"}
                        size={18}
                        color="#000"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutText}>LOGOUT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowProfileModal(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>CLOSE</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>All Reports</Text>

            <View style={styles.tabContainer}>
              {["recent", "best", "worst"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab === "recent" ? "Recent" : tab === "best" ? "Top" : "Low"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={
                activeTab === "recent"
                  ? reports.slice(0, 20)
                  : activeTab === "best"
                    ? [...reports].sort((a, b) => b.Score - a.Score).slice(0, 20)
                    : [...reports].sort((a, b) => a.Score - b.Score).slice(0, 20)
              }
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.modalReportItem}>
                  <Text style={styles.modalReportTitle}>
                    {item.exam_name || item.subtopic_name || "Exam"}
                  </Text>
                  <Text style={styles.modalReportScore}>{item.Score}%</Text>
                </View>
              )}
              style={styles.modalReportList}
            />

            <TouchableOpacity
              style={styles.cancelReportBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelReportText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.trashIconContainer}>
              <Text style={{ fontSize: 40 }}>🗑️</Text>
            </View>

            <Text style={styles.modalTitle}>Delete Sound Pack?</Text>

            <Text style={styles.modalMessage}>
              Are you sure you want to remove
              <Text style={{ fontWeight: 'bold', color: '#000' }}> "{packToDelete?.title}"</Text>?
              {"\n"}You can download it again later.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalBtnTextBlack}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDestructive]}
                onPress={performDelete}
              >
                <Text style={styles.modalBtnTextRed}>YES, DELETE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};
const DashboardScreen = (props) => {
  const tutorialSteps = [
    { id: 1, text: "This is your profile section. Tap here to view and edit your details!", name: "Profile" },
    { id: 2, text: "Keep your learning streak alive! Practice daily to grow this number.", name: "Streaks" },
    { id: 3, text: "Track your progress here. See how well you performed in recent exams.", name: "Reports" },
    { id: 4, text: "Check your daily schedule here so you never miss a class.", name: "Timetable" },
    { id: 5, text: "See where you stand! Compete with classmates for the top spot.", name: "Leaderboard" },
    { id: 6, text: "Ready to start learning? Tap here to pick a subject and take a quiz.", name: "Subjects" },
  ];

  return (
    <TutorialProvider steps={tutorialSteps}>
      <DashboardContent {...props} />
    </TutorialProvider>
  );
};

const COLORS = {
  primary: "#864AF9",
  background: "#F8F9FE",
  cardBg: "#FFFFFF",
  itemBg: "#F7F9FC",
  textDark: "#2D3748",
  textLight: "#718096",
  textWhite: "#FFFFFF",
  black: "#000000",
  success: "#C6F6D5",
  successText: "#065F46", // Dark green for contrast
  border: "#000000",
};

// 2. DEFINE SHARED STYLES (NEO-BRUTALIST SHADOWS)
const sharedStyles = {
  hardShadow: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4, // Android hard shadow approximation
  },
  cardBase: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 2, // Consistent border thickness
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 20,
  },
};

const styles = StyleSheet.create({
  // --- LAYOUT ---
  container: {
    backgroundColor: COLORS.background,
    padding: 16,
    paddingBottom: 100, // Space for scrolling
  },
  mainWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    marginBottom: 25,
  },

  // --- TOP TABS ---
  topTabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.cardBg,
    padding: 6,
    margin: 16,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: COLORS.border,
    ...sharedStyles.hardShadow,
  },
  topTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeTopTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.border,
  },
  topTabText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textLight,
  },
  activeTopTabText: {
    color: COLORS.textWhite,
    fontWeight: "900",
  },

  // --- INFO / PROFILE CARD ---
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    ...sharedStyles.hardShadow,
  },
  leftInfo: {
    flex: 1,
  },
  hello: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoUsername: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textWhite,
    letterSpacing: 0.3,
  },
  infoAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.textWhite,
  },

  // --- STANDARD CARDS (Streaks, Reports, Timetable, Leaderboard) ---
  streaksContainer: {
    ...sharedStyles.cardBase,
    alignItems: "center",
    padding: 28,
    ...sharedStyles.hardShadow,
  },
  reportsContainer: {
    ...sharedStyles.cardBase,
    ...sharedStyles.hardShadow,
  },
  // --- TIMETABLE CONTAINER ---
  timetableContainer: {
    ...sharedStyles.cardBase, // Inherits white bg, border, radius, padding
    ...sharedStyles.hardShadow, // Inherits the pop-out shadow
    padding: 0, // Reset padding because we want the items to flush nicely
    overflow: 'hidden', // Keeps child borders tidy
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20, // Add padding back for the header
    paddingBottom: 10,
  },
  timetableTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editIconBtn: {
    padding: 8,
    backgroundColor: '#F0E6FF', // Keep a light accent or use COLORS.itemBg
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },

  // --- TIMETABLE LIST ITEMS ---
  timetableItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.itemBg,
    marginHorizontal: 20, // Indent inside the container
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  timeStrip: {
    backgroundColor: COLORS.primary,
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 2,
    borderRightColor: COLORS.border,
  },
  subjectContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.itemBg,
  },
  subjectTime: {
    color: COLORS.textWhite,
    fontWeight: '800',
    fontSize: 14,
  },
  subjectAmPm: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  noTimetableData: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontStyle: 'italic',
    padding: 20,
    paddingBottom: 30,
  },

  // --- EDITOR MODAL STYLES ---
  editorRow: {
    marginBottom: 16,
  },
  editorTimeLabel: {
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
    fontSize: 14,
  },
  pickerWrapper: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    color: COLORS.textDark,
    backgroundColor: COLORS.cardBg,
  },

  // --- ACTION BUTTONS ---
  buttonRow: {
    flexDirection: "row",
    alignItems: "center", // ✅ Ensures they align vertically
    gap: 12,
    marginTop: 32,
    width: "100%",        // ✅ Ensures the row fills the modal width
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    // Subtle shadow for buttons
    shadowColor: COLORS.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  resetBtn: {
    backgroundColor: '#FFE5E5',
  },
  resetBtnText: {
    color: '#D00000',
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
  },
  saveBtnText: {
    color: COLORS.textWhite,
    fontWeight: '800',
  },
  closeModalBtn: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 10,
  },
  closeModalText: {
    color: COLORS.textLight,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  leaderboardContainer: {
    ...sharedStyles.cardBase,
    ...sharedStyles.hardShadow,
  },

  // --- CARD HEADERS & TITLES ---
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 16,
  },
  streaksTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  streaksCount: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.textDark,
    letterSpacing: 1,
  },
  timetableTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 16,
  },

  // --- LIST ITEMS ---
  reportItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.itemBg,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    // Accent Border
    borderLeftWidth: 6,
    borderLeftColor: COLORS.primary,
  },
  reportTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: "700",
    flex: 3,
  },
  reportScore: {
    fontSize: 16,
    color: COLORS.primary,
    flex: 1,
    textAlign: "right",
    fontWeight: "800",
  },
  // timetableItem: {
  //   backgroundColor: COLORS.itemBg,
  //   padding: 16,
  //   marginBottom: 12,
  //   borderRadius: 12,
  //   borderWidth: 2,
  //   borderColor: COLORS.border,
  //   borderLeftWidth: 6,
  //   borderLeftColor: COLORS.primary,
  // },
  // subjectName: {
  //   fontSize: 17,
  //   fontWeight: "800",
  //   color: COLORS.textDark,
  //   marginBottom: 6,
  // },
  // subjectTime: {
  //   fontSize: 14,
  //   color: COLORS.textLight,
  //   fontWeight: "600",
  // },
  leaderboardItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.itemBg,
    padding: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderLeftWidth: 6,
    borderLeftColor: "#FFD700", // Gold
  },
  leaderboardRank: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.primary,
    width: 40,
    textAlign: "center",
  },
  leaderboardName: {
    flex: 2,
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: "700",
    marginLeft: 12,
  },
  leaderboardScore: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  // --- BUTTONS ---
  seeMoreButton: {
    marginTop: 12,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    ...sharedStyles.hardShadow,
  },
  seeMoreButtonText: {
    color: COLORS.textWhite,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  downloadingBtn: {
    backgroundColor: "#E2E8F0",
    transform: [{ translateX: 2 }, { translateY: 2 }],
    shadowOffset: { width: 0, height: 0 }, // Pressed effect
  },
  downloadedBtn: {
    backgroundColor: COLORS.success,
  },
  downloadBtnText: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // --- SUBJECTS & PACKAGES ---
  subjectsContainer: {
    backgroundColor: COLORS.primary,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.border,
    ...sharedStyles.hardShadow,
  },
  subjectsTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.textWhite, // Fixed to white for contrast on purple
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subjectsDescription: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  subjectsButton: {
    backgroundColor: COLORS.cardBg,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  subjectsButtonText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  packagesScroll: {
    padding: 20,
    paddingTop: 10,
  },
  packageCard: {
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
    justifyContent: "space-between",
    borderWidth: 3,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: COLORS.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  packageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.black,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  packageDesc: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    marginBottom: 12,
  },
  infoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoBadgeText: {
    fontWeight: "800",
    fontSize: 12,
    color: COLORS.black,
  },
  dashedDivider: {
    height: 1,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 1,
    marginBottom: 15,
    opacity: 0.5,
  },
  packageFooter: {
    width: "100%",
    marginTop: "auto",
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "stretch", // Ensures height match
    gap: 12, // Handles spacing between buttons
  },

  // The Square Trash Button
  deleteBtn: {
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
    aspectRatio: 1, // Keeps it square
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },

  downloadFullBtn: {
    flex: 1, // ✅ THE FIX: Always fill available space (100% if alone, Remainder if neighbor exists)
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 8, // Reduced slightly to prevent text cutoff on small screens
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cardCorner: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    backgroundColor: COLORS.black,
    transform: [{ rotate: "45deg" }],
    opacity: 0.1,
  },

  // --- EMPTY STATES ---
  noTimetableData: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
    fontStyle: "italic",
  },
  noLeaderboardData: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "600",
    fontStyle: "italic",
  },
  reportList: {
    marginBottom: 8,
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontWeight: "700",
  },

  // --- MODAL ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Darker backdrop for focus
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 24,
    width: width * 0.9,
    maxWidth: 400,
    borderWidth: 3,        // Thick border
    borderColor: '#000',   // Pitch black
    // Hard Shadow (Neo-Brutalist)
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginBottom: 24,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#000",
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#864AF9',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  uploadOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 50,
  },
  // INPUT STYLES
  inputGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F9FC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#000", // Visible borders
  },
  inputContainerActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#864AF9", // Highlight when editing
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
    fontWeight: "600",
  },
  editIcon: {
    padding: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#000',
  },
  // BUTTONS
  logoutBtn: {
    flex: 1,              // ✅ Both buttons take 50% width
    backgroundColor: "#FF4757",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
    // Hard Shadow
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },

  cancelBtn: {
    flex: 1,              // ✅ Both buttons take 50% width
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  cancelReportBtn: {
    // flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center", // ✅ Vital for centering text vertically
    borderWidth: 2,
    borderColor: "#000",
    marginTop: 10, // Add some spacing from the list
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  cancelText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  cancelReportText:{
    color: "#000",
    fontWeight: "900",
    fontSize: 16, // Increased slightly for readability
    textTransform: "uppercase",
  },
  SoundTitle: {
    fontSize: 32, // Big and bold
    fontWeight: "900",
    color: "#864AF9", // Primary Purple
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: "uppercase", // Neo-brutalist style
  },
  SoundDescription: {
    fontSize: 16,
    color: "#2D3748", // Dark Grey for readability
    fontWeight: "600",
    marginBottom: 10,
    lineHeight: 22,
  },
  // --- FILTER TABS ---
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: COLORS.itemBg,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 2,
    borderColor: "transparent", // Invisible border by default prevents layout jump
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.border, // Border appears when active
    // Active Tab Shadow
    shadowColor: COLORS.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  activeTabText: {
    color: COLORS.textWhite,
    fontWeight: "900",
  },

  // --- REPORT LIST ---
  modalReportList: {
    marginTop: 8,
    marginBottom: 20,
    maxHeight: 400,
  },
  modalReportItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.itemBg,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    // Accent Border on Left
    borderLeftWidth: 6,
    borderLeftColor: COLORS.primary,
  },
  modalReportTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
    flex: 1,
    marginRight: 10,
  },
  modalReportScore: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "900",
  },
  rowLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '700',
    marginBottom: 5,
    textTransform: 'uppercase'
  },
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    width: '42%', // Fits two boxes nicely
    alignItems: 'center'
  },
  timeLabel: {
    fontSize: 10,
    color: '#A0AEC0',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#864AF9', // Main brand color
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 3,
    borderColor: "#000",
    // Hard Shadow
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    alignItems: "center",
  },
  trashIconContainer: {
    marginBottom: 16,
    backgroundColor: "#FFE5E5", // Light Red Circle
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  modalBtnRow: {
    width: "100%",
    flexDirection: "row", // Side by Side buttons
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
    // Button Shadow
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalBtnDestructive: {
    backgroundColor: "#FF3B30", // Red
  },
  modalBtnGhost: {
    backgroundColor: "#FFF", // White
  },
  modalBtnTextRed: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
  },
  modalBtnTextBlack: {
    color: "#000",
    fontWeight: "900",
    fontSize: 14,
  },
  modalMessage: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
});

export default DashboardScreen;