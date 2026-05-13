require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Message = require("./roommsg");
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const sanitize = require('mongo-sanitize');

// Load environment variables
const PORT = process.env.SERVER_PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatapp';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20;

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW,
  max: RATE_LIMIT_MAX,
  message: "Too many requests from this IP, please try again later."
})

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only 1 file per request
  }, 
  fileFilter: (req, file, cb) => {
    // 1. Check Extension
    const filetypes = /jpeg|jpg|png|pdf|docx|doc/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    // 2. Check MimeType
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: Only Images, PDFs and Docs are allowed!"));
    }
  }
});

// --- HTTP Route for File Upload ---
app.post("/upload", limiter, upload.single("file"), async (req, res) => {

  try {
    const cleanRoom = sanitize(req.body.room);
    const cleanUsername = sanitize(req.body.username);
    const { room, username, text } = req.body;
    
    const newMessage = new Message({
      room,
      username,
      text: text || "",
      fileName: req.file.originalname,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      isFile: true,
    });

    const saved = await newMessage.save();
    
    // Notify everyone in the room via Socket.io
    io.to(room).emit("receive_message", saved); 

    res.status(200).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GET Route for Message History ---
app.get("/messages/:room", async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Socket.io Logic (Simplified) ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: FRONTEND_URL }
});

io.on("connection", (socket) => {
  socket.on("join_room", (room) => socket.join(room));

  socket.on("send_message", async (data) => {
    const newMessage = new Message({ ...data, isFile: false });
    const saved = await newMessage.save();
    io.to(data.room).emit("receive_message", saved);
  });
});

// --- Database Connection & Server Start ---
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend URL: ${FRONTEND_URL}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
