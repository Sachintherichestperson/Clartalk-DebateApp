const nodemailer = require("nodemailer");
require("dotenv").config();

const SendEmail = async (email, subject, text, images = []) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail", // Use your email provider (e.g., Gmail, SMTP)
            auth: {
                user: process.env.EMAIL_USER, // Access from .env
                pass: process.env.EMAIL_PASS, // Access from .env
            },
        });

        let attachments = Array.isArray(images) ? images.map((image) => ({
            filename: image.filename,
            content: image.content,
            cid: image.cid
          })) : [];          

        // Generate HTML content with embedded images
        let htmlContent = `<p>${text}</p>`;
        attachments.forEach((image) => {
            htmlContent += `<img src="cid:${image.cid}" width="300"/>`;
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject,
            attachments: attachments,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

module.exports = SendEmail;
