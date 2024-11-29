const express = require("express");
const router = express.Router();
const User = require("../mongoose/user-mongo");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const {userregister, loginuser, logout} = require("../controller/authcontroller");
const isloggedin = require("../middleware/isloggedin");
const vediomongoose = require("../mongoose/vedio-mongo");
const debatemongoose = require("../mongoose/debate-mongo");
const liveMongo = require("../mongoose/live-mongo");
const communityMongo = require("../mongoose/community-mongo");

router.get("/register", (req, res) => {
    let err = req.flash("key")
    res.render("Register", { err });
    console.log(err)
})

router.post("/register", userregister)

router.get("/login", function(req, res){
    let err = req.flash("usernot")
    res.render("login", {err})
})

router.post("/login", loginuser)

router.get("/",isloggedin,async function(req, res){
  try{
    const user = await User.findOne({email: req.user.email}).populate("requests").populate( "Sender" );
    const vedios = await liveMongo.find({ status: "accept"})
    res.render("front-page", {vedios, user})
  }catch(err){
    res.status(404).send(err);
  }
  
})

router.get("/debate",isloggedin,async function(req, res){
  const user = await User.findOne({email: req.user.email});
  let vedios = await debatemongoose.find({});
  res.render("debate", { vedios })
})

router.get("/debate/:id",isloggedin, async function(req, res){
  try{;
    let vedios = await debatemongoose.findById(req.params.id)
    .populate({
        path: "creator",
        select: "username followers"
    })
    
    const followerscount = vedios.creator[0].followers;
    const follower = followerscount.length;
    const isFollowing = followerscount.includes(req.user._id);
    
    if (!vedios.viewedBy.includes(req.user._id)) {
      vedios.Views += 1;
      vedios.viewedBy.push(req.user._id);
      await vedios.save();
    }


    const suggestions = await debatemongoose.find({ _id: { $ne: vedios._id } }).limit(5).populate({
        path: "creator",
        select: "username"
    })
    
    res.render("vedioplayer", {vedios, suggestions, currentRoute: "debate", follower, isFollowing})
  }catch(err){
    res.send(err)
    console.log(err)
  }
})

router.get("/podcast", isloggedin, async function(req, res){
  const user = await User.findOne({email: req.user.email});
  let vedios = await vediomongoose.find({});
  res.render("podcast", { vedios });
});

router.get("/podcast/:id",isloggedin, async function(req, res){
    try{
      const user = await User.findOne({email: req.user.email});
    let vedios = await vediomongoose.findById(req.params.id)
    .populate({
        path: "creator",
        select: "username followers"
    });

    const followerscount = vedios.creator[0].followers;
    const follower = followerscount.length;
    const isFollowing = followerscount.includes(req.user._id);
    

    if (!vedios.viewedBy.includes(user._id)) {
      vedios.Views += 1;
      vedios.viewedBy.push(user._id);
      await vedios.save();
    }

    const suggestions = await vediomongoose.find({ _id: { $ne: vedios._id } }).limit(5).populate({
      path: "creator",
      select: "username"
  })
    res.render("vedioplayer", {vedios, suggestions, currentRoute: "podcast", follower, isFollowing})

    }catch(err){
      res.send(err)
       console.log(err)
    }
});

router.get("/community",async function(req, res){
  const communities = await communityMongo.find().populate({
    path: "createdBy",
    select: "username"
  });
  console.log(communities)
  res.render("community", { communities } );
})
router.get("/logout", logout)

router.get("/follow/:id",isloggedin, async function(req, res){
  const follow = await User.findById(req.params.id);  
  const user = await User.findOne({ email: req.user.email }); 


  if (!user.following.includes(follow._id)) {

    user.following.push(follow._id);
    await user.save();
    
    follow.followers.push(user._id);
    await follow.save();
  } else {
    user.following.pull(follow._id);
    await user.save();

    follow.followers.pull(user._id);
    await follow.save();
  }

  const redirectUrl = req.get("Referrer") || "/";
  res.redirect(redirectUrl);
});

router.get("/community-chat/:id",async function(req, res){
  try{
    const community = await communityMongo.findById(req.params.id)
    console.log(community)
    res.render("chat", {community});
  }catch(err){
    res.send(err)
    console.log(err.message)
  }
});

router.get("/profile", function(req, res){
  res.render("profile")
})

router.get("/uploaded-content", isloggedin, async function (req, res) {
  try {
    const vediosData = await User.findOne({ email: req.user.email }).populate({
      path: "vedio",
      select: "title description Thumbnail createdAt Views"
    });

    const debatesData = await User.findOne({ email: req.user.email }).populate({
      path: "debate",
      select: "title description Thumbnail createdAt Views"
    });

    // Combine and sort by createdAt date
    const allContent = [
      ...(vediosData?.vedio || []).map(vedio => ({ ...vedio.toObject(), type: "vedio" })),
      ...(debatesData?.debate || []).map(debate => ({ ...debate.toObject(), type: "debate" }))
    ];

    allContent.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.render("Uploaded-content-profile", { allContent });
  } catch (err) {
    console.error(err);
    res.status(500).send("An error occurred while fetching data.");
  }
});

router.get("/My-World",isloggedin, async function(req, res){
  const communities = await User.findOne({email: req.user.email}).populate("communities");
  res.render("Myworld", { communities })
});

router.get("/SentRequests",isloggedin, async function (req, res) {
  const contents = await User.findOne({ email: req.user.email }).populate({
    path: "Sender",
    select: "OpponentName",
    populate: {
      path: "OpponentName",
      select: "username"
    }
  });
  res.render("Sentrequests", { contents })
});

router.get("/live-content-applying-page/:id",isloggedin, async function(req, res){
  const Live = await liveMongo.findById(req.params.id).populate("creator");
  
  const followerscount = Live.creator[0].followers;
  const follower = followerscount.length;

  const suggestions = await liveMongo.find({ _id: { $ne: Live._id } }).limit(5).populate({
    path: "creator",
    select: "username"
})

  res.render("Livedebate-player", { Live, follower, suggestions, currentRoute: "live-content-applying-page" });
})
module.exports = router;