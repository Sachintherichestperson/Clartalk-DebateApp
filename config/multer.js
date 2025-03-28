const multer = require("multer");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary"); // ✅ Import this

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "uploads", // ✅ Cloudinary folder name
        allowed_formats: ["jpg", "png", "jpeg", "webp", "avif"], // ✅ Allowed file types
        public_id: (req, file) => {
            return file.originalname.split(".")[0]; // ✅ File name without extension
        },
    },
});

// Multer Upload Middleware
const upload = multer({ storage: storage });

module.exports = upload;
