
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// import { getDatabase, ref, set, onValue , get} from "firebase/database";

// const firebaseConfig = {
//   apiKey: "AIzaSyDgWtOBw__3H_wLQgqhKHW8MIFRipE3x4A",
//   authDomain: "codeshare-ffa3b.firebaseapp.com",
//   projectId: "codeshare-ffa3b",
//   storageBucket: "codeshare-ffa3b.firebasestorage.app",
//   messagingSenderId: "758234233862",
//   appId: "1:758234233862:web:60f84365369c7fc9919787",
//   measurementId: "G-VRM7PNXEL5"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const db = getDatabase(app);

// export { db, ref, set, onValue ,};



import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get } from "firebase/database";

// Initialize Firebase with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL, // Required for Realtime DB
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, get };