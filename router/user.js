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
    console.log(user.Sender)
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

router.get("/community", function(req, res){
  res.render("community");
})
router.get("/logout", logout)

router.get("/follow/:id",isloggedin, async function(req, res){
  const follow = await User.findById(req.params.id);  // The creator to be followed/unfollowed
  const user = await User.findOne({ email: req.user.email });  // The currently logged-in user

  // Check if the user is already following the creator
  if (!user.following.includes(follow._id)) {
    // If not, follow the creator: add to the logged-in user's followers
    user.following.push(follow._id);
    await user.save();
    
    // Also add the logged-in user to the creator's followers
    follow.followers.push(user._id);
    await follow.save();
  } else {
    // If the user is already following, unfollow the creator
    user.following.pull(follow._id);
    await user.save();

    // Also remove the logged-in user from the creator's followers
    follow.followers.pull(user._id);
    await follow.save();
  }

  // Redirect the user back to the previous page or home page
  const redirectUrl = req.get("Referrer") || "/";
  res.redirect(redirectUrl);
});


router.get("/check", function(req, res){
    res.render("live-player")
})

module.exports = router;