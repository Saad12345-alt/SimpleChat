
import "dotenv/config";
import express, { Request, Response } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import sanitize from "mongo-sanitize";
import Message, { IMessage } from "./roommsg";

// --- Environment Variables ---
const PORT = process.env.SERVER_PORT ?? 3001;
const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/chatapp";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE ?? "") || 5 * 1024 * 1024;
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "") || 15 * 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "") || 20;

// --- Types ---
interface UploadRequestBody {
  room: string;
  username: string;
  text?: string;
}

interface SendMessagePayload {
  room: string;
  username: string;
  text: string;
}

// --- Rate Limiter ---
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: "Too many requests from this IP, please try again later.",
});

// --- App Setup ---
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const filetypes = /jpeg|jpg|png|pdf|docx|doc/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Error: Only Images, PDFs and Docs are allowed!"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

// --- HTTP Route for File Upload ---
app.post(
  "/upload",
  limiter,
  upload.single("file"),
  async (req: Request<{}, {}, UploadRequestBody>, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const room: string = sanitize(req.body.room);
      const username: string = sanitize(req.body.username);
      const text: string = req.body.text ?? "";

      const newMessage = new Message({
        room,
        username,
        text,
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        isFile: true,
      });

      const saved: IMessage = await newMessage.save();

      io.to(room).emit("receive_message", saved);

      res.status(200).json(saved);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: error.message });
    }
  }
);

// --- GET Route for Message History ---
app.get("/messages/:room", async (req: Request<{ room: string }>, res: Response): Promise<void> => {
  try {
    const messages: IMessage[] = await Message.find({ room: req.params.room }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
});

// --- HTTP & Socket.io Server ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_URL },
});

io.on("connection", (socket: Socket) => {
  socket.on("join_room", (room: string) => {
    void socket.join(room);
  });

  socket.on("send_message", async (data: SendMessagePayload) => {
    try {
      const newMessage = new Message({ ...data, isFile: false });
      const saved: IMessage = await newMessage.save();
      io.to(data.room).emit("receive_message", saved);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });
});

// --- Database Connection & Server Start ---
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend URL: ${FRONTEND_URL}`);
      console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
    });
  })
  .catch((err: Error) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });