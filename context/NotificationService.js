import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// --- CONFIGURATION ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// --- 1. DYNAMIC COPYWRITING ENGINE ---
const getMotivationMessage = (streak) => {
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

const _scheduleStreakNotification = async (streak, stars) => {
  const title = getMotivationMessage(streak);
  const body = getStarMessage(stars);

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      color: '#864AF9',
    },
    trigger: {
      hour: 18,
      minute: 0,
      repeats: true,
    },
  });
  console.log(`✅ Streak notification scheduled: "${title}"`);
};
// --- 4. WEEKLY CLASS REMINDERS (no cancel-all here) ---
const _scheduleWeeklyClasses = async (subjects) => {
  if (!subjects || subjects.length === 0) return;

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Weekends: remind at 9:00 AM (for 10:00 AM class)
    // Weekdays: remind at 2:30 PM (for 3:30 PM class)
    const notifyHour = isWeekend ? 9 : 14;
    const notifyMinute = isWeekend ? 0 : 30;

    const classHour = isWeekend ? 10 : 15;
    const classMinute = 30;

    // Guard: skip if notify hour goes negative (edge case)
    if (notifyHour < 0) continue;

    // Rotate subjects across days
    const subject = subjects[i % subjects.length];
    const subjectName = subject.Subject || subject.name || 'General Revision';

    // Build the exact trigger date & time
    const triggerDate = new Date(date);
    triggerDate.setHours(notifyHour, notifyMinute, 0, 0);

    // Skip if this time has already passed
    if (triggerDate < new Date()) continue;

    // Format class time for the notification body
    const displayHour = classHour > 12 ? classHour - 12 : classHour;
    const displayMinute = String(classMinute).padStart(2, '0');
    const displayPeriod = classHour >= 12 ? 'PM' : 'AM';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏳ Class in 1 Hour: ${subjectName}`,
        body: `Get ready! Your ${subjectName} session starts at ${displayHour}:${displayMinute} ${displayPeriod}.`,
        sound: true,
        color: '#864AF9',
      },
      trigger: triggerDate,
    });

    console.log(`✅ Scheduled "${subjectName}" for ${date.toDateString()} at ${notifyHour}:${String(notifyMinute).padStart(2, '0')}`);
  }
};

export const rescheduleAll = async (streak, stars, subjects) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🗑️ All old notifications cleared.');

  await _scheduleStreakNotification(streak, stars);
  await _scheduleWeeklyClasses(subjects);

  console.log('✅ All notifications rescheduled.');
};

// ✅ UPDATED: These no longer cancel-all
export const scheduleDynamicStreak = async (streak, stars) => {
  await _scheduleStreakNotification(streak, stars);
};

export const scheduleWeeklyClasses = async (subjects) => {
  await _scheduleWeeklyClasses(subjects);
};

// --- 6. IMMEDIATE TEST TRIGGER ---
export const sendImmediateTest = async () => {
  const hasPermission = await registerForPushNotifications();
  if (!hasPermission) {
    alert('Permission missing! Check phone settings.');
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 It Works!',
      body: 'If you see this, your notifications are set up correctly.',
      sound: true,
      color: '#864AF9',
    },
    trigger: null, // Fire immediately
  });
  console.log('✅ Test notification fired.');
};