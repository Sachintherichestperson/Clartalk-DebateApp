const Agenda = require("agenda");
const Debate = require("../mongoose/live-mongo");
const User = require("../mongoose/user-mongo");
const { sendPushNotificationAll, sendPushNotification } = require("./firebase");

const agenda = new Agenda({ db: { address: "mongodb://localhost:27017/debateapp" } });

// Define the notification job
agenda.define("send debate reminder", async (job) => {
  const { title } = job.attrs.data;

  // Get all user tokens
  const allUsers = await User.find({ fcmToken: { $ne: null } }, "fcmToken");
  const fcmTokens = allUsers.map(user => user.fcmToken).filter(Boolean);

  // Get Creator Tokens
  const LiveCreator = await Debate.find({ creator: { $ne: null } }).populate("creator", "fcmToken");
  const creatorfcmToken = LiveCreator.map(debate => debate.creator[0].fcmToken).filter(Boolean);

  // Get Opponent Tokens
  const Liveopponent = await Debate.find({ opponent: { $ne: null } }).populate("opponent", "fcmToken");
  const opponentfcmToken = Liveopponent.map(debate => debate.opponent[0].fcmToken).filter(Boolean);

  // Merge all tokens
  const fcmToken = [...creatorfcmToken, ...opponentfcmToken].filter(Boolean);

  // Send Notifications
  if (fcmTokens) {
    await sendPushNotificationAll(fcmTokens, `Live ${title}`, `${title} debate session starts in 30 minutes!`);
  }

  if (fcmToken) {
    await sendPushNotification(fcmToken, `Reminder: ${title}`, "Get Ready Only 30 minutes Left");
  }

  await job.remove();
});

// Function to schedule all debate reminders
const scheduleDebateReminders = async () => {
  try {
    const debates = await Debate.find(); // Fetch all scheduled debates

    for (const debate of debates) {
      // Correctly calculate notification time
      const notificationTime = new Date(debate.Time);
      notificationTime.setMinutes(notificationTime.getMinutes() - 30); // 30 minutes before

      // Check if job is already scheduled
      const existingJob = await agenda.jobs({ "data.title": debate.title });

      if (existingJob.length === 0) {
        console.log(`✅ Scheduling notification for "${debate.title}" at ${notificationTime}`);

        await agenda.schedule(notificationTime, "send debate reminder", {
          title: debate.title,
        });
      } else {
        console.log(`⚠️ Job for "${debate.title}" already scheduled. Skipping duplicate.`);
      }
    }
  } catch (error) {
    console.error("❌ Error scheduling reminders:", error);
  }
};







agenda.define("creator debate reminder", async (job) => {
  const { title } = job.attrs.data;

  // Get all user tokens
  const allUsers = await User.find({ fcmToken: { $ne: null } }, "fcmToken");
  const fcmTokens = allUsers.map(user => user.fcmToken).filter(Boolean);

  // Get Creator Tokens
  const LiveCreator = await Debate.find({ creator: { $ne: null } }).populate("creator", "fcmToken");
  const creatorfcmToken = LiveCreator.map(debate => debate.creator[0].fcmToken).filter(Boolean);

  // Get Opponent Tokens
  const Liveopponent = await Debate.find({ opponent: { $ne: null } }).populate("opponent", "fcmToken");
  const opponentfcmToken = Liveopponent.map(debate => debate.opponent[0].fcmToken).filter(Boolean);

  // Merge all tokens
  const fcmToken = [...creatorfcmToken, ...opponentfcmToken].filter(Boolean);

  // Send Notifications
  if (fcmTokens) {
    await sendPushNotificationAll(fcmTokens, `Live ${title}`, `${title} debate session is starting now`);
  }

  if (fcmToken) {
    await sendPushNotification(fcmToken, `Start: ${title}`, "Start The Debate");
  }

  console.log(`🤷‍♀️ Job for ${title} executed.`);
  await job.remove();
});

const schedulecreatorsReminders = async () => {
  try {
    const debates = await Debate.find();

    for (const debate of debates) {
      // Correctly calculate notification time
      const notificationTime = new Date(debate.Time);
      notificationTime.setMinutes(notificationTime.getMinutes());

      // Check if job is already scheduled
      const existingJob = await agenda.jobs({ "data.title": debate.title });

      if (existingJob.length === 0) {
        console.log(`💕💕 Scheduling notification for "${debate.title}" at ${notificationTime}`);

        await agenda.schedule(notificationTime, "creator debate reminder", {
          title: debate.title,
        });
      } else {
        console.log(`👌👌 Job for "${debate.title}" already scheduled. Skipping duplicate.`);
      }
    }
  } catch (error) {
    console.error("❌ Error scheduling reminders:", error);
  }
};

// Start Agenda and schedule debates
(async function () {
  console.log("🚀 Starting Agenda...");
  await agenda.start();
  console.log("✅ Agenda started!");
  await scheduleDebateReminders();
})();

module.exports = agenda;