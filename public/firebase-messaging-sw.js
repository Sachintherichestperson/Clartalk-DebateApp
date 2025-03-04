importScripts("https://www.gstatic.com/firebasejs/10.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.4.0/firebase-messaging-compat.js");

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAt9ZJs2CBEKFOK_T72QIQjVlidoBgiY-Q",
    authDomain: "clartalk-94a92.firebaseapp.com",
    projectId: "clartalk-94a92",
    storageBucket: "clartalk-94a92.appspot.com",
    messagingSenderId: "220220136589",
    appId: "1:220220136589:web:80ce8c1c77fb718c4bd6c4",
    measurementId: "G-SXR988HK5W"
});


const messaging = firebase.messaging();

// messaging.onBackgroundMessage(payload => {
//   console.log("Background message received:", payload);
//   self.registration.showNotification(payload.notification.title, {
//     body: payload.notification.body,
//     icon: "/images/nav.png"
//   });
// });
