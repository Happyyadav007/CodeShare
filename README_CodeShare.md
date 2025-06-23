# ⚡ CodeShare

> Real-time Collaborative Code Editor — Fast. Minimal. Built with 💙 React + Vite.

CodeShare is a sleek, real-time collaborative code editor that lets developers write and share code live. Ideal for pair programming, teaching, or live interviews — without the setup hassle.

[🚀 Live Demo](https://code-share-pied.vercel.app)

---

## ✨ Features

- 🔄 **Live collaboration** using Firebase Realtime Database
- 🎨 **Syntax Highlighting** with Monaco Editor (or customizable)
- ⚡ **Lightning-fast** performance with Vite bundler
- 📱 **Minimal UI**, responsive and intuitive
- 🌐 **Instant sharing** via dynamic URLs

---

## 🛠️ Tech Stack

| Frontend | Tools & Libraries | Hosting |
|----------|-------------------|---------|
| React    | Firebase          | Vercel  |
| Vite     | ESLint            |         |

---

## 📁 Folder Structure

```
CodeShare/
├── public/              # Static assets (logo, icons)
├── src/
│   ├── components/      # Home and Editor components
│   ├── assets/          # Icons like react.svg
│   ├── App.jsx          # Main app routing
│   ├── firebase.js      # Firebase config
│   └── main.jsx         # App entry point
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/Happyyadav007/CodeShare.git
cd CodeShare
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```
Visit `http://localhost:5173` to view the app.

---

## 🔐 Firebase Setup

This project uses Firebase Realtime Database. Make sure to:

1. Create a Firebase project
2. Enable Realtime Database
3. Replace your config in `src/firebase.js`:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  ...
};
```

---

## 📦 Deployment

The project is ready for Vercel deployment:

```bash
npm run build
```

You can also use the included `vercel.json` for custom deployment settings.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork this repo
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'feat: add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Submit a Pull Request

---

## 📄 License

Licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author

Made with ❤️ by [Happy Yadav](https://github.com/Happyyadav007)
