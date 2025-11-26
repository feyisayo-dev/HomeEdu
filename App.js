import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { UserProvider } from './context/UserContext';
import QuestionScreen from './screens/QuestionScreen';
import DashboardScreen from './screens/DashboardScreen';
import SubjectScreen from './screens/SubjectScreen';
import TopicScreen from './screens/TopicScreen';
import SubtopicScreen from './screens/SubtopicScreen';
import ExplanationScreen from './screens/ExplanationScreen';
import ExampleScreen from './screens/ExampleScreen';
import ExamScreen from './screens/ExamScreen';
import MathTestScreen from './screens/test_screen';
import { useFonts } from 'expo-font';
import 'react-native-gesture-handler';

const Stack = createStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'milkyCustom': require('./assets/fonts/milkyCustom.ttf'),
  });

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" style={{ marginTop: 100 }} />;
  }

  return (
    <SafeAreaProvider>
      <UserProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfc' }}>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Home">
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Subject" component={SubjectScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Topic" component={TopicScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Explanation" component={ExplanationScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Example" component={ExampleScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Subtopic" component={SubtopicScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Question" component={QuestionScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Test" component={MathTestScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Exam" component={ExamScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </UserProvider>
    </SafeAreaProvider>
  );
}
