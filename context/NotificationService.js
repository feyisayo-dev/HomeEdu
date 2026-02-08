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

// --- 4. NEW: SCHEDULE WEEKLY CLASSES (7 Days at once) ---
export const scheduleWeeklyClasses = async (subjects) => {
  // Cancel old ones so we don't get duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!subjects || subjects.length === 0) return;

  // Loop through the next 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i); // Move forward i days

    const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 1. Pick the Time
    // Weekends: 10:00 AM | Weekdays: 3:30 PM
    const triggerHour = isWeekend ? 10 : 15; // 15 = 3 PM
    const triggerMinute = 30;

    // 2. Notification Time (1 Hour Before)
    let notifyHour = triggerHour - 1; 

    // 3. Pick a Subject (Rotate through the list)
    // If you have 3 subjects, Day 1 = Subj 1, Day 2 = Subj 2, Day 3 = Subj 3, Day 4 = Subj 1...
    const subject = subjects[i % subjects.length]; 
    const subjectName = subject.Subject || subject.name || "General Revision";

    // 4. Construct the Trigger Date
    const triggerDate = new Date(date);
    triggerDate.setHours(notifyHour, triggerMinute, 0, 0);

    // Don't schedule if the time has already passed today
    if (triggerDate < new Date()) continue;

    // 5. Schedule It
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ Class in 1 Hour: ${subjectName}`,
        body: `Get ready! Your ${subjectName} session starts at ${triggerHour > 12 ? triggerHour - 12 : triggerHour}:${triggerMinute} ${triggerHour >= 12 ? 'PM' : 'AM'}.`,
        sound: true,
      },
      trigger: triggerDate, // Fires at this exact date & time
    });
    
    console.log(`✅ Scheduled ${subjectName} for ${date.toDateString()} at ${notifyHour}:${triggerMinute}`);
  }
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
