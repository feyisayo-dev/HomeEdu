import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUserData } = useContext(UserContext);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  // --- FORGOT PASSWORD STATE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // --- SPONSORSHIP WELCOME MODAL STATE ---
  const [sponsorModalVisible, setSponsorModalVisible] = useState(false);
  const [sponsorshipData, setSponsorshipData] = useState(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("userData");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUserData(parsedUser);
          navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
        }
      } catch (error) {
        console.log("Error loading saved login:", error);
      } finally {
        setCheckingLogin(false);
      }
    };
    checkLoginStatus();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    console.log("=== Login Attempt Started ===");

    try {
      console.log("Sending credentials for:", email);
      const response = await axios.post(
        "https://homeedu.fsdgroup.com.ng/api/login",
        {
          email,
          password,
        }
      );

      console.log("Login API Full Response Data:", response.data);

      if (response.data.userData) {
        // Save User Data
        await AsyncStorage.setItem(
          "userData",
          JSON.stringify(response.data.userData)
        );
        console.log("✅ UserData saved to AsyncStorage");

        // Save Token
        const token = response.data.accessToken || response.data.token;
        console.log("Extracted Token to save:", token);

        if (token) {
          await AsyncStorage.setItem("token", String(token));
          console.log("✅ Token successfully saved to AsyncStorage");
        } else {
          console.warn(
            "⚠️ WARNING: Token is undefined! The API didn't return 'accessToken' or 'token'."
          );
        }

        // 🎯 NEW: Save Sponsorship Data if exists
        if (response.data.sponsorship && response.data.sponsorship.is_sponsored) {
          await AsyncStorage.setItem(
            "sponsorship",
            JSON.stringify(response.data.sponsorship)
          );
          console.log("✅ Sponsorship data saved to AsyncStorage");
          
          // Show welcome modal for sponsored students
          setSponsorshipData(response.data.sponsorship);
          setSponsorModalVisible(true);
        } else {
          // Not sponsored, go directly to dashboard
          setUserData(response.data.userData);
          navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
        }

        setUserData(response.data.userData);
      } else {
        console.log("Login succeeded but no userData found in response.");
        Alert.alert("Success", response.data.message);
      }
    } catch (error) {
      console.error(
        "❌ Login API Error:",
        error.response?.data || error.message
      );
      Alert.alert(
        "Error",
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
      console.log("=== Login Attempt Finished ===");
    }
  };

  // Navigate to dashboard from sponsor welcome modal
  const handleContinueToDashboard = () => {
    setSponsorModalVisible(false);
    navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
  };

  // --- HANDLE FORGOT PASSWORD ---
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setResetLoading(true);
    try {
      const response = await axios.post(
        "https://www.fsdgroup.com.ng/EdTech/php/send_reset_mail.php",
        {
          email: resetEmail,
        },
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.status === "success") {
        Alert.alert(
          "Check your Email",
          "We have sent a password reset link to your email."
        );
        setModalVisible(false);
        setResetEmail("");
      } else {
        Alert.alert("Error", response.data.message || "Could not send email.");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  if (checkingLogin) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/Rectangle_106.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.top}>
        <Text style={styles.toptext}>Login</Text>
        <Text style={styles.topsubtext}>Sign in to continue your journey</Text>
      </View>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#666666"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#666666"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={24}
              color="gray"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{ alignSelf: "flex-end", marginBottom: 20 }}
        >
          <Text style={{ color: "#864AF9", fontWeight: "600" }}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogin}
          style={styles.btn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Login</Text>
          )}
        </TouchableOpacity>

        <Text
          onPress={() => navigation.navigate("Register")}
          style={styles.link}
        >
          Don't have an account?{" "}
          <Text style={styles.regLink}>Register here</Text>
        </Text>
      </View>

      {/* --- FORGOT PASSWORD MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSub}>
              Enter your email to receive a reset link.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter your email"
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#ccc" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#864AF9" }]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    Send Link
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- 🎯 NEW: SPONSORSHIP WELCOME MODAL --- */}
<Modal
  animationType="slide" // Slide feels a bit more natural for large bottom-heavy modals
  transparent={true}
  visible={sponsorModalVisible}
  onRequestClose={handleContinueToDashboard}
