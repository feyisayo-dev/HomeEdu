import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
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
    try {
      const response = await axios.post(
        "https://homeedu.fsdgroup.com.ng/api/login",
        {
          email,
          password,
        }
      );

      if (response.data.userData) {
        await AsyncStorage.setItem(
          "userData",
          JSON.stringify(response.data.userData)
        );
        const token = response.data.accessToken;
         await AsyncStorage.setItem('token', token);
        setUserData(response.data.userData);
        navigation.reset({ index: 0, routes: [{ name: "Dashboard" }] });
      } else {
        Alert.alert("Success", response.data.message);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: HANDLE FORGOT PASSWORD ---
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
          headers: { "Content-Type": "multipart/form-data" }, // PHP $_POST often likes form-data
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

        {/* --- FORGOT PASSWORD LINK --- */}
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

  // Modal Styles
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
});
