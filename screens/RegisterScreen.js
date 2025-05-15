import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Image } from 'react-native';
export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmpassword, setconfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState(new Date()); // Store date of birth
  const [showPicker, setShowPicker] = useState(false); // Toggle picker visibility
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [address, setAddress] = useState('');
  const [Country, setCountry] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryList, setCountryList] = useState([]); // State for countries
  const [open, setOpen] = useState(false);
  const [currentStage, setCurrentStage] = useState(1);

  const totalStages = 4;

  useEffect(() => {
    // Fetch classes from the backend when the component mounts
    const fetchClasses = async () => {
      try {
        const response = await fetch("https://homeedu.fsdgroup.com.ng/api/fetchAllClasses");
        const data = await response.json();
        console.log("This is the data gotten from backend", data)
        if (data.status === 200) {
          setClasses(data.Classes); // Assuming the classes array is in the "data" property
        } else {
          console.error("Failed to fetch classes");
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };


    const fetchCountries = async () => {
      try {
        const cachedCountries = await AsyncStorage.getItem('countries');

        if (cachedCountries) {
          // If cached data exists, load it from AsyncStorage
          console.log('Loaded countries from AsyncStorage');
          setCountryList(JSON.parse(cachedCountries));
        } else {
          // Fetch from the API if not cached
          const response = await axios.get(
            'https://backendapiendpoint.fsdgroup.com.ng/api/GetCountries'
          );
          const data = response.data;

          if (data.countries && data.countries.length > 0) {
            // Cache the data in AsyncStorage
            await AsyncStorage.setItem('countries', JSON.stringify(data.countries));
            setCountryList(data.countries);
          } else {
            console.error('No countries found in API response.');
            Alert.alert('Error', 'No countries available.');
          }
        }
      } catch (error) {
        console.error('Error fetching countries:', error.message);
        Alert.alert('Error', 'Failed to fetch countries.');
      }
    };

    fetchClasses();
    fetchCountries();
  }, []);
  const onChange = (event, selectedDate) => {
    if (selectedDate) {
      setDob(selectedDate); // Update DOB with selected date
    }
    setShowPicker(false); // Hide the picker
  };

  const showDatePicker = () => setShowPicker(true); // Show the picker

  const handleRegister = async () => {
    // Validate inputs (Optional, but highly recommended)
    if (
      !username ||
      !fullName ||
      !dob ||
      !email ||
      !password ||
      !confirmpassword ||
      !phoneNumber ||
      !selectedClass ||
      !selectedCountry ||
      !parentName ||
      !parentContact ||
      !address
    ) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    if (password !== confirmpassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    try {
      // Make the POST request to the server
      const response = await axios.post('https://homeedu.fsdgroup.com.ng/api/AddStudent', {
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
      });

      // Handle success
      Alert.alert('Success', response.data.message);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      // Handle errors
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Registration failed'
      );

      console.log("This is the error gotten", response.data.message)
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

              <TouchableOpacity style={styles.dateButton} onPress={showDatePicker}>
                <Text style={styles.dateButtonText}>Select Date</Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                value={dob}
                mode="date" // Only date selection
                display='spinner'
                onChange={onChange}
                maximumDate={new Date()} // Prevent future dates
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
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#666666"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#666666"
              secureTextEntry
              value={confirmpassword}
              onChangeText={setconfirmPassword}
            />
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
              items={countryList.map((country) => ({
                label: `${country.name}`,
                value: country.id,
                icon: () => (
                  <Image
                    source={{ uri: country.flag_img }}
                    style={{ width: 20, height: 15, resizeMode: 'contain' }}
                  />
                ),
              }))}
              setOpen={setOpen}
              setValue={setSelectedCountry}
              placeholder="Select a Country"
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
                <Picker.Item key={cls.id} label={cls.ClassName} value={cls.ClassName} />
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
        )
      // Add more stages as needed
      default:
        return null;
    }
  }
  return (
    <ImageBackground
      source={require('../assets/Rectangle_106.png')}
      style={styles.background}
      resizeMode="cover">
      <View style={styles.top}>
        <Text style={styles.toptext}>Register</Text>
        <Text style={styles.topsubtext}>Sign up to begin your journey</Text>
      </View>
      <View style={styles.container}>
        <Text style={styles.title}>Register</Text>
        {renderStage()}
        <View style={styles.navigationButtons}>
          {currentStage > 1 && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setCurrentStage((prev) => prev - 1)}
            >
              <Text style={styles.buttonText}>Previous</Text>
            </TouchableOpacity>
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
          <Text onPress={() => navigation.navigate('Login')
          } style={styles.link}>
            You have an account? <Text style={styles.LogLink}>Login here</Text>
          </Text>
        </View>
      </View>
    </ImageBackground>
  );

}

const styles = StyleSheet.create({
  top: {
    height: '20%',
    width: '100%',
    paddingLeft: 20,
    display: 'flex',
    // alignItems: 'center',
    justifyContent: 'center',
  },
  toptext: {
    fontSize: 36,
    fontWeight: 700,
    color: '#fcfcfc'
  },
  topsubtext: {
    fontSize: 16,
    fontWeight: 400,
    color: '#cccccc'
  },
  container: {
    flex: 1,
    justifyContent: 'start',
    padding: 20,
    paddingTop: 60,
    //backgroundColor: 'rgba(0, 0, 0, 0.5)', // Add transparency overlay
    backgroundColor: '#fcfcfc',
    borderTopLeftRadius: '20%',
    borderTopRightRadius: '0'
  },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center', color: 'white' },
  input: {
    borderWidth: 1,
    marginBottom: 24,
    padding: 10,
    borderRadius: 5,
    borderColor: 'white',
    color: 'white',
    backgroundColor: '#dddddd'
  },
  background: {
    flex: 1,
    justifyContent: 'center',
  },
  picker: {
    borderWidth: 1,
    borderColor: 'white',
    backgroundColor: 'white',
    color: 'black',
    marginBottom: 10,
  },
  label: {
    color: '',
    marginBottom: 5,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  button: {
    //backgroundColor: 'rgba(0, 0, 0, 0.8)', // Black background with 0.8 opacity
    backgroundColor: '#864AF9', // Black background with 0.8 opacity
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10, // Rounded corners
    marginHorizontal: 5, // Space between buttons
  },
  buttonText: {
    color: '#fff', // White text
    fontSize: 16,
    textAlign: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#bbbbbb',
  },
  dateButton: {
    backgroundColor: 'black',
    paddingVertical: 10,
    opacity: 0.8,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  dateButtonText: {
    color: 'white',
    fontSize: 16,
  },
  LogLink: {
    color: '#864af9',
  },
});
