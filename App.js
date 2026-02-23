import React, { useEffect, useRef } from 'react'; // Added useRef
import { View, ActivityIndicator, Alert, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';

// --- IMPORTS ---
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { UserProvider } from './context/UserContext';
// ... (Your other screen imports)
import QuestionScreen from './screens/QuestionScreen';
import DashboardScreen from './screens/DashboardScreen';
import SubjectScreen from './screens/SubjectScreen';
import TopicScreen from './screens/TopicScreen';
import SubtopicScreen from './screens/SubtopicScreen';
import ExplanationScreen from './screens/ExplanationScreen';
import ExampleScreen from './screens/ExampleScreen';
import ExamScreen from './screens/ExamScreen';
import QuestionTestScreen from './screens/test_screen';
import NovelScreen from './screens/NovelScreen';
import InstructionScreen from './screens/InstructionScreen';
import ErrorBoundary from './screens/errors/indexScreen';

// --- IMPORT MUSIC PROVIDER ---
import { BackgroundMusicProvider, BackgroundMusicContext } from './context/BackgroundMusicProvider'; // Adjust path if needed

import { useFonts } from 'expo-font';
import 'react-native-gesture-handler';

const Stack = createStackNavigator();
LogBox.ignoreLogs(['new NativeEventEmitter']);

function getActiveRouteName(navigationState) {
  if (!navigationState) return null;
  const route = navigationState.routes[navigationState.index];
  // Dive into nested navigators
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
}

const AppNavigator = () => {
  const { handleScreenChange } = React.useContext(BackgroundMusicContext);
  const navigationRef = useRef();
  const routeNameRef = useRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = getActiveRouteName(navigationRef.current.getRootState());
        handleScreenChange(routeNameRef.current);
      }}
      onStateChange={(state) => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getActiveRouteName(state);

        if (previousRouteName !== currentRouteName) {
          // Screen changed! Trigger music switch
          handleScreenChange(currentRouteName);
          routeNameRef.current = currentRouteName;
        }
      }}
    >
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Subject" component={SubjectScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Topic" component={TopicScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Subtopic" component={SubtopicScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Explanation" component={ExplanationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Example" component={ExampleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Question" component={QuestionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Test" component={QuestionTestScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Novel" component={NovelScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Exam" component={ExamScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Instruction" component={InstructionScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  // --- 1. EAS UPDATE LOGIC ---
  useEffect(() => {
    async function onFetchUpdateAsync() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            "Update Available",
            "A new version is ready. Restarting...",
            [{ text: "OK", onPress: async () => await Updates.reloadAsync() }]
          );
        }
      } catch (error) {
        console.log("Error fetching updates:", error);
      }
    }
    onFetchUpdateAsync();
  }, []);

  // --- 2. FONT LOADING ---
  const [fontsLoaded] = useFonts({
    'milkyCustom': require('./assets/fonts/milkyCustom.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#864AF9" />
      </View>
    );
  }

  // --- 3. RENDER ---
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <UserProvider>
          <BackgroundMusicProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfc' }}>
              <AppNavigator />
            </SafeAreaView>
          </BackgroundMusicProvider>
        </UserProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}