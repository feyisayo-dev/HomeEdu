import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Alert, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen'; // ✅ IMPORT THIS
import { useFonts } from 'expo-font';
import 'react-native-gesture-handler';

// --- IMPORTS ---
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import { UserProvider } from './context/UserContext';
import QuestionScreen from './screens/QuestionScreen';
import DashboardScreen from './screens/DashboardScreen';
import SubjectScreen from './screens/SubjectScreen';
import TopicScreen from './screens/TopicScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import SubtopicScreen from './screens/SubtopicScreen';
import ExplanationScreen from './screens/ExplanationScreen';
import ExampleScreen from './screens/ExampleScreen';
import ExamScreen from './screens/ExamScreen';
import QuestionTestScreen from './screens/test_screen';
import NovelScreen from './screens/NovelScreen';
import InstructionScreen from './screens/InstructionScreen';
import SettingsScreen from './screens/SettingsScreen';
import ErrorBoundary from './screens/errors/indexScreen';

// --- IMPORT MUSIC PROVIDER ---
import { BackgroundMusicProvider, BackgroundMusicContext } from './context/BackgroundMusicProvider';

const Stack = createStackNavigator();
LogBox.ignoreLogs(['new NativeEventEmitter']);

// ✅ PREVENT SPLASH SCREEN FROM HIDING AUTOMATICALLY
// This keeps your logo visible while fonts/data load, preventing the "White Screen"
SplashScreen.preventAutoHideAsync();

function getActiveRouteName(navigationState) {
  if (!navigationState) return null;
  const route = navigationState.routes[navigationState.index];
  if (route.state) {
    return getActiveRouteName(route.state);
  }
  return route.name;
}

const AppNavigator = ({ onAppReady }) => {
  const { handleScreenChange } = React.useContext(BackgroundMusicContext);
  const navigationRef = useRef();
  const routeNameRef = useRef();
  const [isNavigatorReady, setIsNavigatorReady] = useState(false);

  useEffect(() => {
    if (isNavigatorReady) {
      // Give HomeScreen a moment to start rendering before hiding splash
      setTimeout(() => {
        onAppReady?.();
      }, 300);
    }
  }, [isNavigatorReady, onAppReady]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = getActiveRouteName(navigationRef.current.getRootState());
        handleScreenChange(routeNameRef.current);
        setIsNavigatorReady(true);
      }}
      onStateChange={(state) => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = getActiveRouteName(state);

        if (previousRouteName !== currentRouteName) {
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
        <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Explanation" component={ExplanationScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Example" component={ExampleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Question" component={QuestionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Test" component={QuestionTestScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Novel" component={NovelScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Exam" component={ExamScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Instruction" component={InstructionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);

  // --- 1. LOAD FONTS ---
  const [fontsLoaded] = useFonts({
    'milkyCustom': require('./assets/fonts/milkyCustom.ttf'),
  });

  // --- 2. INITIALIZATION EFFECT ---
  useEffect(() => {
    async function prepare() {
      try {
        // You can pre-load images or other heavy assets here if needed
        // We do NOT run Updates check here anymore to avoid freezing startup
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // --- 3. DELAYED UPDATE CHECK ---
  // We run this only AFTER the app is ready and fonts are loaded.
  // This prevents the "Check for Updates" network call from freezing the launch.
  useEffect(() => {
    if (appIsReady && fontsLoaded && !__DEV__) {
      const checkUpdates = async () => {
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
          // Fail silently, don't bug the user
          console.log("Error fetching updates:", error);
        }
      };
      
      // Wait 3 seconds after launch to check for updates
      setTimeout(checkUpdates, 3000);
    }
  }, [appIsReady, fontsLoaded]);


  // --- 4. HIDE SPLASH SCREEN CALLBACK ---
  const handleAppReady = useCallback(async () => {
    if (!splashHidden && appIsReady && fontsLoaded) {
      try {
        await SplashScreen.hideAsync();
        setSplashHidden(true);
      } catch (e) {
        console.warn(e);
      }
    }
  }, [appIsReady, fontsLoaded, splashHidden]);

  if (!appIsReady || !fontsLoaded) {
    return null; // Keep the native splash screen visible
  }

  // --- 5. RENDER ---
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <UserProvider>
          <BackgroundMusicProvider>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fcfcfc' }}>
              <AppNavigator onAppReady={handleAppReady} />
            </SafeAreaView>
          </BackgroundMusicProvider>
        </UserProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}