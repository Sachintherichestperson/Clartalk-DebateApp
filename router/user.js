const express = require("express");
const router = express.Router();
const User = require("../mongoose/user-mongo");
const bcryptjs = require("bcryptjs");
const { sendPushNotificationAll, sendPushNotification } = require("../services/firebase");
const jwt = require("jsonwebtoken");
const {userregister, loginuser, logout, verifyOtp, resendOtp} = require("../controller/authcontroller");
const isloggedin = require("../middleware/isloggedin");
const podcastsmongoose = require("../mongoose/podcasts-mongo");
const videomongoose = require("../mongoose/video-mongo");
const liveMongo = require("../mongoose/live-mongo");
const communityMongo = require("../mongoose/community-mongo");
const competitionMongo = require("../mongoose/competition-mongo");
const upload = require("../config/multer");
const Razorpay = require("razorpay");
const userMongo = require("../mongoose/user-mongo");
const notificationmongoose = require("../mongoose/notification-mongoose");
const mongoose = require("mongoose");
const { conn, getGFS } = require("../config/gridfs");
const  SendEmail = require("../config/nodemailer");
const nodeCache = require("../controller/Cache");

router.get("/register", (req, res) => {                                                                      //register page
    let err = req.flash("key")
    res.render("Register", { err });
});

router.post("/register", userregister)                                                                     //register page--Uploader

router.get("/login", function(req, res){                                                                   //Login Page
    let err = req.flash("usernot")
    res.render("login", {err})
});

router.post("/login", loginuser)                                                                         //Login Page-Uploader

router.get("/OTP", async function(req, res){                                                  //OTP Page
  res.render("OTP");
});

router.post("/verify-otp", verifyOtp)                                                                     //OTP checker

router.post("/resend-otp", resendOtp);

router.get("/thumbnail/:id",isloggedin,async (req, res) => {
  try{
    const thumbnail = await liveMongo.findById(req.params.id);

    res.set('Content-Type', 'image/jpeg'); // Set correct content type
    res.send(thumbnail.Thumbnail); // Send buffer directly
  }catch(error){

  }
});

