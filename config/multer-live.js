const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");

const mongoURI = "mongodb+srv://sachinbajaj:MySecurePass@clartalk.gzh9a.mongodb.net/?retryWrites=true&w=majority";

// GridFS Storage Configuration
const storage = new GridFsStorage({
  url: mongoURI,
  options: { useNewUrlParser: true, useUnifiedTopology: true }, // Ensures proper connection handling
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      if (!file.mimetype.startsWith("video/")) {
        return reject(new Error("Only video files are allowed!"));
      }

      resolve({
        filename: `video-${Date.now()}-${file.originalname}`,
        bucketName: "videos",
        chunkSizeBytes: 1048576
      })
    });
  },
});


const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed!"), false);
    }
    cb(null, true);
  },
});

module.exports = videoUpload;
