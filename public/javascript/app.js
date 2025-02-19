import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

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


document.getElementById("subscribe").addEventListener("click", async () => {
    try {
        const token = await getToken(messaging, {
            vapidKey: "BDhQxlMBmyq4wfmcEu3QXV3k_b7rhPdyoE9C0q3ftnNe_bC9tRnBZpmwBAzj72-9UJcevR9GuYjCXfpd3Y13uiU",
        });

        console.log("Generated FCM Token:", token); // ✅ Logs token in the console

        if (token) {
            console.log("FCM Token:", token);

            // Send token to backend
            await fetch("http://localhost:3000/send-notification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });

            console.log("Token sent to backend successfully.");
        } else {
            console.warn("No FCM token received.");
        }
    } catch (error) {
        console.error("Permission Denied", error);
    }
});

// Handle Foreground Notifications
onMessage(messaging, (payload) => {
    console.log("Message Received:", payload);
    alert(`New Notification: ${payload.notification.title} - ${payload.notification.body}`);
});
