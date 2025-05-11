import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import React, { useEffect, useState } from 'react';
import {
    View,
    Button,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    ScrollView,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from 'react-native';
import { useUser } from '../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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


    const [subjects, setSubjects] = useState([]);
    useEffect(() => {
        if (!userData) {
            // If userData is not yet set, initialize it
            const data = route.params?.userData; // Get it from navigation params
            setUserData(data); // Save it to context
        }
    }, [userData, setUserData]);

    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                console.log('This is class', userData.class);
                console.log("This is the userData", userData)

                const response = await axios.post(
                    'https://homeedu.fsdgroup.com.ng/api/subjects',
                    {
                        class: userData.class,
                    }
                );
                if (response.data.status === 200) {
                    setSubjects(response.data.data);
                } else {
                    setError('Failed to load subjects.');
                }
            } catch (err) {
                setError('An error occurred while fetching subjects.');
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
    }, [userData.class]);

    useEffect(() => {
        // Fetch classes from API
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

        fetchClasses();
    }, []);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axios.get(
                    `https://homeedu.fsdgroup.com.ng/api/report/${userData.username}`
                );
                if (response.data.status === 200) {
                    setReports(response.data.data);
                } else {
                    setError('No reports found.');
                }
            } catch (err) {
                setError('An error occurred while fetching reports.');
            } finally {
                setLoading(false);
            }
        };

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
    useEffect(() => {
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
                } else {
                    setError("Failed to load leaderboard.");
                }
            } catch (error) {
                console.error("Fetch leaderboard error:", error);
                setError("Network error. Please check your internet or server.");
            } finally {
                setLoading(false);
            }
        };


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
        formData.append('old_username', userData.username);
        formData.append('new_username', tempUsername);

        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/editusername', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setUserData({ ...userData, username: tempUsername });
                setIsEditingUsername(false);
            } else {
                alert('Failed to update username');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating username');
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
    const uploadProfileImage = async (image) => {
        if (!userData.username || !image || !image.uri || !image.type) {
            console.error("Validation failed:", {
                username: userData.username,
                image,
            });
            alert("Missing username or image data. Please try again.");
            return;
        }

        const formData = new FormData();

        formData.append('username', userData.username); // ✅ Ensure this is not undefined
        // Extract the file name from the URI
        const fileName = image.uri.split('/').pop(); // e.g., 'photo123.jpg'

        // Optional: determine the MIME type (basic)
        const fileType = image.type || 'image/jpeg';

        console.log('Uploading image with name:', fileName);

        formData.append('profile_image', {
            uri: image.uri,
            name: fileName,
            type: fileType,
        });

        for (let [key, value] of formData.entries()) {
            if (typeof value === 'object' && value !== null) {
                console.log(`${key}:`);
                console.log('  name:', value.name);
                console.log('  type:', value.type);
                console.log('  uri:', value.uri);
            } else {
                console.log(`${key}: ${value}`);
            }
        }

        try {
            const response = await fetch('https://homeedu.fsdgroup.com.ng/api/EditProfileImage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const data = await response.json();
            if (response.ok && data.status === 200) {
                alert('Profile image updated!');
                setUserData(prev => ({ ...prev, avatar: data.profile_image }));
            } else {
                console.log(data);
                alert('Failed to update image: ' + (data.message || ''));
            }
        } catch (error) {
            console.error(error);
            alert('Network or upload error');
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
                            <Text style={styles.error}>{error}</Text>
                        ) : (
                            <>
                                <FlatList
                                    data={reports.slice(0, 5)} // Show only the first 5 reports
                                    keyExtractor={(item, index) => index.toString()}
                                    renderItem={({ item }) => (
                                        <View style={styles.reportItem}>
                                            <Text style={styles.reportTitle}>
                                                {item.exam_name || item.subtopic_name || 'Unknown'}
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
                                <View style={styles.modalContent}>
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
                                                    {item.exam_name || item.subtopic_name || 'Unknown'}
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
                            <Text style={styles.error}>{error}</Text>
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
    infoContainer: {
        flexDirection: 'row', // Layout items horizontally
        alignItems: 'center', // Align avatar and username vertically
        backgroundColor: '#864AF9', // Light background for a clean look #007bff
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,

        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0,
    },
    infoAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25, // This is incorrect
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#fcfcfc',
        objectFit: 'cover',
    },

    hello: {
        color: '#fcfcfc',
        fontWeight: 400,
        fontSize: 16,
        fontFamily: 'latto'
    },
    infoUsername: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fcfcfc', // Text contrast with the background
        fontFamily: 'latto'
    },
    streaksContainer: {
        alignSelf: 'center', // Center the streaks box
        width: '100%', // Restrict width to make it compact
        //backgroundColor: '#0D9276', // Light background for a clean look
        backgroundColor: '#f4f4f4', // Light background for a clean look
        padding: 20,
        paddingTop: 32,
        paddingBottom: 32,
        borderRadius: 8, // Use a theme color for the border
        alignItems: 'center', // Center the content
        marginBottom: 24,
    },
    streaksTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#864af9', // Theme color for the title
        marginBottom: 8,
        fontFamily: 'latto',
    },
    streaksCount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333', // Neutral color for the count
        fontFamily: 'latto'
    },
    title: {
        color: '#864af9',
        fontSize: 20,
        fontWeight: 'bold',
        color: '#864af9', // Golden accent
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'latto'
    },
    reportItem: {
        flexDirection: 'row', // Align subtopic and score in a row
        justifyContent: 'space-between', // Distribute items with space between
        alignItems: 'center', // Center vertically
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 24,
        borderRadius: 8,
        // borderWidth: 1,
        //borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#864af9',
    },
    reportTitle: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        flex: 3, // Allocate more space for the title
        fontFamily: 'latto'
    },
    reportScore: {
        fontSize: 14,
        color: '#864af9',
        flex: 1, // Allocate space for the score
        textAlign: 'right', // Align score to the right
        fontFamily: 'latto',
        fontWeight: 'normal'
    },
    reportsContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        maxHeight: 250, // Set a fixed height for scrollable area
        borderWidth: 1,
        borderColor: '#864af9',
    },
    seeMoreButton: {
        marginTop: 8,
        paddingVertical: 12,
        backgroundColor: '#864af9',
        borderRadius: 8,
        alignItems: 'center',
    },
    seeMoreButtonText: {
        color: '#fcfcfc',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'latto',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fcfcfc',
        padding: 20,
        borderRadius: 12,
        width: '90%',
        maxHeight: '80%',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Distribute tabs evenly
        marginBottom: 16,
    },
    tab: {
        flex: 1, // Each tab gets equal width
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 2,
        borderColor: 'transparent', // Default border color for inactive tabs
    },
    activeTab: {
        borderColor: '#864af9', // Highlight active tab
    },
    tabText: {
        fontSize: 14, // Adjust font size for better fit
        color: '#555',
        textAlign: 'center', // Center-align text in the tab
        fontFamily: 'latto',
    },
    activeTabText: {
        color: "white", // Highlight color for active tab
        fontWeight: 'bold',
        fontFamily: 'latto',
    },
    modalReportItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#864af9',
    },
    modalReportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'latto',
    },
    modalReportScore: {
        fontSize: 14,
        color: '#864af9',
        fontFamily: 'latto',
    },
    modalCloseButton: {
        marginTop: 16,
        paddingVertical: 12,
        backgroundColor: '#864af9',
        borderRadius: 8,
        alignItems: 'center',
    },
    modalCloseButtonText: {
        color: '#fcfcfc',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'latto',
    },
    subjectsContainer: {
        backgroundColor: '#f4f4f4', // Light blue background
        padding: 16,
        borderRadius: 8,
        alignItems: 'center', // Center the content
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#864af9',
        borderStyle: 'dotted',
    },
    subjectsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#864af9', // Themed color for the title
        marginBottom: 8,
        fontFamily: 'latto',
    },
    subjectsDescription: {
        fontSize: 14,
        color: '#333', // Neutral color for description
        marginBottom: 16,
        textAlign: 'center',
    },
    subjectsButton: {
        backgroundColor: '#864af9',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    subjectsButtonText: {
        color: '#fcfcfc',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'latto',
    },
    leaderboardContainer: {
        backgroundColor: '#f4f4f4',
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    leaderboardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#864af9',
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'latto',
    },
    leaderboardList: {
        marginTop: 8,
    },
    leaderboardItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    leaderboardRank: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007bff',
        width: 40, // Fixed width for alignment
        textAlign: 'center',
    },
    leaderboardName: {
        flex: 2,
        fontSize: 16,
        color: '#333',
        fontFamily: 'latto',
    },
    leaderboardScore: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
        fontFamily: 'latto',
    },
    noLeaderboardData: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 16,
    },
    timetableContainer: {
        // backgroundColor: '#fdf8e4', // Light yellow background
        // padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        //borderWidth: 1,
        // borderColor: '#d1a83b',
        flexDirection: 'colomn',
        borderColo: '#864AF9',
    },
    timetableTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#864af9', // Golden accent
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'latto',
    },
    timetableList: {
        marginTop: 8,
    },
    timetableItem: {
        flexDirection: 'colomn', // Align name and time in a row
        justifyContent: 'start', // Space between subject and time
        alignItems: 'start',
        backgroundColor: '#fff',
        padding: 12,
        marginBottom: 8,
        borderRadius: 8,
        borderLeftWidth: 5,
        borderColor: '#864AF9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 2,
        fontFamily: 'latto',
    },
    subjectTime: {
        fontSize: 14,
        color: '#555',
        flex: 1,
        textAlign: 'start',
        fontFamily: 'latto',
    },
    noTimetableData: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        marginTop: 16,
    },
    container: {
        backgroundColor: '#fff',
        padding: 16,
    },
    error: {
        color: 'red',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '100%',
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    modalContent: {
        backgroundColor: '#864AF9',
        padding: 20,
        borderRadius: 20,
        width: '85%',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fcfcfc',
        marginBottom: 15,
    },
    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 15,
    },
    modalLabel: {
        fontWeight: '600',
        fontSize: 14,
        color: '#fcfcfc',
        marginTop: 10,
    },
    modalText: {
        fontSize: 16,
        color: '#fcfcfc',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        width: '100%',
    },
    logoutBtn: {
        backgroundColor: '#fcfcfc',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginRight: 10,
    },
    logoutText: {
        color: '#864AF9',
        fontWeight: 'bold',
    },
    cancelBtn: {
        backgroundColor: '#fcfcfc',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    cancelText: {
        color: '#864AF9',
        fontWeight: 'bold',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    modalLabel: {
        width: 90, // fixed label width
        fontSize: 14,
        fontWeight: '600',
        color: '#fcfcfc',
    },

    inputContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    modalInput: {
        flex: 1,
        fontSize: 14,
        color: '#000',
    },

    editIcon: {
        marginLeft: 8,
    },
});

export default DashboardScreen;
