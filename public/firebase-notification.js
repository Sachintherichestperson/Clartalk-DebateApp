import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-messaging.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-analytics.js";
import { getInAppMessaging } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-in-app-messaging.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAt9ZJs2CBEKFOK_T72QIQjVlidoBgiY-Q",
    authDomain: "clartalk-94a92.firebaseapp.com",
    projectId: "clartalk-94a92",
    storageBucket: "clartalk-94a92.appspot.com",
    messagingSenderId: "220220136589",
    appId: "1:220220136589:web:80ce8c1c77fb718c4bd6c4",
    measurementId: "G-SXR988HK5W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const analytics = getAnalytics(app);
const inAppMessaging = getInAppMessaging(app);

// Register Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/firebase-messaging-sw.js")
        .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
        })
        .catch((error) => {
            console.error("Service Worker registration failed:", error);
        });
}

// Enable In-App Messaging (optional: delay messages to avoid spam)
inAppMessaging.setMessagesSuppressed(false);

// Handle Foreground Push Notifications
onMessage(messaging, (payload) => {
    console.log("New foreground message:", payload);

    // Show Browser Notification
    navigator.serviceWorker.getRegistration().then(registration => {
        registration.showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/images/nav.png"
        });
    });

    // Show In-App Message
    showInAppMessage(payload.notification);
});

// Function to Display In-App Messages
function showInAppMessage(notification) {
    const messageBox = document.createElement("div");
    messageBox.innerHTML = `
        <div style="position: fixed; bottom: 10px; right: 10px; background: #333; color: white; padding: 10px; border-radius: 5px; z-index: 1000;">
            <strong>${notification.title}</strong>
            <p>${notification.body}</p>
            <button onclick="this.parentElement.remove()">Close</button>
        </div>
    `;
    document.body.appendChild(messageBox);
}
