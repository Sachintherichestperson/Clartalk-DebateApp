const express = require("express");
const router = express.Router();
const User = require("../mongoose/user-mongo");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {userregister, loginuser, logout} = require("../controller/authcontroller");
const isloggedin = require("../middleware/isloggedin");
const podcastsmongoose = require("../mongoose/podcasts-mongo");
const videomongoose = require("../mongoose/video-mongo");
const liveMongo = require("../mongoose/live-mongo");
const communityMongo = require("../mongoose/community-mongo");
const competitionMongo = require("../mongoose/competition-mongo");
const upload = require("../config/multer");
const schedule = require("node-schedule");
const Socket  = require("socket.io");
const Razorpay = require("razorpay");
const userMongo = require("../mongoose/user-mongo");
const mongoose = require("mongoose");

const { conn, getGFS } = require("../config/gridfs");

router.get("/register", (req, res) => {                                                                      //register page
    let err = req.flash("key")
    res.render("Register", { err });
    console.log(err)
});

router.post("/register", userregister)                                                                     //register page--Uploader

router.get("/login", function(req, res){                                                                   //Login Page
    let err = req.flash("usernot")
    res.render("login", {err})
});

router.post("/login", loginuser)                                                                           //Login Page-Uploader

router.get("/",isloggedin,async function(req, res){                                                        // front page
  try{
    const user = await User.findOne({email: req.user.email}).populate("requests").populate( "Sender" );
    const vedios = await liveMongo.find({ status: "accept"})
    res.render("front-page", {vedios, user})
  }catch(err){
    res.status(404).send(err);
  }
});

router.get("/debate", isloggedin, async function (req, res) { 
  try {
      const user = await User.findOne({ email: req.user.email }).populate("requests");
      let userTags = user.SEOTags || [];
      
      let vedios = await videomongoose.find({}).populate("Thumbnail");

      
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

router.get("/debate/:id",isloggedin, async function(req, res){                                             //debate video-player
  try{
    let vedios = await videomongoose.findById(req.params.id)
    .populate({
        path: "creator",
        select: "username followers Rankpoints"
    });
    const creator = await User.findById(vedios.creator[0]._id).populate("Rankpoints")
    


    let user = await User.findOne({email: req.user.email });
    
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
    })
    
    res.render("vedioplayer", {
      vedios, 
      videoFile: vedios.vedio,
      suggestions, 
      currentRoute: "debate", 
      follower, 
      isFollowing, 
      user });
  }catch(err){
    res.send(err)
    console.log(err)
  }
});

router.get("/video/stream/:id", async (req, res) => {
  try {
    // Ensure GridFSBucket is initialized
    const gfs = getGFS();

    const fileId = new mongoose.Types.ObjectId(req.params.id);

    // Check if the file exists in GridFS
    const file = await conn.db.collection("videos.files").findOne({ _id: fileId });

    if (!file) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Set response headers for video streaming
    res.set({
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    });

    // Stream the video
    const readStream = gfs.openDownloadStream(fileId);
    readStream.pipe(res);
  } catch (err) {
    console.error("Error streaming video:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/podcast", isloggedin, async function(req, res){                                               //podcast section Page
  const user = await User.findOne({email: req.user.email}).populate("requests")
  let vedios = await podcastsmongoose.find({});

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
 
router.get("/podcast/:id",isloggedin, async function(req, res){                                            //podcast video-player
    try{
      let user = await User.findOne({email: req.user.email });
    let vedios = await podcastsmongoose.findById(req.params.id)
    .populate({
        path: "creator",
        select: "username followers"
    });

    const creator = await User.findById(vedios.creator[0]._id).populate("Rankpoints")

    const followerscount = vedios.creator[0].followers;
    const follower = followerscount.length;
    const isFollowing = followerscount.includes(req.user._id);
    

    if (!vedios.viewedBy.includes(user._id)) {
      vedios.Views += 1;
      vedios.viewedBy.push(user._id);
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


    res.render("vedioplayer", {vedios, suggestions,videoFile: vedios.vedio, currentRoute: "podcast", follower, isFollowing, user});

    }catch(err){
      res.send(err)
       console.log(err)
    }
});

router.get("/community",isloggedin,async function(req, res){                                               //community Page
  const communities = await communityMongo.find().populate({
    path: "createdBy",
    select: "username"
  });

  const user = await User.findOne({email: req.user.email}).populate("requests");
  res.render("community", { communities, user } );
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
      const community = await communityMongo.findById(req.params.id);

      if(!community.members.includes(req.user._id)){
        community.members.push(req.user._id);
        await community.save();
      }else{
       res.send("Already a member");
      }

      const redirectUrl = req.get("Referrer") || "/";
      res.redirect(redirectUrl);

  }catch(err){
    console.log(err);
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

  res.render("Livedebate-player", { Live, follower, suggestions, currentRoute: "live-content-applying-page", isFollowing, user, Booking });
  }catch(err){
        res.send("404").status("Page Not Found");
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

      console.log(user);

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
      console.log("Booking not done");
    }else{
      console.log("Booking Done")
    }
    if (!user.LiveBooked.includes(Live._id)){
      user.LiveBooked.push(Live._id)
      await user.save();
      console.log("Booked not recieved the Live Id");
    }else{
      console.log("Booked recieved the Live Id")
    }

    console.log("Payement Done", Live.BookingDoneBy);

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
          .populate({ path: "creator", select: "followers username" })
          .populate({ path: "opponent", select: "username" });

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

      res.render("live-player", { Live, user, isFollowing, follower,  RoomId, isCreator, isOpponent, isViewer });
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
    .populate("Sender");

    if (!user) {
      return res.status(404).send("User not found.");
    }

    // Delete all associated podcasts from the 'podcasts' collection
    await podcastsmongoose.deleteMany({ _id: { $in: user.podcast } });
    await videomongoose.deleteMany({ _id: { $in: user.vedio } });
    await communityMongo.deleteMany({ _id: { $in: user.communities } });
    await competitionMongo.deleteMany({ _id: { $in: user.MunCompetition } });

    if (user.requests.length > 0 || user.Sender.length > 0) {
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

router.get("/Chat-Notifications",isloggedin, async function(req, res){
  const user = await User.findOne({ email: req.user.email });
  res.render("chat-notification", { user });
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