import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import React, { useEffect, useState } from 'react';
import {
    View,
    Button,
    Text,
    RefreshControl,
    Modal,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    ScrollView,
    Dimensions,
} from 'react-native';
const { width } = Dimensions.get('window');
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { useUser } from '../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import * as Constants from 'expo-constants';
const DashboardScreen = ({ route, navigation }) => {
    const { userData, setUserData } = useUser(); // Access user data from context
    const [streaks, setStreaks] = useState(0);
    const [reports, setReports] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('recent');
    const [modalVisible, setModalVisible] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempFullName, setTempFullName] = useState(userData.fullName);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [tempUsername, setTempUsername] = useState(userData.username);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [tempEmail, setTempEmail] = useState(userData.email);
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [tempPhone, setTempPhone] = useState(userData.phoneNumber);
    const [availableClasses, setAvailableClasses] = useState([]);
    const [tempClass, setTempClass] = useState(userData.class);
    const [isEditingClass, setIsEditingClass] = useState(false);
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [tempAvatar, setTempAvatar] = useState(userData.avatar);
    const [refreshing, setRefreshing] = useState(false);
    const [appMode, setAppMode] = useState('free');
    const [subjects, setSubjects] = useState([]);

    useEffect(() => {
        if (!userData) {
            // If userData is not yet set, initialize it
            const data = route.params?.userData; // Get it from navigation params
            setUserData(data); // Save it to context
        }
    }, [userData, setUserData]);

    const checkMode = async () => {
        try {
            console.log("🚀 Starting mode check...");
            console.log("📋 Constants object:", Constants);

            // Multiple fallback methods to get version
            const version = Constants.expoConfig?.version ||
                Constants.manifest?.version ||
                Constants.manifest2?.extra?.expoClient?.version ||
                '1.0.0';

            console.log("📱 App version:", version);

            const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/mode', { app: version });
            console.log("✅ API Response:", response.data);

            setAppMode(response.data.mode);
            console.log("🎯 App mode set to:", response.data.mode);

        } catch (error) {
            console.error("❌ Error checking mode:", error.message);
            console.error("❌ Full error:", error);
            setAppMode('free'); // fallback
        }
    };

    useEffect(() => {
        checkMode();
    }, []);
    const fetchSubjects = async () => {
        try {
            console.log('This is class', userData.class);

            const response = await axios.post(
                'https://homeedu.fsdgroup.com.ng/api/subjects',
                { class: userData.class }
            );

            if (response.data.status === 200) {
                setSubjects(response.data.data);
                console.log("Fetched subjects response:", response.data);
            } else {
                // Handle unexpected success response structure
                setSubjects([]);
                setError('No subjects found.');
            }

        } catch (err) {
            // Handle 404 or any other HTTP error
            if (err.response?.status === 404) {
                setSubjects([]); // Set to empty if not found
            } else {
                setError('An error occurred while fetching subjects.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        fetchSubjects();
    }, [userData.class]);
    const fetchClasses = async () => {
        try {
            const response = await fetch("https://homeedu.fsdgroup.com.ng/api/fetchAllClasses");
            const data = await response.json();
            console.log("This is the data gotten from backend", data)
            if (data.status === 200) {
                setAvailableClasses(data.Classes);
            } else {
                console.error("Failed to fetch classes");
            }
        } catch (error) {
            console.error("Error fetching classes:", error);
        }
    };

    useEffect(() => {
        fetchClasses();
    }, []);
    const truncateText = (text, max = 18) => {
        if (!text) return null;
        return text.length > max ? text.substring(0, max) + "..." : text;
    };


    const fetchReports = async () => {
        try {
            const response = await axios.get(
                `https://homeedu.fsdgroup.com.ng/api/report/${userData.username}`
            );

            if (response.data.status === 200) {
                // Map through the data and round Score to 2 decimal places
                const roundedReports = response.data.data.map(report => ({
                    ...report,
                    Score: Number(parseFloat(report.Score).toFixed(2)),
                    subtopic_name: truncateText(report.subtopic_name),
                    exam_name: truncateText(report.exam_name)
                }));

                setReports(roundedReports);

                console.log("This is the report data", roundedReports);
            } else {
                setReports([]);
                setError('No reports found.');
            }

        } catch (err) {
            if (err.response?.status === 404) {
                setReports([]); // Clear reports if not found
            } else {
                setError('An error occurred while fetching reports.');
            }
        } finally {
            setLoading(false);
        }
    };



    useEffect(() => {
        fetchReports();
    }, [userData.username]);

    useFocusEffect(
        useCallback(() => {
            const fetchStreaks = async () => {
                try {
                    if (!userData) return;
                    const id = userData.username;
                    const response = await axios.get(
                        `https://homeedu.fsdgroup.com.ng/api/streaks?username=${id}`
                    );
                    setStreaks(response.data.streak_count);
                } catch (error) {
                    console.error('Error fetching streaks:', error);
                }
            };

            fetchStreaks();
        }, [userData])
    );

    const fetchLeaderboard = async () => {
        try {
            console.log("Fetching leaderboard...");
            const formData = new FormData();
            formData.append('class', userData.class);

            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/getleaderboard', {
                method: 'POST',
                body: formData,
            });

            const json = await response.json();
            console.log("Fetched leaderboard response:", json);

            if (json.status === 200) {
                setLeaderboard(json.data);
            } else if (json.status === 404) {
                setLeaderboard([]); // Empty leaderboard if not found
            } else {
                setError("Failed to load leaderboard.");
            }
        } catch (error) {
            setError('An error occurred while fetching leaderboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [userData.class]);

    const generateClassTimes = () => {
        const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = currentDay === 0 || currentDay === 6;

        if (isWeekend) {
            // Weekend timings
            return ['10:00 AM - 11:00 AM', '2:00 PM - 3:00 PM', '7:00 PM - 8:00 PM'];
        } else {
            // Weekday timings
            return ['3:30 PM - 4:30 PM', '6:00 PM - 7:00 PM', '8:00 PM - 9:00 PM'];
        }
    };


    const toggleEditName = async () => {
        if (isEditingName) {
            // Save name
            try {
                const formData = new FormData();
                formData.append('fullname', tempFullName);
                formData.append('username', userData.username);

                const response = await fetch('https://homeedu.fsdgroup.com.ng/api/editname', {
                    method: 'POST',
                    body: formData,
                });

                if (response.status === 200) {
                    setUserData({ ...userData, fullName: tempFullName });
                    setIsEditingName(false);
                    alert('Name updated successfully!');
                } else {
                    alert('Failed to update name');
                }
            } catch (err) {
                console.error(err);
                alert('Error saving name');
            }
        } else {
            // Enter edit mode
            setIsEditingName(true);
        }
    };
    const saveUsername = async () => {
        const formData = new FormData();
        formData.append("old_username", userData.username);
        formData.append("new_username", tempUsername);

        try {
            const response = await fetch("https://homeedu.fsdgroup.com.ng/api/editusername", {
                method: "POST",
                body: formData,
            });

            const data = await response.json(); // Parse JSON response

            if (response.ok && data.status === 200) {
                // Username updated successfully
                setUserData({ ...userData, username: tempUsername });
                setIsEditingUsername(false);
                alert("Username updated successfully!");
            } else if (data.status === 101) {
                // Username already exists
                alert("Username already taken. Please choose a different one.");
            } else {
                alert("Failed to update username: " + (data.message || ""));
            }
        } catch (error) {
            console.error(error);
            alert("Network error or issue updating username.");
        }
    };

    const saveEmail = async () => {
        const formData = new FormData();
        formData.append('username', userData.username); // or any unique ID
        formData.append('email', tempEmail);

        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/editemail', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setUserData({ ...userData, email: tempEmail });
                setIsEditingEmail(false);
                alert('Email updated successfully!');
            } else if (response.status === 101) {
                alert('Email already in use by another user. Please choose a different one.');
            } else {
                alert('Failed to update email');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating email');
        }
    };

    const savePhone = async () => {
        const formData = new FormData();
        formData.append('username', userData.username); // or your unique ID
        formData.append('phone', tempPhone);

        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/editphone', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setUserData({ ...userData, phoneNumber: tempPhone });
                setIsEditingPhone(false);
                alert('Phone number updated successfully!');
            } else {
                alert('Failed to update phone number');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating phone number');
        }
    };
    const saveClass = async () => {
        const formData = new FormData();
        formData.append('username', userData.username); // assuming username identifies the user
        formData.append('class', tempClass);

        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/editclass', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setUserData({ ...userData, class: tempClass });
                setIsEditingClass(false);
                alert('Class updated successfully!');
            } else {
                alert('Failed to update class');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating class');
        }
    };

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Permission to access gallery is required!");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.cancelled) {
            uploadProfileImage(result.assets[0]); // for Expo SDK 48+
        }
    };

    const compressImage = async (imageUri) => {
        const result = await ImageManipulator.manipulateAsync(
            imageUri,
            [],
            {
                compress: 0.5, // adjust compression here
                format: ImageManipulator.SaveFormat.JPEG,
            }
        );
        return result;
    };

    const uploadProfileImage = async (image) => {
        if (!userData.username || !image || !image.uri) {
            console.error("Validation failed:", {
                username: userData.username,
                image,
            });
            alert("Missing username or image data. Please try again.");
            return;
        }

        let fileSize = image.size;
        if (!fileSize) {
            const fileInfo = await FileSystem.getInfoAsync(image.uri);
            fileSize = fileInfo.size;
        }
        console.log('File size:', fileSize);
        const fileName = image.uri.split('/').pop();

        let fileType = 'image/jpeg'; // default

        if (fileName.endsWith('.png')) fileType = 'image/png';
        else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) fileType = 'image/jpeg';
        else if (fileName.endsWith('.gif')) fileType = 'image/gif';
        else if (fileName.endsWith('.webp')) fileType = 'image/webp';

        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(fileType)) {
            alert('Unsupported image type: ' + fileType + '\nSupported types: ' + allowedTypes.join(', '));
            return;
        } else {
            console.log('Image type is supported:', fileType);
        }

        // ✅ File size check
        if (fileSize > 1 * 1024 * 1024) {
            Alert.alert(
                'Image too large',
                'The selected image is over 1MB. Do you want to compress it?',
                [
                    {
                        text: 'Choose another',
                        onPress: () => console.log('User canceled'),
                        style: 'cancel',
                    },
                    {
                        text: 'Compress & Continue',
                        onPress: async () => {
                            try {
                                const compressed = await ImageManipulator.manipulateAsync(
                                    image.uri,
                                    [],
                                    {
                                        compress: 0.5,
                                        format: ImageManipulator.SaveFormat.JPEG,
                                    }
                                );

                                const compressedInfo = await FileSystem.getInfoAsync(compressed.uri);

                                if (compressedInfo.size > 20 * 1024 * 1024) { // Laravel max
                                    Alert.alert(
                                        'Still too large',
                                        'Compressed image is still over 20MB. Please choose another image.'
                                    );
                                    return;
                                }

                                uploadProfileImage({
                                    ...image,
                                    uri: compressed.uri,
                                    size: compressedInfo.size,
                                });

                            } catch (err) {
                                console.error('Compression failed:', err);
                                Alert.alert('Error', 'Could not compress the image.');
                            }
                        },
                    },
                ]
            );
            return;
        }

        const cleanUri = Platform.OS === 'ios' ? image.uri.replace('file://', '') : image.uri;

        const formData = new FormData();
        formData.append('username', userData.username);
        formData.append("profile_image", {
            uri: cleanUri,
            name: fileName,
            type: fileType,
        });

        // Debug log
        console.log("Uploading image:", {
            uri: cleanUri,
            name: fileName,
            type: fileType,
            size: fileSize
        });

        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/EditProfileImage', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            });

            const data = await response.json();
            if (response.ok && data.status === 200) {
                const baseUrl = 'https://homeedu.fsdgroup.com.ng/storage/';
                alert('Profile image updated!');
                setUserData(prev => ({
                    ...prev,
                    avatar: baseUrl + data.profile_image,
                }));
                console.log('Updated userData: avatar:' + baseUrl + data.profile_image);
            } else {
                console.log(data);
                alert('Failed to update image: ' + (data.message || ''));
            }
        } catch (error) {
            console.error(error);
            alert('Network or upload error');
        }
    };

    const fetchRefreshedUser = async () => {
        try {
            console.log("fetching leaderboard...");
            fetchLeaderboard();
            console.log("fetching report...");
            fetchReports();
            console.log("fetching subject...");
            fetchSubjects();
            console.log("Checking mode....");
            checkMode();
            setRefreshing(true);
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/refresh', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: userData.username }),
            });

            const result = await response.json();

            if (response.ok && result.status === 200) {
                const newAvatar = `${result.user.userData.avatar}?t=${new Date().getTime()}`;

                setUserData(prev => ({
                    ...prev,
                    ...result.user.userData,
                    avatar: newAvatar,
                }));
                console.log("User refreshed:", result.user.userData);
            } else {
                console.log(result);
                Alert.alert('Error', result.message || 'Refresh failed');
            }
        } catch (error) {
            console.error('Refresh error:', error);
            Alert.alert('Error', 'Network issue during refresh');
        } finally {
            setRefreshing(false);
        }
    };

    const sections = [
        { type: 'info' },
        { type: 'streaks' },
        { type: 'reports' },
        { type: 'timetable' },
        { type: 'leaderboard' },
        { type: 'subjects' },
    ];
    const renderItem = ({ item }) => {
        switch (item.type) {
            case 'info':
                return (
                    <TouchableOpacity onPress={() => setShowProfileModal(true)}>
                        <View style={styles.infoContainer}>
                            <View style={styles.leftInfo}>
                                <Text style={styles.hello}> Hello </Text>
                                <Text style={styles.infoUsername}> {userData.username}</Text>
                            </View>

                            <Image
                                source={{ uri: userData.avatar }}
                                style={styles.infoAvatar}
                            />
                        </View>
                    </TouchableOpacity>
                );
            case 'streaks':
                return (
                    <View style={styles.streaksContainer}>
                        <Text style={styles.streaksTitle}>Streaks</Text>
                        <Text style={styles.streaksCount}>{streaks} 📚</Text>
                    </View>
                );
            case 'reports':
                return (
                    <View style={styles.reportsContainer}>
                        <Text style={styles.title}>Reports</Text>
                        {loading ? (
                            <Text>Loading...</Text>
                        ) : error ? (
                            <Text style={styles.noTimetableData}>{error}</Text>
                        ) : (
                            <>
                                <FlatList
                                    data={reports.slice(0, 2)} // Show only the first 5 reports
                                    keyExtractor={(item, index) => index.toString()}
                                    renderItem={({ item }) => (
                                        <View style={styles.reportItem}>
                                            <Text style={styles.reportTitle}>
                                                {item.exam_name || item.subtopic_name || 'Exam'}
                                            </Text>
                                            <Text style={styles.reportScore}>
                                                Score: {item.Score}%
                                            </Text>
                                        </View>
                                    )}
                                    style={styles.reportList}
                                    showsVerticalScrollIndicator={false}
                                />
                                <TouchableOpacity
                                    style={styles.seeMoreButton}
                                    onPress={() => setModalVisible(true)} // Open the modal
                                >
                                    <Text style={styles.seeMoreButtonText}>See More</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        <Modal
                            visible={modalVisible}
                            transparent={true}
                            animationType="slide"
                            onRequestClose={() => setModalVisible(false)}>
                            <View style={styles.modalContainer}>
                                <View style={[styles.modalContent, { backgroundColor: 'white' }]}>
                                    {/* Tab Navigation */}
                                    <View style={styles.tabContainer}>
                                        <TouchableOpacity
                                            style={[
                                                styles.tab,
                                                activeTab === 'recent' && styles.activeTab,
                                            ]}
                                            onPress={() => setActiveTab('recent')}>
                                            <Text
                                                style={[
                                                    styles.tabText,
                                                    activeTab === 'recent' && styles.activeTabText,
                                                ]}
                                                numberOfLines={1} // Ensure single line
                                                ellipsizeMode="tail" // Truncate text with ellipses
                                            >
                                                Recently Practiced
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.tab,
                                                activeTab === 'best' && styles.activeTab,
                                            ]}
                                            onPress={() => setActiveTab('best')}>
                                            <Text
                                                style={[
                                                    styles.tabText,
                                                    activeTab === 'best' && styles.activeTabText,
                                                ]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail">
                                                Best Scores
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.tab,
                                                activeTab === 'worst' && styles.activeTab,
                                            ]}
                                            onPress={() => setActiveTab('worst')}>
                                            <Text
                                                style={[
                                                    styles.tabText,
                                                    activeTab === 'worst' && styles.activeTabText,
                                                ]}
                                                numberOfLines={1}
                                                ellipsizeMode="tail">
                                                Worst Scores
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Tab Content */}
                                    <FlatList
                                        data={
                                            activeTab === 'recent'
                                                ? reports.slice(0, 20) // Show the most recent 20 reports
                                                : activeTab === 'best'
                                                    ? [...reports]
                                                        .sort((a, b) => b.Score - a.Score)
                                                        .slice(0, 20) // Top 20 scores
                                                    : [...reports]
                                                        .sort((a, b) => a.Score - b.Score)
                                                        .slice(0, 20) // Bottom 20 scores
                                        }
                                        keyExtractor={(item, index) => index.toString()}
                                        renderItem={({ item }) => (
                                            <View style={styles.modalReportItem}>
                                                <Text style={styles.modalReportTitle}>
                                                    {item.exam_name || item.subtopic_name || 'Exam'}
                                                </Text>
                                                <Text style={styles.modalReportScore}>
                                                    Score: {item.Score}%
                                                </Text>
                                            </View>
                                        )}
                                        style={styles.modalReportList}
                                        showsVerticalScrollIndicator={false}
                                    />

                                    {/* Close Button */}
                                    <TouchableOpacity
                                        style={styles.modalCloseButton}
                                        onPress={() => setModalVisible(false)} // Close the modal
                                    >
                                        <Text style={styles.modalCloseButtonText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
                );

            case 'timetable':
                const classTimes = generateClassTimes(); // Get the times based on the day

                return (
                    <View style={styles.timetableContainer}>
                        <Text style={styles.timetableTitle}>Today's Timetable</Text>
                        {loading ? (
                            <Text>Loading timetable...</Text>
                        ) : error ? (
                            <Text style={styles.noTimetableData}>{error}</Text>
                        ) : subjects && subjects.length > 0 ? (
                            <FlatList
                                data={subjects.slice(0, 3)} // Limit to 3 subjects
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item, index }) => (
                                    <View style={styles.timetableItem}>
                                        <Text style={styles.subjectName}>{item.Subject}</Text>
                                        <Text style={styles.subjectTime}>{classTimes[index]}</Text>
                                    </View>
                                )}
                                style={styles.timetableList}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <Text style={styles.noTimetableData}>No schedule available</Text>
                        )}
                    </View>
                );
            case 'leaderboard':
                return (
                    <View style={styles.leaderboardContainer}>
                        <Text style={styles.leaderboardTitle}>Leaderboard</Text>
                        {leaderboard && leaderboard.length > 0 ? (
                            <FlatList
                                data={leaderboard}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item, index }) => (
                                    <View style={styles.leaderboardItem}>
                                        <View style={styles.leaderboardItem}>
                                            <Text style={styles.leaderboardRank}>{index + 1}</Text>
                                            <Text style={styles.leaderboardName}>{item.username}</Text>
                                            <Text style={styles.leaderboardScore}>
                                                {item.stars} ⭐
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                style={styles.leaderboardList}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <Text style={styles.noLeaderboardData}>No data available</Text>
                        )}
                    </View>
                );

            case 'subjects':
                return (
                    <View style={styles.subjectsContainer}>
                        <Text style={styles.subjectsTitle}>Explore Subjects</Text>
                        <Text style={styles.subjectsDescription}>
                            Dive into your courses and learn at your pace!
                        </Text>
                        <TouchableOpacity
                            style={styles.subjectsButton}
                            onPress={() => navigation.navigate('Subject')}>
                            <Text style={styles.subjectsButtonText}>View All Subjects</Text>
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <FlatList
                data={sections}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={fetchRefreshedUser}
                        tintColor="#00ff00"
                        colors={['#00ff00']}
                    />
                }
            />

            {showProfileModal && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Your Profile</Text>

                        <TouchableOpacity onPress={pickImage}>
                            <Image source={{ uri: userData.avatar }} style={styles.modalAvatar} />
                        </TouchableOpacity>

                        <View style={styles.inputRow}>
                            <Text style={styles.modalLabel}>Full Name:</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={tempFullName}
                                    onChangeText={setTempFullName}
                                    editable={isEditingName}
                                />
                                <TouchableOpacity style={styles.editIcon} onPress={toggleEditName}>
                                    <Ionicons
                                        name={isEditingName ? "checkmark" : "pencil"}
                                        size={18}
                                        color="#864AF9"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>


                        <View style={styles.inputRow}>
                            <Text style={styles.modalLabel}>Username:</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={tempUsername}
                                    editable={isEditingUsername}
                                    onChangeText={setTempUsername}
                                />
                                <TouchableOpacity
                                    style={styles.editIcon}
                                    onPress={() => {
                                        if (isEditingUsername) {
                                            saveUsername();
                                        } else {
                                            setIsEditingUsername(true);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={isEditingUsername ? 'checkmark' : 'pencil'}
                                        size={18}
                                        color="#864AF9"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputRow}>
                            <Text style={styles.modalLabel}>Email:</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={tempEmail}
                                    editable={isEditingEmail}
                                    onChangeText={setTempEmail}
                                />
                                <TouchableOpacity
                                    style={styles.editIcon}
                                    onPress={() => {
                                        if (isEditingEmail) {
                                            saveEmail();
                                        } else {
                                            setIsEditingEmail(true);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={isEditingEmail ? 'checkmark' : 'pencil'}
                                        size={18}
                                        color="#864AF9"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>


                        <View style={styles.inputRow}>
                            <Text style={styles.modalLabel}>Phone:</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.modalInput}
                                    value={tempPhone}
                                    editable={isEditingPhone}
                                    onChangeText={setTempPhone}
                                    keyboardType="phone-pad"
                                />
                                <TouchableOpacity
                                    style={styles.editIcon}
                                    onPress={() => {
                                        if (isEditingPhone) {
                                            savePhone();
                                        } else {
                                            setIsEditingPhone(true);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={isEditingPhone ? 'checkmark' : 'pencil'}
                                        size={18}
                                        color="#864AF9"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputRow}>
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
                                            <Picker.Item key={classItem.id} label={classItem.ClassName} value={classItem.ClassName} />
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
                                    onPress={() => {
                                        if (isEditingClass) {
                                            saveClass(); // your save logic
                                        } else {
                                            setIsEditingClass(true);
                                        }
                                    }}
                                >
                                    <Ionicons
                                        name={isEditingClass ? 'checkmark' : 'pencil'}
                                        size={18}
                                        color="#864AF9"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>



                        <View style={styles.buttonRow}>
                            <TouchableOpacity
                                style={styles.logoutBtn}
                                onPress={() => {
                                    setUserData(null);
                                    navigation.reset({
                                        index: 0,
                                        routes: [{ name: 'Login' }],
                                    });
                                }}
                            >
                                <Text style={styles.logoutText}>Logout</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowProfileModal(false)}
                                style={styles.cancelBtn}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

        </>
    );

};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#F8F9FE',
        padding: 16,
        paddingBottom: 32,
    },

    // Info/Header Section
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#864AF9',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    leftInfo: {
        flex: 1,
    },
    hello: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '400',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    infoUsername: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    infoAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    // Streaks Section
    streaksContainer: {
        alignSelf: 'center',
        width: '100%',
        backgroundColor: '#FFFFFF',
        padding: 28,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: 'rgba(134, 74, 249, 0.1)',
    },
    streaksTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#864AF9',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    streaksCount: {
        fontSize: 36,
        fontWeight: '800',
        color: '#2D3748',
        letterSpacing: 1,
    },

    // Reports Section
    reportsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 16,
    },
    reportItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#864AF9',
    },
    reportTitle: {
        fontSize: 16,
        color: '#2D3748',
        fontWeight: '600',
        flex: 3,
    },
    reportScore: {
        fontSize: 16,
        color: '#864AF9',
        flex: 1,
        textAlign: 'right',
        fontWeight: '700',
    },
    reportList: {
        marginBottom: 8,
    },
    seeMoreButton: {
        marginTop: 12,
        paddingVertical: 14,
        backgroundColor: '#864AF9',
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    seeMoreButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.5,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
        // backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 24,
        width: '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        backgroundColor: '#F7F9FC',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        marginHorizontal: 2,
    },
    activeTab: {
        backgroundColor: '#864AF9',
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 13,
        color: '#718096',
        textAlign: 'center',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    modalReportItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 14,
        backgroundColor: '#F7F9FC',
        borderRadius: 12,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#864AF9',
    },
    modalReportTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#2D3748',
    },
    modalReportScore: {
        fontSize: 15,
        color: '#864AF9',
        fontWeight: '700',
    },
    modalReportList: {
        maxHeight: 400,
    },
    modalCloseButton: {
        marginTop: 20,
        paddingVertical: 14,
        backgroundColor: '#864AF9',
        borderRadius: 12,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },

    // Timetable Section
    timetableContainer: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    timetableTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 16,
    },
    timetableList: {
        marginTop: 8,
    },
    timetableItem: {
        backgroundColor: '#F7F9FC',
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderLeftWidth: 5,
        borderLeftColor: '#864AF9',
    },
    subjectName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 6,
    },
    subjectTime: {
        fontSize: 14,
        color: '#718096',
        fontWeight: '500',
    },
    noTimetableData: {
        fontSize: 15,
        color: '#A0AEC0',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },

    // Leaderboard Section
    leaderboardContainer: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    leaderboardTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2D3748',
        marginBottom: 16,
    },
    leaderboardList: {
        marginTop: 8,
    },
    leaderboardItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
        padding: 16,
        marginBottom: 10,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    leaderboardRank: {
        fontSize: 18,
        fontWeight: '800',
        color: '#864AF9',
        width: 40,
        textAlign: 'center',
    },
    leaderboardName: {
        flex: 2,
        fontSize: 16,
        color: '#2D3748',
        fontWeight: '600',
        marginLeft: 12,
    },
    leaderboardScore: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D3748',
    },
    noLeaderboardData: {
        fontSize: 15,
        color: '#A0AEC0',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },

    // Subjects Section
    subjectsContainer: {
        backgroundColor: '#864AF9',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#864AF9',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    subjectsTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subjectsDescription: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    subjectsButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    subjectsButtonText: {
        color: '#864AF9',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.5,
    },

    // Profile Modal
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    modalTitle: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    modalAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        width: '100%',
    },
    modalLabel: {
        width: 80,
        fontSize: 14,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    modalInput: {
        flex: 1,
        fontSize: 15,
        color: '#2D3748',
        fontWeight: '500',
    },
    editIcon: {
        marginLeft: 10,
        padding: 4,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        width: '100%',
    },
    logoutBtn: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginRight: 10,
        flex: 1,
        alignItems: 'center',
    },
    logoutText: {
        color: '#864AF9',
        fontWeight: '700',
        fontSize: 16,
    },
    cancelBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        flex: 1,
        alignItems: 'center',
    },
    cancelText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    },

    error: {
        color: '#F56565',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
});

export default DashboardScreen;
