const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

const conn = require("./mongoose-connection");

let gfs = null; // Initially null, not undefined

// Initialize GridFSBucket once the MongoDB connection is open
conn.once("open", () => {
  gfs = new GridFSBucket(conn.db, { bucketName: "videos" });
});

// Function to get gfs safely
const getGFS = () => {
  if (!gfs) {
    throw new Error("❌ GridFSBucket is not initialized yet! Please wait for MongoDB connection.");
  }
  return gfs;
};

module.exports = { conn, getGFS };
