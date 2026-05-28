import './index.css';
import { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL ?? "http://localhost:3001";
const API_URL = process.env.REACT_APP_API_URL ?? "http://localhost:3001";
const socket = io(SOCKET_URL);

// --- Types ---
interface Message {
  _id: string;
  room: string;
  username: string;
  text: string;
  isFile: boolean;
  filePath?: string;
  fileName?: string;
}

interface UploadErrorResponse {
  error: string;
}

function App() {
  const [message, setMessage] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [chat, setChat] = useState<Message[]>([]);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const joinRoom = () => {
    if (room !== "" && username !== "") {
      socket.emit("join_room", room);

      const fetchHistory = async (): Promise<void> => {
        try {
          const res = await fetch(`${API_URL}/messages/${room}`);
          const data: Message[] = await res.json();
          setChat(data);
        } catch (error) {
          console.error("Error connecting to backend", error);
        }
      };

      void fetchHistory();
      setShowChat(true);
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data: Message) => {
      setChat((prev) =>
        prev.some((m) => m._id === data._id) ? prev : [...prev, data]
      );
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

  const handleSend = (): void => {
    if (file) {
      void sendFile();
    } else if (message.trim() !== "") {
      sendMessage();
    }
  };

  const sendMessage = (): void => {
    const payload = { room, username, text: message };
    socket.emit("send_message", payload);
    setMessage("");
  };

  const sendFile = async (): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file as File);
    formData.append("room", room);
    formData.append("username", username);
    formData.append("text", message);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setFile(null);
        setMessage("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        const err: UploadErrorResponse = await response.json();
        alert(err.error ?? "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading file");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  return (
    <div className="chat-app">
      {!showChat ? (
        <div className="join-container">
          <h2>Join a Room</h2>
          <input
            type="text"
            placeholder="Username"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      ) : (
        <div className="chat-container">
          <div ref={messagesRef} className="messages">
            {chat.map((msg, i) => (
              <div key={msg._id ?? i} className={`message ${msg.username === username ? "own" : ""}`}>
                <b>{msg.username}: </b>
                {msg.isFile ? (
                  <>
                    <a
                      href={`${API_URL}${msg.filePath}`}
                      target="_blank"
                      rel="noreferrer"
                    >
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === "Enter" && handleSend()
              }
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button disabled={!message && !file} onClick={handleSend}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App