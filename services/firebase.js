const admin = require("firebase-admin");
const notificationmongoose = require("../mongoose/notification-mongoose")
const serviceAccount = require("./notification.json");
const User = require("../mongoose/user-mongo");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function sendPushNotification(token, title, body, notificationType) {
    try {
        if(!token){
            console.log("No token provided");
            return;
        }
        const message = {
            token: token,
            notification: { title, body },
            data: {
                notificationType: notificationType  || "push"
            }
        };

        const response = await admin.messaging().send(message);

        const user = await User.findOne();

        const notification = new notificationmongoose({
            notificationType: notificationType,
            title: title,
            body: body,
            notificationTo: user._id
        });
        await notification.save();

        user.notification.push(notification);
        await user.save();

        return response;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

async function sendPushNotificationAll(tokens, title, body) {
    try {
        if (!tokens || tokens.length === 0) {
            console.log("No tokens provided");
            return;
        }

        const messages = tokens.map(token => ({
            token: token,
            notification: { title, body }
        }));

        const user = await User.findOne();

        const response = await admin.messaging().sendEach(messages);
        
        const notification = new notificationmongoose({
            notificationType: "push",
            title: title,
            body: body,
            notificationTo: user._id
        });
        await notification.save();

        user.notification.push(notification);
        await user.save();

        return response;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

module.exports = { sendPushNotification, sendPushNotificationAll };
