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

// Configure Multer Storage with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Ensure only image files are uploaded
        if (!file.mimetype.startsWith("image/")) {
            throw new Error("Only image files are allowed!");
        }
        return {
            folder: "uploads", // ✅ Cloudinary folder name
            format: file.mimetype.split("/")[1], // ✅ Dynamically determine format
            public_id: file.originalname.split(".")[0], // ✅ File name without extension
        };
    },
});

// Multer Upload Middleware
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true); // ✅ Accept the file
        } else {
            cb(new Error("Only images are allowed"), false); // ❌ Reject non-images
        }
    },
});

module.exports = upload;
