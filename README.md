# HomeEdu 🌟📚

**HomeEdu** is a learning platform designed to help children and students improve academically, both at home and in school. It is available as a **Mobile app** and a **mobile app** with curriculum-aligned content, interactive exercises, progress tracking, and math rendering support using LaTeX.

---

## 🖥 Web App Overview

The **HomeEdu Web App** is built with React.js and focuses on improving **reading skills** through guided lessons, gamified exercises, and offline learning support.

### 🌟 Features

* 📖 **Curriculum-Based Reading** – Structured lessons that match school syllabi
* 🎤 **Audio Assistance** – Text-to-speech for better pronunciation
* 📊 **Progress Tracking** – View learning reports
* 🎮 **Gamified Exercises** – Make reading engaging and fun
* 🔗 **Offline Mode** – Learn without internet

### 🛠 Tech Stack

* **Frontend:** React Native
* **Styling:**  Material UI
* **Backend:** Laravel
* **Database:** Mysql

---

## 📱 Mobile App Overview

The **HomeEdu Mobile App** (React Native + Expo) helps students across subjects using quizzes, categorized content, and math equations via LaTeX rendering. It connects to a Laravel backend for dynamic content.

### ✨ Features

* 📘 Browse Subjects, Topics, and Subtopics
* 🧠 View Examples with LaTeX Math Rendering (`$$x^2 + y^2 = z^2$$`)
* ✅ Take quizzes with Objective, Theory & Fill-in-the-Blank types
* 📤 Supports image and video questions
* 💬 Real-time LaTeX preview in the Admin Panel
* 🔐 Optional user login and session tracking
* ⚙️ API-driven content via Laravel

### 📦 Tech Stack

* **Frontend:** React Native with Expo Go
* **Backend:** Laravel REST API
* **Math Rendering:** `react-native-katex`
* **Media:** `expo-image-picker` and custom upload
* **Navigation:** React Navigation

### 🧮 LaTeX Support

Math expressions like the quadratic formula:

```js
renderContentWithMath("The solution is $$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$", styles.text)
```

---

## 🚀 Installation

### Mobile App Setup

```bash
git clone https://github.com/offeyicial/homeedu.git
cd homeedu
npm install
npm start
```

### Mobile App Setup

```bash
git clone https://github.com/your-username/homeedu-mobile.git
cd homeedu-mobile
npm install
npx expo start
```

---

## 🤝 Contribution

Contributions are welcome! Follow these steps:

1. Fork the repository
2. Create a new feature branch:

   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:

   ```bash
   git commit -m "Add feature"
   ```
4. Push and submit a Pull Request

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).

---

Let me know if you'd like this split into two separate `README`s or want deployment instructions included!
