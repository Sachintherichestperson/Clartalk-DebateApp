// Import Firebase libraries for service workers
importScripts("https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging.js");

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdsIwg-UEeQWUk2pqTFJT9ZCnzwPXy7UY",
  authDomain: "clartalk.firebaseapp.com",
  projectId: "clartalk",
  storageBucket: "clartalk.firebasestorage.app",
  messagingSenderId: "388816828795",
  appId: "1:388816828795:web:d6625eae4738bda063e5de",
  measurementId: "G-0W1KSX2NRK",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  console.log("Received background message: ", payload);

  // Customize notification
  const notificationTitle = payload.notification.title || "Background Notification";
  const notificationOptions = {
    body: payload.notification.body || "You have a new notification.",
    icon: payload.notification.icon || "/default-icon.png", // Add a default icon if none is provided
  };

  // Show the notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});
