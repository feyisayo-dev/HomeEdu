import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
// --- CONFIGURATION ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- 1. DYNAMIC COPYWRITING ENGINE ---
const getMotivationMessage = (streak, stars) => {
  // Logic: High Streak vs Low Streak
  if (streak >= 7) {
    const texts = [
      `🔥 ${streak} Day Streak! You are UNSTOPPABLE!`,
      `Don't let the flame die now! ${streak} days in a row! 😤`,
      `You're an Academic Weapon. ${streak} days strong. 💪`,
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  } else if (streak > 0) {
    const texts = [
      `👀 You're on a roll! ${streak} days so far.`,
      `Keep it going! Day ${streak + 1} awaits.`,
      `Consistency is key. Great job on ${streak} days!`,
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  } else {
    // Zero Streak - Urgency needed
    const texts = [
      `😢 You have 0 Streak. Start today!`,
      `The leaderboard is moving without you. 🏃‍♂️`,
      `Claim your spot! Start a new streak now.`,
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  }
};

const getStarMessage = (stars) => {
  return `You have ${stars} ⭐ Stars. Top 3 is within reach!`;
};

// --- 2. PERMISSIONS ---
export const registerForPushNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#864AF9',
    });
  }
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
};

// --- 3. DYNAMIC STREAK NOTIFICATION ---
export const scheduleDynamicStreak = async (streak, stars) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const title = getMotivationMessage(streak, stars);
  const body = getStarMessage(stars);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      sound: true,
      color: '#864AF9',
    },
    trigger: {
      hour: 18, // 6:00 PM Daily Check-in
      minute: 0,
      repeats: true,
    },
  });
  console.log(`✅ Scheduled: "${title}"`);
};

// --- 4. TIMETABLE ALERT (1 Hour Before) ---
export const scheduleTimetableAlert = async (firstSubject, timeString) => {
  // Input: "Math", "3:30 PM"
  // Goal: Notify at "2:30 PM"
  
  if (!timeString) return;

  // 1. Parse Time "3:30 PM" -> Hours/Minutes
  const [time, modifier] = timeString.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  else hours = parseInt(hours, 10);

  // 2. Subtract 1 Hour
  let notifyHour = hours - 1;
  if (notifyHour < 0) notifyHour = 23; // Handle midnight edge case

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏳ Class in 1 Hour: ${firstSubject}`,
      body: `Get ready! Your ${firstSubject} session starts at ${timeString}.`,
      sound: true,
    },
    trigger: {
      hour: notifyHour,
      minute: parseInt(minutes, 10),
      repeats: true, // Assuming daily schedule for simplicity
    },
  });
  console.log(`✅ Class Alert set for ${notifyHour}:${minutes}`);
};

// --- 5. IMMEDIATE TEST TRIGGER ---
export const sendImmediateTest = async () => {
  // 1. Check permissions first
  const hasPermission = await registerForPushNotifications();
  if (!hasPermission) {
    alert("Permission missing! Check phone settings.");
    return;
  }

  // 2. Schedule immediate notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔔 It Works!",
      body: "If you see this, your notifications are fixed.",
      sound: true,
      color: '#864AF9',
    },
    trigger: null, // 'null' means fire immediately
  });
  console.log("✅ Test notification fired");
};