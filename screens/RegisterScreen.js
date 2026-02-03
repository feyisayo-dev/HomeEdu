import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DropDownPicker from "react-native-dropdown-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from '@expo/vector-icons';


import { Image } from "react-native";
export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setconfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [parentName, setParentName] = useState("");
  const [parentContact, setParentContact] = useState("");
  const [address, setAddress] = useState("");
  const [Country, setCountry] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [classes, setClasses] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [countryList, setCountryList] = useState([]);
  const [open, setOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);

  const totalStages = 4;
const dropdownItems = useMemo(() => {
    return countryList.map((country) => ({
      label: `${country.name}`,
      value: country.short_name,
      icon: () => (
        <Image
          source={{
            uri: `https://homeedu.fsdgroup.com.ng/${country.flag_img}`,
          }}
          style={{ width: 20, height: 15, resizeMode: "contain" }}
        />
      ),
    }));
  }, [countryList]);
  useEffect(() => {
    const fetchData = async () => {
     
      try {
        const classResponse = await axios.get(
          "https://homeedu.fsdgroup.com.ng/api/getClassForUser"
        );
        const classData = classResponse.data;

       
        if (classData.status === 200 && classData.class) {
          setClasses(classData.class);
        } else {
          console.error("Failed to fetch classes or invalid format");
        }
      } catch (error) {
        console.error("Error fetching classes:", error.message);
      }

     
      try {
        const cachedCountries = await AsyncStorage.getItem("countries");

        if (cachedCountries) {
          console.log("Loaded countries from AsyncStorage");
          setCountryList(JSON.parse(cachedCountries));
        } else {
          const countryResponse = await axios.get(
            "https://homeedu.fsdgroup.com.ng/api/FetchAllCountries"
          );
          const countryData = countryResponse.data;

          if (countryData.countries?.length > 0) {
            await AsyncStorage.setItem(
              "countries",
              JSON.stringify(countryData.countries)
            );
            setCountryList(countryData.countries);
          } else {
            Alert.alert("Error", "No countries available.");
          }
        }
      } catch (error) {
        console.error("Error fetching countries:", error.message);
       
      }
    };

    fetchData();
  }, []);

  const onChange = (event, selectedDate) => {
    if (selectedDate) {
      setDob(selectedDate);
    }
    setShowPicker(false);
  };

  const showDatePicker = () => setShowPicker(true);

  const handleRegister = async () => {
 
  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

 
 
  if (!username || !fullName || !dob || !email || !password || !phoneNumber || !selectedClass || !parentName || !parentContact || !address) {
    Alert.alert("Missing Information", "Please fill in all required fields.");
    return;
  }

 
  if (username.length > 188) {
    Alert.alert("Invalid Username", "Username is too long.");
    return;
  }

 
  if (fullName.length < 6) {
    Alert.alert("Invalid Name", "Full name must be at least 6 characters.");
    return;
  }

 
  if (!validateEmail(email)) {
    Alert.alert("Invalid Email", "Please enter a valid email address.");
    return;
  }

 
  if (password.length < 8) {
    Alert.alert("Weak Password", "Password must be at least 8 characters long.");
    return;
  }

 
  if (password !== confirmpassword) {
    Alert.alert("Error", "Passwords do not match.");
    return;
  }

 
  if (phoneNumber.length < 10) {
    Alert.alert("Invalid Phone", "Please enter a valid phone number.");
    return;
  }

  try {
   
    const response = await axios.post(
      "https://homeedu.fsdgroup.com.ng/api/AddStudent",
      {
        username,
        fullName,
        dob,
        email,
        password,
        phoneNumber,
        class: selectedClass,
        parentName,
        parentContact,
        address,
      }
    );

    Alert.alert("Success", "Account created successfully!");
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  } catch (error) {
   
    const serverMessage = error.response?.data?.errors 
      ? Object.values(error.response.data.errors).flat().join("\n") 
      : "Registration failed. Please try again.";

    Alert.alert("Registration Error", serverMessage);
    console.log("Validation details:", error.response?.data);
  }
};

  const renderStage = () => {
    switch (currentStage) {
      case 1:
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#666666"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#666666"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Date of Birth:</Text>

            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>{dob.toDateString()}</Text>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={showDatePicker}
              >
                <Text style={styles.dateButtonText}>Select Date</Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={dob}
                mode="date"
                display="spinner"
                onChange={onChange}
                maximumDate={new Date()}
              />
            )}
          </>
        );
      case 2:
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666666"
              value={email}
              onChangeText={setEmail}
            />
            {/* Password Field */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.inputData}
                placeholder="Password"
                placeholderTextColor="#666666"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.icon}
              >
                <Ionicons 
                  name={showPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="#666666" 
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.inputData}
                placeholder="Confirm Password"
                placeholderTextColor="#666666"
                secureTextEntry={!showConfirmPassword}
                value={confirmpassword}
                onChangeText={setconfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.icon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="#666666" 
                />
              </TouchableOpacity>
            </View>
          </>
        );
      case 3:
        return (
          <>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#666666"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
            <Text style={styles.label}>Select Country</Text>
           <DropDownPicker
              open={open}
              value={selectedCountry}
              items={dropdownItems} 
              setOpen={setOpen}
              setValue={setSelectedCountry}
              placeholder="Select a Country"
              listMode="SCROLLVIEW"
              zIndex={1000}
              zIndexInverse={3000}
            />
          </>
        );
      case 4:
        return (
          <>
            {/* Class */}
            <Text style={styles.label}>Select Class</Text>
            <Picker
              selectedValue={selectedClass}
              style={styles.picker}
              onValueChange={(itemValue) => setSelectedClass(itemValue)}
            >
              <Picker.Item label="Select a class" value="" />
              {classes.map((cls) => (
                <Picker.Item
                  key={cls.id}
                  label={cls.ClassName}
                  value={cls.ClassName}
                />
              ))}
            </Picker>

            {/* Parent/Guardian Name */}
            <TextInput
              style={styles.input}
              placeholder="Parent/Guardian Name"
              placeholderTextColor="#666666"
              value={parentName}
              onChangeText={setParentName}
            />

            {/* Parent/Guardian Contact */}
            <TextInput
              style={styles.input}
              placeholder="Parent/Guardian Contact"
              placeholderTextColor="#666666"
              keyboardType="phone-pad"
              value={parentContact}
              onChangeText={setParentContact}
            />

            {/* Address */}
            <TextInput
              style={styles.input}
              placeholder="Address"
              placeholderTextColor="#666666"
              value={address}
              onChangeText={setAddress}
            />
          </>
        );
     
      default:
        return null;
    }
  };
  return (
    <ImageBackground
      source={require("../assets/Rectangle_106.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.top}>
        <Text style={styles.toptext}>Register</Text>
        <Text style={styles.topsubtext}>Sign up to begin your journey</Text>
      </View>

      <View style={styles.container}>
        <Text style={styles.title}>Register</Text>

        {/* Render the inputs */}
        <View style={{ flex: 1 }}>{renderStage()}</View>

        {/* --- NAVIGATION AREA --- */}
        <View style={styles.bottomArea}>
          {/* Row for Buttons Only */}
          <View style={styles.buttonRow}>
            {currentStage > 1 ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonOutline]}
                onPress={() => setCurrentStage((prev) => prev - 1)}
              >
                <Text style={[styles.buttonText, styles.textOutline]}>
                  Previous
                </Text>
              </TouchableOpacity>
            ) : (
             
              <View style={{ flex: 1, marginHorizontal: 5 }} />
            )}

            {currentStage < totalStages ? (
              <TouchableOpacity
                style={styles.button}
                onPress={() => setCurrentStage((prev) => prev + 1)}
              >
                <Text style={styles.buttonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>Register</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Login Link - Now Below the Buttons */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>
              You have an account?{" "}
              <Text style={styles.LogLink}>Login here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  top: {
    height: "20%",
    width: "100%",
    paddingLeft: 20,
    display: "flex",
   
    justifyContent: "center",
  },
  toptext: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fcfcfc",
  },
  topsubtext: {
    fontSize: 16,
    fontWeight: "400",
    color: "#cccccc",
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
    backgroundColor: "#fcfcfc",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 0,
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "white",
  },
  input: {
    borderWidth: 1,
    marginBottom: 24,
    padding: 10,
    borderRadius: 5,
    borderColor: "white",
    color: "white",
    backgroundColor: "#dddddd",
  },
  background: {
    flex: 1,
    justifyContent: "center",
  },
  picker: {
    borderWidth: 1,
    borderColor: "white",
    backgroundColor: "white",
    color: "black",
    marginBottom: 10,
  },
  label: {
    color: "",
    marginBottom: 5,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  bottomArea: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#864AF9",
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#864AF9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  textOutline: {
    color: "#864AF9",
  },
  linkContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  linkText: {
    color: "#333",
    fontSize: 14,
  },
  LogLink: {
    color: "#864af9",
    fontWeight: "bold",
  },
  dateDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: "#bbbbbb",
  },
  dateButton: {
    backgroundColor: "black",
    paddingVertical: 10,
    opacity: 0.8,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  dateButtonText: {
    color: "white",
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#dddddd",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 5,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  inputData: {
    flex: 1,
    paddingVertical: 10,
    color: "black",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    marginBottom: 24,
    padding: 10,
    borderRadius: 5,
    borderColor: "white",
    color: "black",
    backgroundColor: "#dddddd",
  },
  icon: {
    paddingLeft: 5,
  }
});
