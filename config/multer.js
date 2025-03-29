const multer = require("multer");
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
<<<<<<< HEAD
const { CloudinaryStorage } = require("multer-storage-cloudinary");
=======
const { CloudinaryStorage } = require("multer-storage-cloudinary"); // ✅ Import this
>>>>>>> 2eba0c87247afa197b6f566bfacd31c5b6cc6626

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
<<<<<<< HEAD

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

=======

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

>>>>>>> 2eba0c87247afa197b6f566bfacd31c5b6cc6626
module.exports = upload;
