# HomeEdu Mobile App 📚📱

HomeEdu is a React Native app for students to learn and practice different subjects through categorized topics, examples, and quizzes. It includes support for **mathematical equations** using **KaTeX rendering**, and features dynamic content fetched from a Laravel backend.

---

## ✨ Features

- 📘 Browse Subjects, Topics, and Subtopics
- 🧠 View Examples with LaTeX Math Rendering (`$$x^2 + y^2 = z^2$$`)
- ✅ Take Quizzes with Objective, Theory, and Fill-in-the-Blank questions
- 📤 Questions with Images, Videos, or Plain Text
- 💬 Real-time Preview for LaTeX in Admin Panel (Web)
- 🔐 User Authentication (optional)
- ⚙️ Dynamic content fetched from Laravel API

---

## 📦 Tech Stack

- **Frontend**: React Native + Expo Go
- **Backend**: Laravel REST API
- **Math Rendering**: [`react-native-katex`](https://github.com/tombatossals/react-native-katex)
- **Styling**: Custom with React Native `StyleSheet`
- **Media Support**: Images and Videos via `expo-image-picker` or file upload
- **Navigation**: React Navigation

---

## 🧮 LaTeX Rendering

Mathematical content in examples is wrapped in `$$ ... $$` and rendered using `react-native-katex`.

```js
// Example usage:
renderContentWithMath("The solution is $$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$", styles.text)



