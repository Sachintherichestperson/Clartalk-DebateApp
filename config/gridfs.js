const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

const conn = require("./mongoose-connection"); 

let gfs; // Declare gfs globally here

// Initialize GridFSBucket once the MongoDB connection is open
conn.once("open", () => {
  gfs = new GridFSBucket(conn.db, { bucketName: "videos" });
  console.log("✅ GridFS initialized and MongoDB Connection Open!");
});

// Function to safely get gfs if it's initialized
const getGFS = () => {
  if (!gfs) {
    throw new Error("❌ GridFSBucket is not initialized yet!");
  }
  return gfs;
};

module.exports = { conn, getGFS };