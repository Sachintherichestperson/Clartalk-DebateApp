import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAt9ZJs2CBEKFOK_T72QIQjVlidoBgiY-Q",
  authDomain: "clartalk-94a92.firebaseapp.com",
  projectId: "clartalk-94a92",
  storageBucket: "clartalk-94a92.appspot.com",
  messagingSenderId: "220220136589",
  appId: "1:220220136589:web:80ce8c1c77fb718c4bd6c4",
  measurementId: "G-SXR988HK5W"
};
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./javascript/firebase-messaging-sw.js")  // ✅ Adjusted path
      .then((registration) => {
        console.log("Service Worker registered:", registration);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
}