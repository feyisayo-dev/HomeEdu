import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Alert, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import 'react-native-gesture-handler';

// ── NEW IMPORTS FOR OFFLINE SYNC ──
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

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
import * as Notifications from 'expo-notifications';
// --- IMPORT MUSIC PROVIDER ---
import { BackgroundMusicProvider, BackgroundMusicContext } from './context/BackgroundMusicProvider';
const BACKGROUND_SYNC_TASK = 'background-report-sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return BackgroundFetch.BackgroundFetchResult.NoData;

    const queueStr = await AsyncStorage.getItem('@offline_reports_queue');
    if (!queueStr) return BackgroundFetch.BackgroundFetchResult.NoData;

    let queue = JSON.parse(queueStr);
    const now = Date.now();
    const itemsToSync = queue.filter(item => now >= item.syncAfter);

    if (itemsToSync.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

    console.log(`[BACKGROUND] Syncing ${itemsToSync.length} items...`);
    let syncedIds = [];

    for (const item of itemsToSync) {
      const { syncAfter, id, ...payload } = item;
      const res = await fetch('https://homeedu.fsdgroup.com.ng/api/ExamReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) syncedIds.push(id);
    }

    // Keep failed/pending items
    const remainingQueue = queue.filter(item => !syncedIds.includes(item.id));
    await AsyncStorage.setItem('@offline_reports_queue', JSON.stringify(remainingQueue));

    return syncedIds.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.Failed;

  } catch (error) {
    console.error("[BACKGROUND] Task Failed", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
const Stack = createStackNavigator();
LogBox.ignoreLogs(['new NativeEventEmitter']);

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
  // ── 0. ASK FOR NOTIFICATION PERMISSIONS ON STARTUP ──
  useEffect(() => {
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
    };

    requestPermissions();
  }, []);
  // --- 1. LOAD FONTS ---
  const [fontsLoaded] = useFonts({
    'milkyCustom': require('./assets/fonts/milkyCustom.ttf'),
  });

  // --- 2. INITIALIZATION EFFECT ---
  useEffect(() => {
    async function prepare() {
      try {
        // App pre-loading logic
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  // --- 3. DELAYED UPDATE CHECK ---
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
          console.log("Error fetching updates:", error);
        }
      };

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

  // ── 5. THE STEALTH SYNC ENGINE ─────────────────────────────────────────────
  useEffect(() => {
    let isSyncing = false;

    // Helper to pause execution
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const processOfflineQueue = async () => {
      if (isSyncing) return;
      isSyncing = true;

      try {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          isSyncing = false;
          return;
        }

        const queueStr = await AsyncStorage.getItem('@offline_reports_queue');
        if (!queueStr) {
          isSyncing = false;
          return;
        }

        let queue = JSON.parse(queueStr);
        if (queue.length === 0) {
          isSyncing = false;
          return;
        }

        const now = Date.now();
        const itemsToSync = queue.filter(item => now >= item.syncAfter);
        const remainingItems = queue.filter(item => now < item.syncAfter);

        if (itemsToSync.length === 0) {
          isSyncing = false;
          return;
        }

        console.log(`[SYNC ENGINE] Waking up... Found ${itemsToSync.length} reports to upload.`);
        let successfullySyncedIds = [];

        for (const item of itemsToSync) {
          try {
            const { syncAfter, id, ...payload } = item;

            const res = await fetch('https://homeedu.fsdgroup.com.ng/api/ExamReport', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok || data.status === 200) {
              successfullySyncedIds.push(id);
              console.log(`[SYNC ENGINE] ✅ Report ${id} uploaded successfully!`);
            }
          } catch (err) {
            console.log(`[SYNC ENGINE] ❌ Failed to upload report ${item.id}. Will retry later.`, err);
          }

          // THE API THROTTLE: Wait 2 seconds before sending the next report from this same phone
          await sleep(2000);
        }

        if (successfullySyncedIds.length > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "HomeEdu Sync Complete ✅",
              body: `${successfullySyncedIds.length} offline exam(s) successfully submitted.`,
            },
            trigger: null,
          });
        }

        const failedItems = itemsToSync.filter(item => !successfullySyncedIds.includes(item.id));
        const finalQueue = [...remainingItems, ...failedItems];

        await AsyncStorage.setItem('@offline_reports_queue', JSON.stringify(finalQueue));

      } catch (e) {
        console.error("[SYNC ENGINE] Error processing queue", e);
      } finally {
        isSyncing = false;
      }
    };

    processOfflineQueue();
    const intervalId = setInterval(processOfflineQueue, 2 * 60 * 1000);
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        processOfflineQueue();
      }
    });

    return () => {
      clearInterval(intervalId);
      unsubscribeNet();
    };
  }, []);
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const registerBackgroundSync = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (!isRegistered) {
          await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
            minimumInterval: 15 * 60, // Minimum 15 minutes (OS controls actual time)
            stopOnTerminate: false,   // Keep running if app is killed (Android mostly)
            startOnBoot: true,        // Restart after phone reboot (Android mostly)
          });
          console.log("[BACKGROUND] Task Registered!");
        }
      } catch (err) {
        console.error("Failed to register background task", err);
      }
    };

    registerBackgroundSync();
  }, []);
  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  // --- 6. RENDER ---
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