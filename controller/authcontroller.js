const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken")
const User = require("../mongoose/user-mongo");
const { sendPushNotification } = require("../services/firebase");
const  SendEmail = require("../config/nodemailer");

module.exports.userregister = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        let { fcmToken } = req.body;

        fcmToken = fcmToken || null;

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
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP and user details temporarily in session (or use Redis for scalability)
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
        req.session.tempUser = { username, email, password, fcmToken };

        console.log("Generated OTP:", otp); // Debugging purpose, remove in production

        // Send OTP to the user via email
        await SendEmail(email, "Your OTP for Debate App", `Your OTP is: ${otp}. It is valid for 5 minutes.`);

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
            req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;

            if (req.session.otpAttempts >= 3) {  // After 3 failed attempts, expire the OTP
                req.session.otp = null;
                req.session.otpExpires = null;
                req.session.otpAttempts = 0;
                return res.status(400).json({ error: "OTP expired, request a new one." });
            }

            return res.status(400).json({ error: "Invalid OTP. Try again." });
        }

        // OTP is valid, clear session attempts
        req.session.otpAttempts = 0;

        // OTP is valid, proceed with user registration
        const { username, email, password, fcmToken } = req.session.tempUser;
        const hash = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hash, fcmToken });
        await newUser.save();

        // Generate JWT Token
        const token = jwt.sign({ email: newUser.email, id: newUser._id }, process.env.JWT_KEY, {
            expiresIn: "7d",
        });

        if (fcmToken) {
            await sendPushNotification(fcmToken, "Welcome To Clartalk", `Welcome ${username} Get Ready To Change The World`, "Clartalk");
        }

        // Set JWT Token in Cookie
        res.cookie("user", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: "strict",
        });

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

module.exports.resendOtp = async (req, res) => {
    try {
        if (!req.session.tempUser) {
            return res.status(400).json({ error: "Session expired. Please register again." });
        }

        // Generate a new OTP
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Update session with new OTP
        req.session.otp = newOtp;
        req.session.otpExpires = Date.now() + 5 * 60 * 1000; // 5-minute expiry
        req.session.otpAttempts = 0; // Reset attempts

        console.log("New OTP:", newOtp); // Debugging, remove in production

        await SendEmail(req.session.tempUser.email, "Your OTP for Debate App", `Your New OTP is: ${newOtp}.`);

        return res.json({ success: true, message: "New OTP sent successfully." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to resend OTP. Try again later." });
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
