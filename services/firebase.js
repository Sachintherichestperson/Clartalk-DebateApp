const admin = require("firebase-admin");
const notificationmongoose = require("../mongoose/notification-mongoose");
const User = require("../mongoose/user-mongo");
const serviceAccount = require("./notification.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// ✅ Optimized function for a single user
async function sendPushNotification(token, title, body, notificationType = "push") {
    try {
        if (!token) {
            console.log("No token provided");
            return;
        }

        const message = {
            token,
            notification: { title, body },
            data: { notificationType }
        };

        // Send push notification
        const response = await admin.messaging().send(message);

        // Fetch user and create notification
        const user = await User.findOne();
        if (!user) return;

        const notification = new notificationmongoose({
            notificationType,
            title,
            body,
            notificationTo: user._id
        });

        await notification.save();
        
        // Update user notification array
        user.notification.push(notification._id);
        await user.save();  // ✅ Only one save operation

        console.log("Notification sent:", notification);
        return response;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

// ✅ Optimized function for multiple users
async function sendPushNotificationAll(tokens, title, body, notificationType = "push") {
    try {
        if (!tokens || tokens.length === 0) {
            console.log("No tokens provided");
            return;
        }

        // Batch sending notifications
        const messages = tokens.map(token => ({
            token,
            notification: { title, body },
            data: { notificationType }
        }));

        // ✅ Batch send notifications in a single request
        const response = await admin.messaging().sendEach(messages);

        // Fetch all users at once
        const users = await User.find({}, "_id notification"); // ✅ Select only required fields

        // Create a single notification entry for all users
        const notification = new notificationmongoose({
            notificationType,
            title,
            body,
            notificationTo: users.map(user => user._id) // Store all user IDs
        });
        await notification.save();

        // ✅ Update all users in parallel using Promise.all()
        await Promise.all(users.map(user => {
            user.notification.push(notification._id);
            return user.save();
        }));

        console.log("Batch notification sent to all users.");
        return response;
    } catch (error) {
        console.error("Error sending batch notifications:", error);
    }
}

module.exports = { sendPushNotification, sendPushNotificationAll };
