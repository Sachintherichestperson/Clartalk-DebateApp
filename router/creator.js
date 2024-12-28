const express = require("express");
const router = express.Router();
const User = require("../mongoose/user-mongo");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const upload = require("../config/multer");
const podcastsmongoose = require("../mongoose/podcasts-mongo");
const isloggedin = require("../middleware/isloggedin");
const videomongoose = require("../mongoose/video-mongo");
const livemongo = require("../mongoose/live-mongo");
const communitymongo = require("../mongoose/community-mongo");
const competitionmongo = require("../mongoose/competition-mongo");
const app = express();
const { createServer } = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const path = require("path");
const cron = require("node-cron");
const { setMaxListeners } = require("events");
const server = createServer(app);
const io = new Server(server);
const allusers = {};


router.get("/creator/upload", function(req, res){
    res.render("upload")
});

router.post("/upload",upload.fields([{ name: 'vedio', maxCount: 1 }, { name: 'Thumbnail', maxCount: 1 }]),isloggedin,async function(req, res){
    try{
      let {title, description, contentType} = req.body;
 
      let vedio = req.files.vedio[0].buffer;
      let Thumbnail = req.files.Thumbnail[0].buffer;
      let uploadDate = new Date();
 
      if(contentType === "podcast"){
         let content = await podcastsmongoose.create({
             title, 
             description,
             vedio: vedio, 
             Thumbnail: Thumbnail,
             createdAt: uploadDate
         });
 
         const user = await User.findOne({email: req.user.email});
         content.creator.push(user._id)
         await content.save();
 
         user.vedio.push(content._id);
         await user.save();
         res.redirect("/")

      }else if (contentType === "video") {
     let debate = await videomongoose.create({
         title, 
         description,
         vedio: vedio, 
         Thumbnail: Thumbnail,
         createdAt: uploadDate
     });
 
         const user = await User.findOne({email: req.user.email});
         debate.creator.push(user._id)
         await debate.save();
 
         user.debate.push(debate._id);
         await user.save();
         res.redirect("/")
  }else{
     res.render("/")
  }
    }catch(err){
     res.send(err)
     console.log("error", err)
    }
});

router.get("/creator/live",isloggedin ,async function(req, res){
  const live = await User.findOne({email: req.user.email});
    res.render("live-uploader", { live });
});

router.get("/creator/:id",isloggedin, async function(req, res){
    try{

        const user = await User.findById(req.params.id).populate({
            path: "vedio",
            select: "title description createdAt Thumbnail"
        }).populate({
            path: "debate",
            select: "title description createdAt Thumbnail"
        });
         
        const vedios = [...(user.vedio || []), ...(user.debate || [])];


        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("creatorpage", {vedios})
    }catch(err){
        res.send(err)
        console.log(err)
    }
});

router.post("/stream/live", upload.fields([{ name: 'vedio', maxCount: 1 }, { name: 'Thumbnail', maxCount: 1 }]), isloggedin, async function (req, res) {
  try {
    let { title, description, creator, Time, opponent, Type } = req.body;

    let Thumbnail = req.files.Thumbnail[0].buffer;
    let uploadDate = new Date();

    let now = new Date();
    let streamingDate = new Date(Time);
    if (streamingDate < now) return res.status(400).send("Streaming date must be in the future!");

    const opponentUser = await User.findOne({ username: opponent });
    if (!opponentUser) {
      return res.status(404).send("Opponent not found!");
    }

    let content = await livemongo.create({
      title,
      description,
      Thumbnail: Thumbnail,
      creator: req.user._id,
      Time: streamingDate,
      opponent: opponentUser._id,
      Type,
    });

    const user = await User.findOne({ email: req.user.email });

    user.Live.push(content._id);
    await user.save();

    content.creator.push(user._id);
    await content.save();

    const opponentName = opponentUser.username;
    const opponentId = opponentUser._id;

    opponentUser.requests.push({
      OpponentName: opponentUser._id,
      requestId: content._id,
      creatorId: req.user._id,
      title,
      description,
    });
    await opponentUser.save();

    user.Sender.push({
      OpponentName: opponentUser._id,
      requestId: content._id,
      creatorId: req.user._id,
      title,
      description,
    });
    await user.save();

    content.opponent.push(opponentId._id);
    await user.save();
    
    res.redirect("/")
  } catch (err) {
    console.log("error for router.post catch part ==== ", err);
    res.send(err);
  }
});

router.get("/opponent-requests/:Id", isloggedin, async (req, res) => {
  try {
    // Fetch the user by email and populate the requests
    const user = await User.findOne({ email: req.user.email }).populate({
      path: "requests",
      select: "OpponentName requestId title description",
    });

    // Check if the user or their requests do not exist or are empty
    if (!user || !user.requests || user.requests.length === 0) {
      return res.render("requests", { requests: [], contents: [], opponentId: null, user });
    }

    // Get the first request's opponentId
    const opponentId = user.requests[0]?.OpponentName; // Using optional chaining

    // If opponentId doesn't exist in the request, return empty data
    if (!opponentId) {
      return res.render("requests", { requests: [], contents: [], opponentId: null, user });
    }

    // Fetch the contents with status 'pending'
    const contents = await livemongo.find({ status: "pending" });

    // Render the page with requests and contents
    res.render("requests", { requests: user.requests, contents, opponentId, user });
  } catch (err) {
    console.log("Error fetching opponent requests: ", err);
    res.status(500).send("Server error");
  }
});

