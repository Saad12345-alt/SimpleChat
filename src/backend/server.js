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


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
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
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (file.mimetype.startsWith("image/") || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  }
});

// --- HTTP Route for File Upload ---
app.post("/upload",limiter, upload.single("file"), async (req, res) => {
  try {
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

// --- Socket.io Logic (Simplified) ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" }
});

io.on("connection", (socket) => {
  socket.on("join_room", (room) => socket.join(room));

  socket.on("send_message", async (data) => {
    const newMessage = new Message({ ...data, isFile: false });
    const saved = await newMessage.save();
    io.to(data.room).emit("receive_message", saved);
  });
});

mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
server.listen(3001, () => console.log("Server running on port 3001"));