const multer = require("multer");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage with Cloudinary for Videos
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Ensure only video files are uploaded
        if (!file.mimetype.startsWith("video/")) {
            throw new Error("Only video files are allowed!");
        }
        return {
            folder: "videos", // ✅ Cloudinary folder for videos
            resource_type: "auto", // ✅ Allows all video types
            public_id: `video-${Date.now()}`, // ✅ Unique video name
        };
    },
});

// Multer Upload Middleware
const videoUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("video/")) {
            cb(null, true); // ✅ Accept all video files
        } else {
            cb(new Error("Only video files are allowed"), false); // ❌ Reject non-video files
        }
    },
    limits: { fileSize: 60 * 1024 * 1024 } 
});

module.exports = videoUpload;