>
  <View style={styles.sponsorOverlay}>
    <View style={styles.sponsorModalView}>
      
      {/* Scrollable Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.successIcon}>
          <Ionicons name="trophy" size={45} color="#FFD700" />
        </View>

        <Text style={styles.sponsorTitle}>🎉 Welcome Back!</Text>
        
        {sponsorshipData && (
          <>
            <Text style={styles.sponsorSubtitle}>
              Your education is proudly sponsored by
            </Text>

            {/* Politician Info Group */}
            <View style={styles.politicianCard}>
              {sponsorshipData.politician.image && (
                <Image
                  source={{ uri: sponsorshipData.politician.image }}
                  style={styles.politicianPhoto}
                />
              )}
              <Text style={styles.politicianName}>
                {sponsorshipData.politician.name}
              </Text>
              <Text style={styles.politicianPosition}>
                {sponsorshipData.politician.position}
              </Text>
              <Text style={styles.politicianConstituency}>
                {sponsorshipData.politician.constituency}
              </Text>
            </View>

            {/* Sponsorship Badge */}
            <View style={styles.sponsorBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              <Text style={styles.badgeText}>Government Sponsored Student</Text>
            </View>

            {/* Expiry Info */}
            <View style={styles.expiryCard}>
              <Text style={styles.expiryLabel}>Sponsorship Valid Until</Text>
              <Text style={styles.expiryDate}>
                {sponsorshipData.expires_at_formatted}
              </Text>
              <Text style={styles.daysRemaining}>
                {sponsorshipData.days_remaining} days remaining
              </Text>
            </View>

            {/* Motivational Message */}
            <Text style={styles.motivationalText}>
              Make the most of this opportunity and excel in your studies! 📚
            </Text>
          </>
        )}
      </ScrollView>

      {/* Sticky Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinueToDashboard}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>Continue to Dashboard</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "center" },
  top: {
    height: "20%",
    width: "100%",
    paddingLeft: 20,
    justifyContent: "center",
  },
  toptext: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fcfcfc",
    fontFamily: "latto",
  },
  topsubtext: {
    fontSize: 16,
    fontWeight: "400",
    color: "#f4f4f4",
    fontFamily: "latto",
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 100,
    backgroundColor: "#fcfcfc",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 0,
  },
  input: {
    borderWidth: 1,
    marginBottom: 24,
    padding: 10,
    borderRadius: 8,
    borderColor: "#fcfcfc",
    color: "#000000",
    backgroundColor: "#dddddd",
    fontFamily: "latto",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: "#dddddd",
    marginBottom: 10,
    borderColor: "#fcfcfc",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#000000",
    fontFamily: "latto",
  },
  btn: {
    marginTop: 10,
    backgroundColor: "#864AF9",
    padding: 15,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    alignSelf: "center",
  },
  btnText: {
    color: "#fcfcfc",
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: "latto",
  },
  link: { color: "#666666", marginTop: 10, textAlign: "center" },
  regLink: { color: "#864af9" },

  // Forgot Password Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalSub: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalBtn: {
    padding: 10,
    borderRadius: 8,
    width: "45%",
    alignItems: "center",
  },
sponsorOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)", // Slightly lighter for a modern feel
  },
  sponsorModalView: {
    width: "90%",
    maxHeight: "85%", // Prevents it from touching screen edges
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden", // Keeps the ScrollView inside the rounded corners
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollView: {
    width: "100%",
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEF3C7", // Yellow-100
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  sponsorTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 6,
    textAlign: "center",
  },
  sponsorSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  politicianCard: {
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  politicianPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#864AF9",
    marginBottom: 12,
  },
  politicianName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#864AF9",
    marginBottom: 4,
    textAlign: "center",
  },
  politicianPosition: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
    textAlign: "center",
  },
  politicianConstituency: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },
  sponsorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5", // Emerald-50
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#A7F3D0", // Emerald-200
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669", // Emerald-600
    marginLeft: 6,
  },
  expiryCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  expiryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#6B7280",
    marginBottom: 6,
  },
  expiryDate: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  daysRemaining: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "700",
  },
  motivationalText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 10,
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6", // Subtle divider line
  },
  continueBtn: {
    flexDirection: "row",
    backgroundColor: "#864AF9",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: "#864AF9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginRight: 8,
  },
});