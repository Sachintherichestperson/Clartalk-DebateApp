const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const User = require("../mongoose/user-mongo");
const { sendPushNotification } = require("../services/firebase");
const otpGenerator = require("otp-generator");
const  sendOtpToEmail = require("../config/nodemailer");

module.exports.userregister = async (req, res) => {
    try {
        const { username, email, password, fcmToken } = req.body;

        // Check if the user already exists
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

        // Generate OTP
        const otp = otpGenerator.generate(6, { digits: true, upperCaseAlphabets: false, specialChars: false });

        // Store OTP and user details temporarily in session (or use Redis for scalability)
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
        req.session.tempUser = { username, email, password, fcmToken };

        console.log("Generated OTP:", otp); // Debugging purpose, remove in production

        // Send OTP to the user via email
        await sendOtpToEmail(email, otp);

        // Redirect to OTP page
        return res.redirect("/OTP");
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
};

module.exports.verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        // Check if OTP is expired
        if (!req.session.otp || Date.now() > req.session.otpExpires) {
            return res.status(400).json({ error: "OTP expired, request a new one." });
        }

        // Validate OTP
        if (req.session.otp !== otp) {
            return res.status(400).json({ error: "Invalid OTP" });
        }

        // OTP is valid, save user details permanently
        const { username, email, password, fcmToken } = req.session.tempUser;
        const hash = await bcrypt.hash(password, 10);

        // Create the user
        const newUser = new User({ username, email, password: hash, fcmToken });
        await newUser.save();

        console.log("User created:", newUser); // Debugging

        // Generate JWT Token
        const token = jwt.sign({ email: newUser.email, id: newUser._id }, process.env.JWT_KEY, {
            expiresIn: "7d", // Token valid for 7 days
        });

        // Set cookie with JWT Token
        res.cookie("user", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure in production
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiry
            sameSite: "strict",
        });

        console.log("JWT Token set successfully!"); // Debugging

        // Fetch the user again to confirm email is saved
        const updatedUser = await User.findById(newUser._id);
        console.log("Updated User:", updatedUser); // Debugging

        // Clear session data
        req.session.otp = null;
        req.session.otpExpires = null;
        req.session.tempUser = null;

        return res.json({ success: true, redirectUrl: "/" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
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