import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

// --- Model ---
const Roommsg = mongoose.model("Message", messageSchema);

export default Roommsg;
