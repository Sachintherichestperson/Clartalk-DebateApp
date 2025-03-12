const nodemailer = require("nodemailer");
require("dotenv").config();

const SendEmail = async (email, subject, text, images = []) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail", 
            auth: {
                user: process.env.EMAIL_USER, 
                pass: process.env.EMAIL_PASS,
            },
        });

        // Process image attachments
        let attachments = Array.isArray(images)
            ? images.map((image, index) => ({
                  filename: image.filename || `image${index + 1}.jpg`,
                  content: image.content,
                  cid: `image${index + 1}`, // Ensure unique CID
              }))
            : [];

        // Generate HTML content with inline images
        let imageHTML = "";
        if (attachments.length > 0) {
            imageHTML = `<div style="text-align: center; margin-top: 20px;">`;
            attachments.forEach((image) => {
                imageHTML += `<img src="cid:${image.cid}" style="max-width: 100%; border-radius: 5px; margin-top: 10px;" alt="Embedded Image"/>`;
            });
            imageHTML += `</div>`;
        }

        let htmlContent = `
            <div style="max-width: 600px; margin: auto; font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);">
                    <h2 style="text-align: center; color: #333;">${subject}</h2>
                    <hr style="border: 1px solid #ddd;"/>
                    <p style="font-size: 16px; color: #555; line-height: 1.6;">${text}</p>
                    ${imageHTML}
                    <hr style="border: 1px solid #ddd; margin-top: 20px;"/>
                    <p style="text-align: center; font-size: 14px; color: #777;">
                        This is an automated email from ClarTalk. Please do not reply.
                    </p>
                </div>
            </div>`;

        let mailOptions = {
            from: `"ClarTalk" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            attachments: attachments,
            html: htmlContent
        };

        let info = await transporter.sendMail(mailOptions);
        console.log("Email sent: " + info.response);
        return info.response;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

module.exports = SendEmail;