router.get("/image/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Search for the image in all three collections
    const podcast = await podcastsmongoose.findOne({ _id: id }).select("Thumbnail");
    const video = await videomongoose.findOne({ _id: id }).select("Thumbnail");
    const liveStream = await liveMongo.findOne({ _id: id }).select("Thumbnail");

    // Check which document contains the image
    const imageDoc = podcast || video || liveStream;

    if (!imageDoc || !imageDoc.Thumbnail) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.set("Content-Type", "image/jpeg");

    res.send(imageDoc.Thumbnail);
  } catch (error) {
    console.error("❌ Error fetching image:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/",isloggedin,async function(req, res){                                                        // front page
  try{
    let vedios = nodeCache.get("Live");
    console.log("Node-Cache", vedios);

    if (!vedios) {
        vedios = await liveMongo.find({ status: "accept" });

        nodeCache.set("Live", vedios);
    }
    const user = await User.findOne({email: req.user.email}).populate("requests").populate( "Sender" );


    res.render("front-page", {vedios, user})
  }catch(err){
    console.error("Error fetching data:", err);

    // Send an error response instead of a blank page
    res.status(500).send("Internal Server Error");
  }
});

router.get("/debate", isloggedin, async function (req, res) { 
  try {
      let vedios = nodeCache.get("debate_videos");
      let user = await User.findOne({ email: req.user.email }).populate("requests");
      let userTags = user.SEOTags || [];
      

      if (!vedios) {
          vedios = await videomongoose.find({}).populate("Thumbnail");

          // Cache the fetched videos
          nodeCache.set("debate_videos", vedios, 600);
      }

      // Sort videos: those matching SEOTags should come first
      vedios.sort((a, b) => {
          let aTags = Array.isArray(a.Tags) 
              ? a.Tags.flatMap(tagString => tagString.split(',').map(tag => tag.trim()))
              : [];
          let bTags = Array.isArray(b.Tags) 
              ? b.Tags.flatMap(tagString => tagString.split(',').map(tag => tag.trim()))
              : [];

          let aMatches = aTags.filter(tag => userTags.includes(tag)).length;
          let bMatches = bTags.filter(tag => userTags.includes(tag)).length;

          return bMatches - aMatches; // Higher matches come first
      });

      res.render("debate", { vedios, user });
  } catch (error) {
      console.error("Error fetching debate page:", error);
      res.status(500).send("Server error");
  }
});

router.get("/video/stream/:id", async (req, res) => {
  try {
    if (!conn.readyState) {
      console.log("❌ MongoDB not connected yet. Retrying...");
      return res.status(500).json({ error: "MongoDB is not connected yet. Try again later." });
    }

    const gfs = getGFS();
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const file = await conn.db.collection("videos.files").findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ error: "Video not found" });
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send("Requires Range header");
    }

    const fileSize = file.length;
    const CHUNK_SIZE = 16 * 1024 * 1024; // 🔥 Increased to 16MB for smoother playback

    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : Math.min(start + CHUNK_SIZE, fileSize - 1);
    const contentLength = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
      "Connection": "keep-alive", // 🔥 Keeps connection open for smoother streaming
    });

    const videoStream = gfs.openDownloadStream(fileId, { start, end });

    videoStream.on("error", (err) => {
      console.error("GridFS Streaming Error:", err);
      res.status(500).end("Error streaming video");
    });

    videoStream.on("open", () => {
      console.log(`Streaming video ${file.filename} from ${start} to ${end}`);
    });

    videoStream.pipe(res);

  } catch (err) {
    console.error("❌ Streaming error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/debate/:id", isloggedin, async function(req, res) {                                             
  try {
      const vedios = await videomongoose.findById(req.params.id)
        .populate({
          path: "creator",
          select: "username followers Rankpoints profile"
        })
        .populate({
          path: "comment",
          select: "text userId",
          populate: {
            path: "userId",
            select: "username profile"
          }
        });

    const creator = await User.findById(vedios.creator[0]._id).populate("Rankpoints");
    let user = await User.findOne({ email: req.user.email })

    const followerscount = vedios.creator[0].followers;
    const follower = followerscount.length;
    const isFollowing = followerscount.includes(req.user._id);

    if (!vedios.viewedBy.includes(req.user._id)) {
      vedios.Views += 1;
      vedios.viewedBy.push(req.user._id);
      await vedios.save();

      const points = 10;
      creator.Rankpoints += points;
      await creator.save();

      await User.updateRanks();

    }

    const suggestions = await videomongoose.find({ _id: { $ne: vedios._id } }).limit(5).populate({ 
      path: "creator", 
      select: "username" 
    }).lean();

    const comments = vedios.comment;

    res.render("vedioplayer", {
      vedios, 
      videoFile: vedios.vedio,
      suggestions, 
      currentRoute: "debate", 
      follower, 
      isFollowing, 
      user,
      comments
    });

  } catch (err) {
    console.error("Error fetching video:", err);
    res.status(500).send("Server error");
  }
});

router.get("/podcast", isloggedin, async function(req, res){ 
  let vedios = nodeCache.get("podcast_videos");                                              //podcast section Page
  const user = await User.findOne({email: req.user.email}).populate("requests")
  let userTags = user.SEOTags || [];

  if (!vedios) {
    vedios = await podcastsmongoose.find({}).populate("Thumbnail");

    // Cache the fetched videos
    nodeCache.set("podcast_videos", vedios, 600);
}


  vedios.sort((a, b) => {
    let aTags = Array.isArray(a.Tags)
        ? a.Tags.flatMap(tagString => tagString.split(',').map(tag => tag.trim()))
        : [];
    let bTags = Array.isArray(b.Tags)
        ? b.Tags.flatMap(tagString => tagString.split(',').map(tag => tag.trim()))
        : [];


    let aMatches = aTags.filter(tag => userTags.includes(tag)).length;
    let bMatches = bTags.filter(tag => userTags.includes(tag)).length;


    return bMatches - aMatches; // Higher matches come first
});


  res.render("podcast", { vedios, user });
});
 
router.get("/podcast/:id", isloggedin, async function(req, res) {  
  try {
    let vedios = nodeCache.get(`podcast_video_${req.params.id}`);

    if (!vedios) {
      vedios = await podcastsmongoose.findById(req.params.id)
      .populate({
          path: "creator",
          select: "username followers Rankpoints"
      }).populate({
        path: "comment",
        select: "text userId",
        populate: {
          path: "userId",
          select: "username profile"
        }
      });

      if (!vedios) {
        return res.status(404).send("Podcast not found");
      }

      // Cache the podcast video
      nodeCache.set(`podcast_video_${req.params.id}`, vedios, 600); // Cache for 10 mins
    }

    const creator = await User.findById(vedios.creator[0]._id).populate("Rankpoints");
    let user = await User.findOne({ email: req.user.email });

    const followerscount = vedios.creator[0].followers;
    const follower = followerscount.length;
    const isFollowing = followerscount.includes(req.user._id);
    
    if (!vedios.viewedBy.includes(req.user._id)) {
      vedios.Views += 1;
      vedios.viewedBy.push(req.user._id);
      await vedios.save();

      const points = 10;
      creator.Rankpoints += points;
      await creator.save();

      await User.updateRanks();

    }

    const suggestions = await podcastsmongoose.find({ _id: { $ne: vedios._id } }).limit(5).populate({
        path: "creator",
        select: "username"
    });

    const comments = vedios.comment;
    
    res.render("vedioplayer", {
      vedios, 
      videoFile: vedios.vedio,
      suggestions, 
      currentRoute: "podcast", 
      follower, 
      isFollowing, 
      user,
      comments
    });

  } catch(err) {
    console.error("Error fetching podcast:", err);
    res.status(500).send("Server error");
  }
});

router.get("/community", isloggedin, async function(req, res) {  
  const cacheKey = "communities";
  let communities = nodeCache.get(cacheKey);

  const userPromise = await User.findOne({ email: req.user.email }).populate("requests").lean();

  if (!communities) {
      communities = await communityMongo.find({})
          .limit(20)
          .lean();

      nodeCache.set(cacheKey, communities, 600);
  }

  const user = userPromise;

  res.render("community", { communities, user });
});

router.get("/logout", logout);                                                                             //Logout route

router.get("/community-chat/:id",isloggedin ,async function(req, res){                                    //community-chat/:id Page
  try{
    const community = await communityMongo.findById(req.params.id);
    const user = await User.findOne({email: req.user.email});
    
    const member = community.members.some(memberId => memberId.toString() === req.user._id.toString());
    
    const type = community.CommunityType;

    res.render("chat", {community, user, member, type });
  }catch(err){
    res.send(err)
    console.log(err.message)
  }
});

router.get("/profile",isloggedin,async function(req, res){                                                //profile Page
  const user = await User.findOne({email: req.user.email}).populate("followers").populate("vedio").populate("podcast").populate("profile").populate("requests");

  const videoCount = user.vedio ? user.vedio.length : 0;
  const debateCount = user.podcast ? user.podcast.length : 0;
  const totalContent = videoCount + debateCount;

  const profile = user.profile;
  const Rank = user.Rank;
  
  const followerCount = user.followers ? user.followers.length : 0;

  res.render("profile", { user, totalContent, followerCount, profile });
});

router.get("/uploaded-content", isloggedin, async function (req, res) {                                   //uploaded-content Page
  try {
    const user = await User.findOne({ email: req.user.email })
              .populate({
                  path: "vedio",
                  select: "title description createdAt Thumbnail Views"
              })
              .populate({
                  path: "podcast",
                  select: "title description createdAt Thumbnail Views"
              });
    
          if (!user) {
              return res.status(404).send("User not found");
          }
    
    
          // Add a `type` property to distinguish between videos and podcasts
          const vedios = [
              ...user.vedio.map(v => ({ ...v.toObject(), type: "debate" })),
              ...user.podcast.map(p => ({ ...p.toObject(), type: "podcast" }))
          ];

    res.render("Uploaded-content-profile", { vedios, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while fetching data.");
  }
});

router.get("/My-World",isloggedin, async function(req, res){                                             //Myworld Page
  const communities = await User.findOne({email: req.user.email}).populate("communities");
  res.render("Myworld", { communities })
});

router.get("/SentRequests",isloggedin, async function (req, res) {                                       //Sent Requests Page
  const contents = await User.findOne({ email: req.user.email }).populate({
    path: "Sender",
    select: "OpponentName requestId",
    populate: {
      path: "OpponentName",
      select: "username"
    }
  });

  res.render("Sentrequests", { contents });
});

router.get("/update-route",isloggedin, async function(req, res){                                      // update-route/:id  Page
  const profileupdate = await User.findOne({ email: req.user.email }).populate("profile");
  let err = req.flash("key");
  res.render("update-profile", { profileupdate, err })
});

router.post("/update-profile", isloggedin, upload.single("profile"), async function (req, res) { 
  try {
    let { username } = req.body;
    let profileImageURL = req.file ? req.file.path : null;

    console.log("Uploaded Image URL:", profileImageURL);

    const user = await User.findOne({ email: req.user.email });

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/update-profile");
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser.email !== req.user.email) {
      req.flash("error", "Username already exists");
      return res.redirect("/update-profile");
    }

    // ✅ Save Cloudinary URL to database
    if (profileImageURL) {
      user.profile = profileImageURL;
    }

    user.username = username;
    await user.save();

    req.flash("success", "Profile updated successfully!");
    res.redirect("/profile");
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).send("Something went wrong");
  }
});

router.get("/LeaderBoard", isloggedin, async function (req, res) { // LeaderBoard Page
  try {
    const user = await User.findOne({ email: req.user.email });

    // Fetch top users sorted by Rankpoints in descending order
    const LeaderBoards = await User.find().sort({ Rankpoints: -1 }).limit(10);

    // Assign ranks to users
    LeaderBoards.forEach((creator, index) => {
      creator.Rank = index + 1; // Rank starts from 1
    });


    res.render("leaderBoard", { user, LeaderBoards });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/Join-community/:id", isloggedin, async (req, res) => {
  try {
    const community = await communityMongo.findById(req.params.id).populate({
      path: "createdBy",
      select: "fcmToken email",
    });

    if (!community.members.includes(req.user._id)) {
      community.members.push(req.user._id);
      await community.save();
    } else {
      return res.send("Already a member");
    }

    const fcmToken = community.createdBy.fcmToken;
    const user = await User.findById(req.user._id);
    const fcm = user.fcmToken;

    const notifications = [];

    if (fcmToken) {
      notifications.push(sendPushNotification(fcmToken, `Notification For ${community.CommunityName}`, `${user.username} Joined ${community.CommunityName}`, "join-community"));
    }

    if (fcm) {
      notifications.push(sendPushNotification(fcm, `Congrats You Joined ${community.CommunityName}`, `Now We Give you An Opportunity To Change The World`, "join-community"));
    }

    // Send response early
    const redirectUrl = req.get("Referrer") || "/";
    res.redirect(redirectUrl);

    // Run background tasks (notifications + email)
    await Promise.all(notifications);
    await SendEmail(
      community.createdBy.email,
      "Join Community",
      `Congrats! You Joined ${community.CommunityName}`,
      [{ filename: "community.jpg", content: community.CommunityDP, cid: "communityImage" }]
    ).catch(err => console.log("Email failed:", err));

  } catch (err) {
    console.log(err);
  }
});

router.get("/Exit-Community/:id", isloggedin, async (req, res) => {
  try {
      const community = await communityMongo.findById(req.params.id);
      const user = await User.findById(req.user._id);

      if (!community || !user) {
          return res.status(404).send("Community or user not found.");
      }

      // Check if user is a member before removing
      if (community.members.includes(user._id)) {
          await communityMongo.findByIdAndUpdate(
              req.params.id,
              { $pull: { members: user._id } },  // Pulls user's ID from members array
              { new: true }
          );
      }

      res.redirect("/community");
  } catch (error) {
      console.error("Error exiting community:", error);
      res.status(500).send("Server error");
  }
});

router.post("/Community/:id/payment",isloggedin,async (req, res) => {                                 // Join-community/:id Page
  try{
      const community = await communityMongo.findById(req.params.id);
      res.render("payment-for-community", { community });
  }catch(err){
    console.log(err);
  }
});

router.get("/Members/:id",isloggedin,async (req, res) => {                                                    // Members/:id Page
  const members = await communityMongo.findById(req.params.id).populate({
    path: "members",
    select: "username"
  });

  res.render("Members", {members});
});

router.get("/Send-merge-request",isloggedin,async function(req, res){
  res.render("Send-merge-request")
});

router.get("/settings",isloggedin,async function (req, res) {                                                  //settings   Page
  res.render("settings");
});

router.get("/logout", logout);                                                                             //Logout route

router.get("/community-chat/:id",isloggedin ,async function(req, res){                                    //community-chat/:id Page
  try{
    const community = await communityMongo.findById(req.params.id);
    const user = await User.findOne({email: req.user.email});
    
    const member = community.members.some(memberId => memberId.toString() === req.user._id.toString());
    
    const type = community.CommunityType;

    res.render("chat", {community, user, member, type });
  }catch(err){
    res.send(err)
    console.log(err.message)
  }
});

router.get("/profile",isloggedin,async function(req, res){                                                //profile Page
  const user = await User.findOne({email: req.user.email}).populate("followers").populate("vedio").populate("podcast").populate("profile").populate("requests");

  const videoCount = user.vedio ? user.vedio.length : 0;
  const debateCount = user.podcast ? user.podcast.length : 0;
  const totalContent = videoCount + debateCount;

  const profile = user.profile;
  const Rank = user.Rank;
  console.log(Rank);
  
  const followerCount = user.followers ? user.followers.length : 0;

  res.render("profile", { user, totalContent, followerCount, profile });
});

router.get("/uploaded-content", isloggedin, async function (req, res) {                                   //uploaded-content Page
  try {
    const user = await User.findOne({ email: req.user.email })
              .populate({
                  path: "vedio",
                  select: "title description createdAt Thumbnail Views"
              })
              .populate({
                  path: "podcast",
                  select: "title description createdAt Thumbnail Views"
              });
    
          if (!user) {
              return res.status(404).send("User not found");
          }
    
    
          // Add a `type` property to distinguish between videos and podcasts
          const vedios = [
              ...user.vedio.map(v => ({ ...v.toObject(), type: "debate" })),
              ...user.podcast.map(p => ({ ...p.toObject(), type: "podcast" }))
          ];

    res.render("Uploaded-content-profile", { vedios, user });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while fetching data.");
  }
});

router.get("/My-World",isloggedin, async function(req, res){                                             //Myworld Page
  const communities = await User.findOne({email: req.user.email}).populate("communities");
  res.render("Myworld", { communities })
});

router.get("/SentRequests",isloggedin, async function (req, res) {                                       //Sent Requests Page
  const contents = await User.findOne({ email: req.user.email }).populate({
    path: "Sender",
    select: "OpponentName requestId",
    populate: {
      path: "OpponentName",
      select: "username"
    }
  });

  res.render("Sentrequests", { contents });
});

router.get("/update-route",isloggedin, async function(req, res){                                      // update-route/:id  Page
  const profileupdate = await User.findOne({ email: req.user.email }).populate("profile");
  let err = req.flash("key");
  res.render("update-profile", { profileupdate, err })
});

router.post("/update-profile", isloggedin, upload.single("profile"), async function (req, res) {          // update-profile   Page
  try {
    let { username } = req.body;
    let profileImageBuffer = req.file ? req.file.buffer : null; // Get the file buffer or null if no file is uploaded

    const user = await User.findOne({ email: req.user.email });
    if (profileImageBuffer) {
      user.profile = profileImageBuffer;  // Save the buffer data
    }

    if (username === user.username) {
      req.flash("key", "username already exist");
      return res.redirect("/update-route")
    } 
    
    user.username = username;
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    res.status(404).send(err);
  }
});

router.get("/LeaderBoard", isloggedin, async function (req, res) { // LeaderBoard Page
  try {
    const user = await User.findOne({ email: req.user.email });

    // Fetch top users sorted by Rankpoints in descending order
    const LeaderBoards = await User.find().sort({ Rankpoints: -1 }).limit(10);

    // Assign ranks to users
    LeaderBoards.forEach((creator, index) => {
      creator.Rank = index + 1; // Rank starts from 1
    });


    res.render("leaderBoard", { user, LeaderBoards });
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/Join-community/:id",isloggedin,async (req, res) => {                                 // Join-community/:id Page
  try{
      const community = await communityMongo.findById(req.params.id).populate({
        path: "createdBy",
        select: "fcmToken email"
      });

      if(!community.members.includes(req.user._id)){
        community.members.push(req.user._id);
        await community.save();
      }else{
       res.send("Already a member");
      }
      const fcmToken = community.createdBy.fcmToken;

      const user = await User.findById(req.user._id);
      const fcm = user.fcmToken;

      if(fcmToken){
        await sendPushNotification(fcmToken, `Notification For ${ community.CommunityName }`, `${user.username} Joined ${ community.CommunityName }`, "join-community");  
      }

      await SendEmail(
        community.createdBy.email,
        "Join Community",
        `Congrats! You Joined ${community.CommunityName}`, // ✅ Text goes here
        [{ 
            filename: "community.jpg", 
            content: community.CommunityDP, 
            cid: "communityImage" 
        }] // ✅ Images array here
    );
    

      if(fcm){
        await sendPushNotification(fcmToken, `Congrats You Joined ${ community.CommunityName }`, `Now We Give you An Opportunity To Change The World`, "join-community");  
      }

      const redirectUrl = req.get("Referrer") || "/";
      res.redirect(redirectUrl);

  }catch(err){
    console.log(err);
  }
});

router.get("/Exit-Community/:id", isloggedin, async (req, res) => {
  try {
      const community = await communityMongo.findById(req.params.id);
      const user = await User.findById(req.user._id);

      if (!community || !user) {
          return res.status(404).send("Community or user not found.");
      }

      // Check if user is a member before removing
      if (community.members.includes(user._id)) {
          await communityMongo.findByIdAndUpdate(
              req.params.id,
              { $pull: { members: user._id } },  // Pulls user's ID from members array
              { new: true }
          );
      }

      res.redirect("/community");
  } catch (error) {
      console.error("Error exiting community:", error);
      res.status(500).send("Server error");
  }
});

router.post("/Community/:id/payment",isloggedin,async (req, res) => {                                 // Join-community/:id Page
  try{
      const community = await communityMongo.findById(req.params.id);
      res.render("payment-for-community", { community });
  }catch(err){
    console.log(err);
  }
});

router.get("/Members/:id",isloggedin,async (req, res) => {                                                    // Members/:id Page
  const members = await communityMongo.findById(req.params.id).populate({
    path: "members",
    select: "username"
  });

  res.render("Members", {members});
});

router.get("/Send-merge-request",isloggedin,async function(req, res){
  res.render("Send-merge-request")
});

router.get("/settings",isloggedin,async function (req, res) {                                                  //settings   Page
  res.render("settings");
});

router.get('/payment-for/:id/payment/:id',isloggedin, async (req, res) => {
    try {
      const Live = await liveMongo.findById(req.params.id)

      res.render("payment", { Live });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).send('Something went wrong. Try again later.');
    }
});

router.get("/live-content-applying-page/:id",isloggedin, async function(req, res){                       //live-content-applying-page/:id  Page
  try{
    const Live = await liveMongo.findById(req.params.id).populate("creator");

    const viewers = await liveMongo.findById(req.params.id).populate({
      path: "BookingDoneBy",
      select: "username"
    }).populate({
      path: "comment",
      select: "text userId",
      populate: {
        path: "userId",
        select: "username profile"
      }
    });

    const Booking = viewers.BookingDoneBy.some(id => id.equals(req.user.id))

    const followerscount = Live.creator[0].followers;
    const follower = followerscount.length;
  
    const suggestions = await liveMongo.find({ _id: { $ne: Live._id } }).limit(5).populate({
      path: "creator",
      select: "username"
  });
  const isFollowing = followerscount.includes(req.user._id);

  let user = await User.findOne({email: req.user.email });

  const creator = Live.creator[0]._id.equals(user._id);
  const opponent = Live.opponent[0]._id.equals(user._id);

  const comments = viewers.comment;

  res.render("Livedebate-player", {
     Live,
     follower,
     suggestions,
     currentRoute: "live-content-applying-page",
     isFollowing,
     user,
     Booking,
     creator,
     opponent,
     comments
    });
  }catch(err){
        res.send("404").status("Page Not Found");
  }
});

router.get("/Live-Stream-Recorded/:id",isloggedin, async function(req, res){                     //Live-Stream-Recorder/:id  
  const Live = await liveMongo.findById(req.params.id).populate({
    path: "BookingDoneBy",
    select: "username"
  }).populate({
    path: "comment",
    select: "text userId",
    populate: {
      path: "userId",
      select: "username profile"
    }
  }).populate({
    path: "creator",
    select: "username followers Rankpoints"
  });

  let user = await User.findOne({email: req.user.email });

  const followerscount = Live.creator[0].followers;
  console.log(followerscount);
  const follower = followerscount.length;
  const isFollowing = followerscount.includes(req.user._id);

  const creator = Live.creator[0];
  const opponent = Live.opponent[0];

  if (!Live.viewedBy.includes(req.user._id)) {
    Live.Views += 1;
    Live.viewedBy.push(req.user._id);
    await Live.save();

    const points = 15;
    creator.Rankpoints += points;
    await creator.save();

    opponent.Rankpoints += points;
    // await opponent.save();

    await User.updateRanks();
  }

  const Livemongo = await liveMongo.find({ _id: { $ne: Live._id } }).limit(5).populate({
    path: "creator",
    select: "username"
  });
  const vediomongo = await videomongoose.find().limit(5).populate({
    path: "creator",
    select: "username"
  });
  const podcastmongo = await podcastsmongoose.find().limit(5).populate({
    path: "creator",
    select: "username"
  });
  const suggestions = [...Livemongo, ...vediomongo, ...podcastmongo];
  console.log(suggestions);

  const comments = Live.comment;

  res.render("Live-streamer", {
     Live,
     videoFile: Live.Stream[0],
     suggestions, 
     currentRoute: "Live-Stream-Recorded", 
     follower, 
     isFollowing, 
     user,
     comments
    });
});

router.get("/get-status/:id", async (req, res) => {
  try {
      // Find the video by ID in the database
      const video = await liveMongo.findById(req.params.id);

      if (!video) {
          return res.status(404).json({ error: "Video not found" });
      }

      // Send the current LiveStatus
      res.status(200).json({ LiveStatus: video.LiveStatus });
  } catch (error) {
      res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post('/update-status/:id', async (req, res) => {
  try {
      const { LiveStatus } = req.body;

      await liveMongo.findByIdAndUpdate(req.params.id, { LiveStatus });
      res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/watch-time', isloggedin, async (req, res) => {
  let { watchTime, videoId, videoType } = req.body;

  try {
      watchTime = parseFloat(watchTime);

      if (isNaN(watchTime) || watchTime <= 0) {
          return res.status(400).json({ message: 'Invalid watch time value.' });
      }

      const user = await User.findOne({ email: req.user.email });

      if (!user) {
          return res.status(404).json({ message: 'User not found.' });
      }

      let video;
      if (videoType === 'debate') {
          video = await videomongoose.findById(videoId).populate("Tags");
      } else if (videoType === 'podcast') {
          video = await podcastsmongoose.findById(videoId).populate("Tags");
      } else {
          return res.status(400).json({ message: 'Invalid video type.' });
      }

      if (!video) {
          return res.status(404).json({ message: 'Video not found.' });
      }

      if (!Array.isArray(user.UserWatchHours) || user.UserWatchHours.length === 0) {
          user.UserWatchHours = [0];
      }

      let currentWatchTime = parseFloat(user.UserWatchHours[0]) || 0;
      user.UserWatchHours[0] = Math.round((currentWatchTime + watchTime) * 100) / 100;
      await user.save();

      if (!Array.isArray(video.WatchHours) || video.WatchHours.length === 0) {
          video.WatchHours = [0];
      }

      video.WatchHours[0] = Math.round(((video.WatchHours[0] || 0) + watchTime) * 100) / 100;
      await video.save();

      // ✅ Process and insert only first 2 **new** unique SEO tags
      if (video.Tags && Array.isArray(video.Tags)) {
          const videoTags = [...new Set(video.Tags.flatMap(tagStr => tagStr.split(',').map(tag => tag.trim())))];

          // Filter only tags that are **not already in SEO Tags**
          const newTags = videoTags.filter(tag => !user.SEOTags.includes(tag)).slice(0, 2);

          if (newTags.length > 0) {
              // If SEO tags exceed 15, remove the oldest ones before inserting new ones
              if (user.SEOTags.length + newTags.length > 15) {
                  const tagsToRemove = user.SEOTags.length + newTags.length - 15;
                  user.SEOTags.splice(0, tagsToRemove); // Remove the oldest tags
              }

              user.SEOTags.push(...newTags); // Insert new tags
              await user.save();
          }
      }


      res.status(200).json({ message: 'Watch time updated successfully.' });

  } catch (error) {
      console.error("Error updating watch time:", error);
      res.status(500).json({ message: 'Server error.' });
  }
});

router.get("/Booking-Done/:id",isloggedin, async function (req, res) {
  try{
    const Live = await liveMongo.findById(req.params.id).populate({
      path: "BookingDoneBy",
      select: "username"
    });
    const user = await User.findOne({ email: req.user.email })
  
    const userId = req.user._id;
      
    if (!Live.BookingDoneBy.includes(user._id)) {
      Live.BookingDoneBy.push(user._id);
      Live.Booking += 1
      await Live.save();
    }else{
      console.log("Booking Done")
    }
    if (!user.LiveBooked.includes(Live._id)){
      user.LiveBooked.push(Live._id)
      await user.save();
    }else{
      console.log("Booked recieved the Live Id")
    }

    const fcmToken = user.fcmToken;

    if (fcmToken) {
        try { 
            await sendPushNotificationAll(fcmToken, Live.title, "Your booking is confirmed");
        } catch (error) {
            console.error("🔥 Error sending notification:", error);
        }
    }

   res.redirect(`/live-content-applying-page/${req.params.id}`);
  }catch(err){
     res.redirect("/")
  }
});

router.post("/Booking-Done-for-community/:id",isloggedin, async function (req, res) {
  try{
    const community = await communityMongo.findById(req.params.id);

      if(!community.members.includes(req.user._id)){
        community.members.push(req.user._id);
        await community.save();
      }else{
       res.send("Already a member");
      }

   res.redirect(`/community-chat/${req.params.id}`);
  }catch(err){
     res.redirect("/")
  }
});

router.get("/Livedebate/:id", isloggedin, async function (req, res) { 
  try {
      const Live = await liveMongo.findById(req.params.id)
          .populate({ 
            path: "creator", 
            select: "followers username" })
          .populate({ 
            path: "opponent", 
            select: "username" 
          }).populate({
            path: "comment",
            select: "text userId",
            populate: {
              path: "userId",
              select: "username profile"
            }
          });

      if (!Live) {
          return res.status(404).send("Live debate not found");
      }

      const creator = Live.creator.username;
      const opponent = Live.opponent.username;
      const user = await User.findOne({ email: req.user.email });

      const followerscount = Live.creator[0].followers;
      const follower = followerscount.length;
      const isFollowing = followerscount.includes(req.user._id);

      // Check if user is a viewer
      const isCreator = Live.creator[0]._id.equals(req.user._id);
      const isOpponent = Live.opponent[0]._id.equals(req.user._id);
      const isViewer = !isCreator && !isOpponent;

      const RoomId = `${req.params.id}`;

      const comments = Live.comment;

      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
    }
    const Questions = Live.Questions;

    // Shuffle the comments array
    shuffleArray(comments);

      res.render("live-player", { Live, user, isFollowing, follower,  RoomId, isCreator, isOpponent, isViewer, comments, Questions });
  } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
  }
});

router.get("/start-debate", isloggedin, async function (req, res) {
  try {
    const content = await User.findOne({ email: req.user.email }).populate({
      path: "Live",
      select: "title description Time opponent",
      populate: {
        path: "opponent",
        select: "username"
      }
    });

    // Filter and calculate hoursLeft for active debates only
    const updatedContent = content.Live.filter((liveContent) => {
      const Time = new Date(liveContent.Time).getTime();
      const TimeLeft = Time - Date.now();
      return TimeLeft > 0; // Include only future debates
    }).map((liveContent) => {
      const Time = new Date(liveContent.Time).getTime();
      const TimeLeft = Time - Date.now();
      const hours = TimeLeft / (1000 * 60 * 60);
      const hoursLeft = hours.toFixed(1);

      return {
        ...liveContent.toObject(), // Convert Mongoose document to plain object
        hoursLeft,
        opponent: liveContent.opponent[0].username    //problem here should be solved only 0th index name getting
      };
    });
    

    res.render("start-debate", { content: updatedContent });
  } catch (err) {
    res.send(err);
    console.log(err);
  }
});

router.get("/MUN-competetion",isloggedin, async function(req, res){
  const competition = await competitionMongo.find({});
     res.render("MUN-PAGE", { competition });
});

router.get("/Discover-Page-of-MUN/:id",isloggedin, async function(req, res){
  const competition = await competitionMongo.findById(req.params.id);
  const user = await User.findOne({ email: req.user.email });

  const Booking = competition.members.some(id => id.equals(req.user.id));

  
  res.render("MUN-competition-page", { competition, user, Booking });
});

router.get("/Mun-member-entry/:id",isloggedin, async function(req, res){
  try{
    const Competition = await competitionMongo.findById(req.params.id).populate({
      path: "members",
      select: "username"
    });

    const user = await User.findOne({ email: req.user.email });
  
    const userId = req.user._id;
      
    if (!Competition.members.includes(user._id)) {
      Competition.members.push(user._id);
      await Competition.save();
      console.log("Booking not done");
    }else{
      console.log("Booking Done")
    }
    if (!user.MunCompetition.includes(Competition._id)){
      user.MunCompetition.push(Competition._id)
      await user.save();
    }else{
      console.log("Booked recieved the Live Id")
    }


   res.redirect(`/Discover-Page-of-MUN/${req.params.id}`);
  }catch(err){
     res.redirect("/")
  }
});

router.get("/My-ticket",isloggedin,async function(req, res){
  const tickets = await User.findOne({ email: req.user.email }).populate({
    path: "LiveBooked",
    select: "title Thumbnail Booking Time creator",
    populate: [
    {
      path: "creator",
      select: "username"
    },
    {
      path: "opponent",
      select: "username"
    }
  ]
  })
  .populate({
    path: "MunCompetition",
    select: "CompetitionName Date createdBy",
    populate: { path: "createdBy", select: "username" }
});

const user = await User.findOne({ email: req.user.email });


  res.render("tickets", { tickets, user });
});

router.get("/Delete-Account", isloggedin, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    .populate("podcast")
    .populate("vedio")
    .populate("communities")
    .populate("MunCompetition")
    .populate("requests")
    .populate("Sender")
    .populate("Live");

    const Live = user.Live.filter(live => live.LiveStatus === "Processing" || live.LiveStatus === "Live");
    
    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Delete all associated podcasts from the 'podcasts' collection
    await podcastsmongoose.deleteMany({ _id: { $in: user.podcast } });
    await videomongoose.deleteMany({ _id: { $in: user.vedio } });
    await communityMongo.deleteMany({ _id: { $in: user.communities } });
    await competitionMongo.deleteMany({ _id: { $in: user.MunCompetition } });

    if (Live.length) {
      return res.status(400).json({
        success: false,
        message: "You have pending live sessions. Complete them before deleting your account."
      });
    }

    await User.findByIdAndDelete(user._id);

    res.clearCookie("user");

    res.render("goodbye");
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while deleting the user.");
  }
});

router.get("/Notification",isloggedin, async function(req, res){
  const user = await User.findOne({ email: req.user.email }).populate({
    path: 'notification',
    select: 'title body notificationTime notificationType',
    options: { sort: { notificationTime: -1 } }
  });


  res.render("notification", { user });
});

router.post("/save-token",isloggedin, async (req, res) => {
  try {
    console.log("API HITTED");

    const { fcmToken } = req.body;
    console.log("Received Token:", fcmToken);

    if (!fcmToken) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Find user by ID (Ensure req.user exists & has _id)
    const existingUser = await User.findOne({ _id: req.user._id });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the user document with the new token
    await User.updateOne({ _id: req.user._id }, { $set: { fcmToken: fcmToken } });

    console.log("Token saved:", fcmToken);
    res.json({ success: true, message: "Token stored successfully" });

  } catch (error) {
    console.error("Error saving token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/delete-token", async (req, res) => {
  try {
    const { fcmToken } = req.body;
    console.log("Disabling FCM Token API Hitted:", fcmToken);

    if (!fcmToken) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Find user by fcmToken
    const updatedUser = await User.findOneAndUpdate(
      { fcmToken },
      { $unset: { fcmToken: "null" } }, // Removes the token field
      { new: true }
    );

    if (updatedUser) {
      console.log("Token removed from database:", fcmToken);
      return res.json({ success: true, message: "Token deleted successfully" });
    } else {
      return res.status(404).json({ success: false, message: "Token not found" });
    }
  } catch (error) {
    console.error("Error deleting token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/Terms-&-condition", async function(req, res) {
  res.render("termsandcondition");
});

router.get("/Privacy-Policy", async function (req, res) {
  res.render("Privacy-Policy");
});

router.get("/Contact-Us",isloggedin, async function (req, res) {
  res.render("Contact-Us");
});

router.get("/About-Us", isloggedin, async function (req, res) {
  res.render("About-us");
});







module.exports = router;
