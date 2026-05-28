import mongoose, { Document, Model, Schema } from "mongoose";

// --- Interface for the document ---
export interface IMessage {
  room: string;
  username: string;
  text: string;
  isFile: boolean;
  fileName: string;
  filePath: string;
  fileType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// --- Schema ---
const messageSchema = new Schema(
  {
    room:     { type: String, required: true },
    username: { type: String, required: true },
    text:     { type: String, default: "" },
    isFile:   { type: Boolean, default: false },
    fileName: { type: String, default: "" },
    filePath: { type: String, default: "" },
    fileType: { type: String, default: "" },
  },
  { timestamps: true }
);

// --- Model ---
const Roommsg = mongoose.model("Message", messageSchema);

export default Roommsg;