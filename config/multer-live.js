const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");  // ✅ Fix the import
const config = require("config");

const mongoURI = "mongodb+srv://sachinbajaj:MySecurePass@clartalk.gzh9a.mongodb.net/?retryWrites=true&w=majority";

// GridFS Storage Configuration
const storage = new GridFsStorage({
  url: "mongodb://localhost:27017/clartalk",
  file: (req, file) => {

    // Only allow video files
    if (file.mimetype.startsWith("video/")) {
      return {
        filename: `video-${Date.now()}-${file.originalname}`,
        bucketName: "videos", // Store in "videos" bucket
        chunkSizeBytes: 8 * 1024 * 1024, //
      };
    } else {
      return null; // Reject non-video files
    }
  },
});

// Handle storage events
storage.on("connection", (db) => {
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