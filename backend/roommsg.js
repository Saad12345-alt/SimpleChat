const mongoose = require("mongoose");

// --- Schema ---
const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true },
    username: { type: String, required: true },
    text: { type: String, default: "" },
    isFile: { type: Boolean, default: false },
    fileName: { type: String, default: "" },
    filePath: { type: String, default: "" },
    fileType: { type: String, default: "" },
    createdAt: {
    type: Date,
    default: Date.now,
    expireAfterSeconds: 86400 // 24 hours, in seconds
  }
  },
  { timestamps: true }
);

// --- Model ---
const Roommsg = mongoose.model("Message", messageSchema);

module.exports = Roommsg;
