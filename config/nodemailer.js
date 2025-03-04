const nodemailer = require("nodemailer");
require("dotenv").config();

const sendOtpToEmail = async (email, otp) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail", // Use your email provider (e.g., Gmail, SMTP)
            auth: {
                user: process.env.EMAIL_USER, // Access from .env
                pass: process.env.EMAIL_PASS, // Access from .env
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP for Debate App",
            text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending OTP:", error);
    }
};

module.exports = sendOtpToEmail;
