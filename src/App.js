import './index.css';
import React, { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:3001";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const socket = io(SOCKET_URL);

function App() {
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState('');
  const [chat, setChat] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null); // To clear the file input after sending

  const joinRoom = () => {
    if (room !== "" && username !== "") {
      socket.emit("join_room", room);
      const fetchHistory = async () => {
        try {
          const res = await fetch(`${API_URL}/messages/${room}`);
          const data = await res.json();
          setChat(data);
        } catch (error) {
          console.error("Error connecting to backend", error);
        }
      };
      fetchHistory();
      setShowChat(true);
    }
  };

  const messagesRef = useRef(null);

  useEffect(() => {
    // We only need one listener now because the server sends 
    // both text and files through "receive_message"
    socket.on("receive_message", (data) => {
      setChat((prev) => (prev.some(m => m._id === data._id) ? prev : [...prev, data]));
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [chat]);

  const handleSend = () => {
    if (file) {
      sendFile(); 
    } else if (message.trim() !== "") {
      sendMessage();
    }
  };

  const sendMessage = () => {
    const payload = { room, username, text: message };
    // Normal messages still go through Socket.io for speed
    socket.emit("send_message", payload);
    setMessage("");
  };

  // --- NEW MULTER UPLOAD LOGIC ---
  const sendFile = async () => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("room", room);
    formData.append("username", username);
    formData.append("text", message); // Caption

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // Reset states
        setFile(null);
        setMessage("");
        if (fileInputRef.current) fileInputRef.current.value = ""; 
      } else {
        const err = await response.json();
        alert(err.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading file");
    }
  };

  return (
    <div className="chat-app">
      {!showChat ? (
        <div className="join-container">
          <h2>Join a Room</h2>
          <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
          <input type="text" placeholder="Room ID" onChange={(e) => setRoom(e.target.value)} />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div className="chat-container">
          <div ref={messagesRef} className="messages">
            {chat.map((msg, i) => (
              <div key={msg._id || i} className={`message ${msg.username === username ? "own" : ""}`}>
                <b>{msg.username}: </b>
                {msg.isFile ? (
                  <>
                    <a href={`http://localhost:3001${msg.filePath}`} target="_blank" rel="noreferrer">
                      📎 {msg.fileName}
                    </a>
                    {msg.text && <div className="caption">{msg.text}</div>}
                  </>
                ) : (
                  <span>{msg.text}</span>
                )}
              </div>
            ))}
          </div>
          
          <div className="input-container">
            <input
              type="text"
              value={message}
              placeholder="Type your message..."
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files[0])} 
            />
            <button disabled={!message && !file} onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;