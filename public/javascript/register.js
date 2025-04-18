import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyAt9ZJs2CBEKFOK_T72QIQjVlidoBgiY-Q",
    authDomain: "clartalk-94a92.firebaseapp.com",
    databaseURL: "https://clartalk-94a92-default-rtdb.firebaseio.com",
    projectId: "clartalk-94a92",
    storageBucket: "clartalk-94a92.firebasestorage.app",
    messagingSenderId: "220220136589",
    appId: "1:220220136589:web:80ce8c1c77fb718c4bd6c4",
    measurementId: "G-SXR988HK5W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

document.getElementById("Sign-up").addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent form submission until token is set

    let fcmToken = ""; // Default value

    try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            fcmToken = await getToken(messaging, {
                vapidKey: "BDhQxlMBmyq4wfmcEu3QXV3k_b7rhPdyoE9C0q3ftnNe_bC9tRnBZpmwBAzj72-9UJcevR9GuYjCXfpd3Y13uiU"
            });

            if (!fcmToken) {
                console.log("No registration token available, generating fallback token.");
                fcmToken = generateFallbackToken(); // Generate fallback token
            }
        } else {
            console.log("Notification permission denied, generating fallback token.");
            fcmToken = generateFallbackToken(); // Generate fallback token
        }
    } catch (error) {
        console.error("Error retrieving token:", error);
        fcmToken = generateFallbackToken(); // Generate fallback token
    }

    document.getElementById("fcmToken").value = fcmToken; // Store token in hidden field
    document.getElementById("Sign-up").submit(); // Submit form
});

// Function to generate a random fallback token
function generateFallbackToken() {
    return "Fallback-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