router.post("/accept/:id",isloggedin,async function (req, res) {
  try{
    let { requestId } = req.body;
    let opponent = await User.findById(req.params.id).populate({
      path: "requests",
      select: "status",
      populate: [
        {path: "OpponentName", select: "username"},
        {path: "creatorId", select: "username email Sender"}
      ]
    });
    const status = opponent.requests[0].creatorId.Sender[0];

    const sender = await User.findById(status.creatorId).findOneAndUpdate(
      { "Sender.status": "pending", },
      { $set: {"Sender.$.status": "accept"}},
       { new: true }
    )
    console.log(opponent);
    
    const request = opponent.requests[0].status;
    const update = await User.findOneAndUpdate(
      { "requests.status": "pending" }, 
      { $set: { "requests.$.status": "accept" } },
      { new: true } 
    );

    const updateVideo = await livemongo.findOneAndUpdate(
      { "status": "pending" }, 
      { $set: { status: "accept" } }, 
      { new: true }
    );

    opponent.Live.push(updateVideo);
    await opponent.save();
    res.redirect("/");
  }catch(err){
      res.send(err)
  }
});

router.post("/reject/:id",isloggedin,async function (req, res) {
  try{
    let { requestId } = req.body;
    let opponent = await User.findById(req.params.id).populate({
      path: "requests",
      select: "status",
      populate: [
        {path: "OpponentName", select: "username"},
        {path: "creatorId", select: "username email Sender"}
      ]
    });
    const status = opponent.requests[0].creatorId.Sender[0];

    const sender = await User.findById(status.creatorId).findOneAndUpdate(
      { "Sender.status": "pending", },
      { $set: {"Sender.$.status": "reject"}},
       { new: true }
    );


    const update = await User.findOneAndUpdate(
      { "requests.status": "pending" },
      { $set: { "requests.$.status": "reject" } }, 
      { new: true }
    );

    const updateVideo = await livemongo.findOneAndUpdate(
      { "status": "pending" }, // Assuming requestId corresponds to the video ID in liveMongo
      { $set: { status: "reject" } }, // Update the video status to "accept"
      { new: true } // Return the updated document
    );

    res.redirect("/");
  }catch(err){
      res.send(err)
  }
});

router.get("/Building-The-Community", function(req, res){
  res.render("community-builder")
});

router.post("/community/builder",upload.single("CommunityDP"), isloggedin, async function (req, res) {
  try{
       let{ CommunityName, CommunityisAbout, CommunityDP, CommunityType } = req.body;
       const user = await User.findOne({email: req.user.email});


       const community = await communitymongo.create({
         CommunityName,
         CommunityisAbout,
         CommunityType,
         CommunityDP: req.file.buffer,
         creator: user._id
       });

       user.communities.push(community._id);
       await user.save();
       res.redirect("/community");
  }catch(err){
    res.status(404).send(err)
    console.log(err)
  }
});

router.post("/debator-page/:id",isloggedin,async function (req, res) {
   try{
      const Live = await livemongo.findById(req.params.id).populate({
          path: "creator",
          select: "followers username"
        });
      
        const user = await User.findOne({email: req.user.email});
      
        const followerscount = Live.creator[0].followers;
          const follower = followerscount.length;
          const isFollowing = followerscount.includes(req.user._id);
      
        res.render("live-debater-page", { Live, user, isFollowing,follower });
   }catch(err){
    res.status(404).send(err)
    console.log(err)
   }
});

router.post("/delete/:id", isloggedin, async function (req, res) {
  const liveId = req.params.id;

  try {
    // Remove the live video reference from the User documents
    await User.updateMany(
      { "requests.requestId": liveId }, // Find users who have this liveId in their requests
      { $pull: { "requests": { requestId: liveId } } } // Remove the reference from requests array
    );

    await User.updateMany(
      { "Sender.requestId": liveId }, // Find users who have this liveId in their Sender
      { $pull: { "Sender": { requestId: liveId } } } // Remove the reference from Sender array
    );

    await User.updateMany(
      { "Live": liveId }, // Find users who have this liveId in their Live array
      { $pull: { "Live": liveId } } // Remove the reference from Live array
    );

    // Permanently delete the live video from the live collection
    const liveVideo = await livemongo.findByIdAndDelete(liveId);

    if (!liveVideo) {
      return res.status(404).send("Live video not found");
    }

    // Redirect to SentRequests page after deletion
    res.redirect("/SentRequests");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting live video");
  }
});

router.get("/Create-The-Competition",isloggedin, function(req, res){
  res.render("competition-creator");
});

router.post("/competition/builded",upload.single("CompetitionDP"), isloggedin, async function (req, res) {
  let { CompetitionName, CompetitionisAbout, CompetitionDP } = req.body;

  const competition = await competitionmongo.create({
    CompetitionName,
    CompetitionisAbout,
    CompetitionDP: req.file.buffer
  });

  res.redirect("/MUN-competetion");

});

module.exports = router;