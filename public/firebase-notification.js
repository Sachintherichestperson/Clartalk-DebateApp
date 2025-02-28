        // Import Firebase SDKs
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
        import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-messaging.js";

        // Firebase Configuration
        const firebaseConfig = {
            apiKey: FIREBASE_API_KEY,
            authDomain: FIREBASE_AUTH_DOMAIN,
            projectId: FIREBASE_PROJECT_ID,
            storageBucket: FIREBASE_STORAGE_BUCKET,
            messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
            appId: FIREBASE_APP_ID,
            measurementId: FIREBASE_MEASUREMENT_ID
};

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

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

        // Request Permission for Notifications
        // function requestPermission() {
        //     Notification.requestPermission().then(permission => {
        //         if (permission === "granted") {
        //             console.log("Notification permission granted.");
        //             getToken(messaging, { vapidKey: "BDhQxlMBmyq4wfmcEu3QXV3k_b7rhPdyoE9C0q3ftnNe_bC9tRnBZpmwBAzj72-9UJcevR9GuYjCXfpd3Y13uiU" })
        //                 .then((currentToken) => {
        //                     if (currentToken) {
        //                         console.log("FCM Token:", currentToken);
        //                         sendTokenToServer(currentToken);
        //                     } else {
        //                         console.log("No registration token available.");
        //                     }
        //                 })
        //                 .catch(err => {
        //                     console.error("An error occurred while retrieving token.", err);
        //                 });
        //         } else {
        //             console.log("Notification permission denied.");
        //         }
        //     });
        // }

        // // Expose function globally
        // window.requestPermission = requestPermission;

        // // Send Token to Server
        // function sendTokenToServer(token) {
        //     fetch("http://localhost:3000/send-notification", {
        //         method: "POST",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify({
        //             token: token,
        //             title: "Test Notification",
        //             body: "This is a test message from Firebase Cloud Messaging!"
        //         })
        //     })
        //     .then(response => response.json())
        //     .then(data => console.log("Server Response:", data))
        //     .catch(error => console.error("Error:", error));
        // }

        // Handle Foreground Messages
        onMessage(messaging, (payload) => {
    navigator.serviceWorker.getRegistration().then(registration => {
        registration.showNotification(payload.notification.title, {
            body: payload.notification.body,
            icon: "/images/nav.png"
        });
    });
});
