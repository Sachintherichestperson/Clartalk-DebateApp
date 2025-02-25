const admin = require("firebase-admin");
const serviceAccount = require("./notification.json");


    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

async function sendPushNotification(token, title, body) {
    try {
        if(!token){
            console.log("No token provided");
            return;
        }
        const message = {
            token: token,
            notification: { title, body }
        };

        const response = await admin.messaging().send(message);
        return response;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

module.exports = { sendPushNotification };
