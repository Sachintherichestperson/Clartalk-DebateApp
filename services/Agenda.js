const Agenda = require("agenda");
const Debate = require("../mongoose/live-mongo");
const User = require("../mongoose/user-mongo");
const { sendPushNotificationAll, sendPushNotification } = require("./firebase");
const SendEmail = require("../config/nodemailer");
const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "../config/development.json");

let MONGODB_URI;
try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    MONGODB_URI = config.MONGODB_URI;
    if (!MONGODB_URI) throw new Error("MONGODB_URI is missing in development.json");
} catch (error) {
    console.error("❌ Error loading MONGODB_URI from development.json:", error);
    process.exit(1); // Exit the app if the config is invalid
}

const agenda = new Agenda({ db: { address: MONGODB_URI } });


//30 minutes Left Remindar
agenda.define("send debate reminder", async (job) => {
  const { title } = job.attrs.data;

  const allUsers = await User.find({ fcmToken: { $ne: null } }, "fcmToken");
  const fcmTokens = allUsers.map(user => user.fcmToken).filter(Boolean);

  if (fcmTokens) {
    await sendPushNotificationAll(fcmTokens, `Live ${title}`, `${title} debate session starts in 30 minutes!`, "30-min");
  }


  const LiveCreator = await Debate.find({ creator: { $ne: null } }).populate("creator", "fcmToken email");
  const creatorfcmToken = LiveCreator.map(debate => debate.creator[0].fcmToken).filter(Boolean);

  const Liveopponent = await Debate.find({ opponent: { $ne: null } }).populate("opponent", "fcmToken email");
  const opponentfcmToken = Liveopponent.map(debate => debate.opponent[0].fcmToken).filter(Boolean);

  const fcmToken = [...creatorfcmToken, ...opponentfcmToken].filter(Boolean);

  if (fcmToken) {
    await sendPushNotificationAll(fcmToken, `Reminder: ${title}`, "Get Ready Only 30 minutes Left", "30-min");
  }

  for (const debate of LiveCreator) {
    const emails = Array.isArray(debate.creator) ? debate.creator.map(c => c.email) : [];

    const images = debate.Thumbnail ? [{
        filename: "Debate.jpg",
        content: debate.Thumbnail,
        cid: "DebateImage"
    }] : [];

    console.log("📩 Sending email to: 43", emails);

    if (emails.length > 0) {
        await SendEmail(emails, `Reminder: ${title}`, "Get Ready Only 30 minutes Left", images);
    }
}

for (const debate of Liveopponent) {
  const emails = Array.isArray(debate.opponent) ? debate.opponent.map(c => c.email) : [];

  const images = debate.Thumbnail ? [{
      filename: "Debate.jpg",
      content: debate.Thumbnail,
      cid: "DebateImage"
  }] : [];

  console.log("📩 Sending email to: 59", emails);

  if (emails.length > 0) {
      await SendEmail(emails, `Reminder: ${title}`, "Get Ready Only 30 minutes Left", images);
  }
}
  await job.remove();
});

//Debate Start Reminder
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
    await sendPushNotificationAll(fcmTokens, `Live ${title}`, `${title} debate session is starting now`, "Started");
  }

  if (fcmToken) {
    await sendPushNotificationAll(fcmToken, `Start: ${title}`, "Start The Debate", "Started");
  }

  for (const debate of LiveCreator) {
    const emails = Array.isArray(debate.creator) ? debate.creator.map(c => c.email) : [];

    const images = debate.Thumbnail ? [{
        filename: "Debate.jpg",
        content: debate.Thumbnail,
        cid: "DebateImage"
    }] : [];

    console.log("📩 Sending email to 105:", emails);

    if (emails.length > 0) {
        await SendEmail(emails, `Reminder: ${title}`, "Start The Debate, It's Time", images);
    }
}

for (const debate of Liveopponent) {
  const emails = Array.isArray(debate.opponent) ? debate.opponent.map(c => c.email) : [];

  const images = debate.Thumbnail ? [{
      filename: "Debate.jpg",
      content: debate.Thumbnail,
      cid: "DebateImage"
  }] : [];

  console.log("📩 Sending email to: 121", emails);

  if (emails.length > 0) {
      await SendEmail(emails, `Reminder: ${title}`, "Start The Debate, It's Time", images);
  }
}

  await job.remove();
});


//30 minutes debate reminder callback
const scheduleDebateReminders = async () => {
  try {
    const now = new Date();
    const debates = await Debate.find({ Time: { $gt: now } }); // Only future debates

    for (const debate of debates) {
      const notificationTime = new Date(debate.Time);
      notificationTime.setMinutes(notificationTime.getMinutes() - 30); // 30 minutes before

      if (notificationTime < now) {
        continue; // Skip debates that have already started
      }

      const existingJob = await agenda.jobs({ "data.title": debate.title });

      if (existingJob.length === 0) {
        await agenda.schedule(notificationTime, "send debate reminder", {
          title: debate.title,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error scheduling reminders:", error);
  }
};

//Debate Start Reminder Callback
const schedulecreatorsReminders = async () => {
  try {
    const now = new Date();
    const debates = await Debate.find({ Time: { $gt: now } }); // Only future debates

    for (const debate of debates) {
      const notificationTime = new Date(debate.Time);

      if (notificationTime < now) {
        continue; // Skip past debates
      }

      const existingJob = await agenda.jobs({ "data.title": debate.title });

      if (existingJob.length === 0) {
        console.log(`✅ Scheduling creator reminder for ${debate.title} at ${notificationTime}`);
        await agenda.schedule(notificationTime, "creator debate reminder", {
          title: debate.title,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error scheduling reminders:", error);
  }
};


(async function () {
  await agenda.start();
  await scheduleDebateReminders();
  await schedulecreatorsReminders();
})();

module.exports = agenda;