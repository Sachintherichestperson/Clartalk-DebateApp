const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const User = require("../mongoose/user-mongo");
const { sendPushNotification } = require("../services/firebase");

module.exports.userregister = async (req, res) => {
    try {
        const { username, email, password, fcmToken } = req.body; // Get FCM token from the request body

        const user = await User.findOne({ email });
        if (user) {
            req.flash("key", "User already registered");
            return res.redirect("/register");
        }

        const usernameId = await User.findOne({ username });
        if (usernameId) {
            req.flash("key", "Username not available");
            return res.redirect("/register");
        }

        bcrypt.genSalt(10, function (err, salt) {
            bcrypt.hash(password, salt, async function (err, hash) {
                if (err) {
                    req.flash("key", "Something went wrong");
                    return res.send("error");
                } else {
                    const newUser = await User.create({
                        username,
                        email,
                        password: hash,
                        fcmToken, // Store FCM token in the database
                    });

                    const notificationToken = newUser.fcmToken
                    console.log("FcmToken", fcmToken);

                    if (notificationToken) {
                        await sendPushNotification(fcmToken, "Welcome to Debate App!", "Get ready for exciting debates!", "Welcome");
                    }

                    let token = jwt.sign({ email: email }, process.env.JWT_KEY);
                    res.cookie("user", token, {
                        httpOnly: true,
                        secure: process.env.Node_KEY === "production",
                        maxAge: 7 * 24 * 60 * 60 * 1000,
                        sameSite: "strict",
                    });

                    return res.redirect("/");
                }
            });
        });
    } catch (err) {
        console.log(err);
    }
};


module.exports.loginuser = async (req, res) => {
        let {email, password} = req.body;
        const user = await User.findOne({email: email});
        if(!user){
            req.flash("usernot", "user not found")
            return res.redirect("/login")
        }
        bcrypt.compare(password, user.password, function(err, result){
            if(result){
                let token = jwt.sign({ email: email}, process.env.JWT_KEY);
                res.cookie("user", token);
                return res.redirect("/")
            }else {
                req.flash("usernot", "Incorrect password");
                return res.redirect("/login");
            }
        })
}

module.exports.logout = async (req, res) => {
        res.cookie("user", "");
        return res.redirect("/login")
}