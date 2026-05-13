const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, default: "" },
  isFile: { type: Boolean, default: false },
  fileName: { type: String, default: "" },
  filePath: { type: String, default: "" },
  fileType: { type: String, default: "" },
}, { timestamps: true }); // <-- this auto-adds createdAt & updatedAt

const Roommsg = mongoose.model("Message", messageSchema);

module.exports = Roommsg
