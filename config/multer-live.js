const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const config = require("config");

const mongoURI = config.get("MONGODB_URI") + "/debateapp";

// GridFS Storage Configuration
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    console.log("Uploading file:", file.originalname, file.mimetype);

    // Only allow video files
    if (file.mimetype.startsWith("video/")) {
      return {
        filename: `video-${Date.now()}-${file.originalname}`,
        bucketName: "videos", // Store in "videos" bucket
      };
    } else {
      return null; // Reject non-video files
    }
  },
});

// Handle storage events
storage.on("connection", (db) => {
  console.log("Connected to GridFS!");
});

storage.on("error", (err) => {
  console.error("GridFS Storage Error:", err);
});

// Multer middleware: Only accept video files & set max size (100MB)
const videoUpload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed!"), false);
    }
    cb(null, true);
  }
});

module.exports = videoUpload;