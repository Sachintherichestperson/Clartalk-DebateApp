const Agenda = require("agenda");
const Debate = require("../mongoose/live-mongo");
const User = require("../mongoose/user-mongo");
const { sendPushNotificationAll } = require("./firebase");
const SendEmail = require("../config/nodemailer");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../config/development.json");

// Load MongoDB URI only once and cache it
let MONGODB_URI;
try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    MONGODB_URI = config.MONGODB_URI;
    if (!MONGODB_URI) throw new Error("MONGODB_URI is missing in development.json");
} catch (error) {
    console.error("❌ Error loading MONGODB_URI from development.json:", error);
    process.exit(1);
}

const agenda = new Agenda({ db: { address: MONGODB_URI } });

// 🟢 30-Minute Debate Reminder
agenda.define("send debate reminder", async (job) => {
    const { title } = job.attrs.data;

    try {
        // Fetch users and debates in parallel to reduce wait time
        const [allUsers, debates] = await Promise.all([
            User.find({ fcmToken: { $ne: null } }, "fcmToken"),
            Debate.find({ $or: [{ creator: { $ne: null } }, { opponent: { $ne: null } }] })
                .populate("creator", "fcmToken email")
                .populate("opponent", "fcmToken email")
        ]);

        // Extract FCM tokens
        const userTokens = allUsers.map(user => user.fcmToken).filter(Boolean);
        const debateTokens = debates.flatMap(debate => [
            debate.creator?.fcmToken,
            debate.opponent?.fcmToken
        ]).filter(Boolean);

        const allTokens = [...userTokens, ...debateTokens];

        if (allTokens.length) {
            await sendPushNotificationAll(allTokens, `Live ${title}`, `${title} debate session starts in 30 minutes!`, "30-min");
        }

        // Extract emails
        const emails = debates.flatMap(debate => [
            ...(Array.isArray(debate.creator) ? debate.creator.map(c => c.email) : []),
            ...(Array.isArray(debate.opponent) ? debate.opponent.map(c => c.email) : [])
        ]).filter(Boolean);

        if (emails.length) {
            const images = debates[0]?.Thumbnail ? [{
                filename: "Debate.jpg",
                content: debates[0].Thumbnail,
                cid: "DebateImage"
            }] : [];

            console.log("📩 Sending email to:", emails);
            await SendEmail(emails, `Reminder: ${title}`, "Get Ready Only 30 minutes Left", images);
        }

        await job.remove(); // Clean up job after execution
    } catch (error) {
        console.error("❌ Error in sending debate reminder:", error);
    }
});

// 🟢 Debate Start Reminder
agenda.define("creator debate reminder", async (job) => {
    const { title } = job.attrs.data;

    try {
        // Fetch users and debates in parallel
        const [allUsers, debates] = await Promise.all([
            User.find({ fcmToken: { $ne: null } }, "fcmToken"),
            Debate.find({ $or: [{ creator: { $ne: null } }, { opponent: { $ne: null } }] })
                .populate("creator", "fcmToken email")
                .populate("opponent", "fcmToken email")
        ]);

        // Extract FCM tokens
        const userTokens = allUsers.map(user => user.fcmToken).filter(Boolean);
        const debateTokens = debates.flatMap(debate => [
            debate.creator?.fcmToken,
            debate.opponent?.fcmToken
        ]).filter(Boolean);

        const allTokens = [...userTokens, ...debateTokens];

        if (allTokens.length) {
            await sendPushNotificationAll(allTokens, `Live ${title}`, `${title} debate session is starting now`, "Started");
        }

        // Extract emails
        const emails = debates.flatMap(debate => [
            ...(Array.isArray(debate.creator) ? debate.creator.map(c => c.email) : []),
            ...(Array.isArray(debate.opponent) ? debate.opponent.map(c => c.email) : [])
        ]).filter(Boolean);

        if (emails.length) {
            const images = debates[0]?.Thumbnail ? [{
                filename: "Debate.jpg",
                content: debates[0].Thumbnail,
                cid: "DebateImage"
            }] : [];

            console.log("📩 Sending email to:", emails);
            await SendEmail(emails, `Reminder: ${title}`, "Start The Debate, It's Time", images);
        }

        await job.remove();
    } catch (error) {
        console.error("❌ Error in sending debate start reminder:", error);
    }
});

// 🟢 Schedule 30-Minute Debate Reminders
const scheduleDebateReminders = async () => {
    try {
        const now = new Date();
        const debates = await Debate.find({ Time: { $gt: now } }); // Only future debates

        for (const debate of debates) {
            const notificationTime = new Date(debate.Time);
            notificationTime.setMinutes(notificationTime.getMinutes() - 30); // 30 minutes before

            if (notificationTime < now) continue; // Skip past debates

            const existingJob = await agenda.jobs({ "data.title": debate.title });

            if (existingJob.length === 0) {
                await agenda.schedule(notificationTime, "send debate reminder", { title: debate.title });
            }
        }
    } catch (error) {
        console.error("❌ Error scheduling 30-minute reminders:", error);
    }
};

// 🟢 Schedule Debate Start Reminders
const schedulecreatorsReminders = async () => {
    try {
        const now = new Date();
        const debates = await Debate.find({ Time: { $gt: now } }); // Only future debates

        for (const debate of debates) {
            const notificationTime = new Date(debate.Time);

            if (notificationTime < now) continue; // Skip past debates

            const existingJob = await agenda.jobs({ "data.title": debate.title });

            if (existingJob.length === 0) {
                console.log(`✅ Scheduling creator reminder for ${debate.title} at ${notificationTime}`);
                await agenda.schedule(notificationTime, "creator debate reminder", { title: debate.title });
            }
        }
    } catch (error) {
        console.error("❌ Error scheduling debate start reminders:", error);
    }
};

// 🟢 Start Agenda and Schedule Reminders
(async function () {
    await agenda.start();
    await scheduleDebateReminders();
    await schedulecreatorsReminders();
})();

module.exports = agenda;