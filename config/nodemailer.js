const nodemailer = require("nodemailer");

const sendOtpToEmail = async (email, otp) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail", // Use your email provider (e.g., Gmail, SMTP)
            auth: {
                user: "Bajajsachin100@gmail.com", // Your email
                pass: "hoyt xdcr rlle grof", // Your email password or App Password
            },
        });

        let mailOptions = {
            from: "Bajajsachin100@gmail.com",
            to: email,
            subject: "Your OTP for Debate App",
            text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
    } catch (error) {
        console.error("Error sending OTP:", error);
    }
};

module.exports = sendOtpToEmail;
