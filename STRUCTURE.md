# Chatting Application - Structure Guide

## Project Structure

```
chatting/
├── src/                    # Frontend (React)
│   ├── App.js
│   ├── index.js
│   ├── index.css
│   └── .env.local          # Frontend environment variables
├── backend/                # Backend (Node.js/Express)
│   ├── server.js           # Main server file
│   ├── roommsg.js          # MongoDB message schema
│   ├── uploads/            # File storage directory
│   └── .gitkeep
├── public/                 # Static files
├── .env                    # Backend environment variables (DO NOT COMMIT)
├── .env.example            # Environment variables template
├── .env.local              # (Deprecated - use src/.env.local)
├── .gitignore
├── package.json
└── README.md
```

## Environment Variables

### Backend (.env)
Located at the root of the project, used by `backend/server.js`

```env
SERVER_PORT=3001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/chatapp
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpeg,jpg,png,pdf,docx,doc
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=20
```

### Frontend (src/.env.local)
Located in the `src/` directory, used by React

```env
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_API_URL=http://localhost:3001
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | 3001 | Port for Express server |
| `NODE_ENV` | development | Environment (development/production) |
| `MONGO_URI` | mongodb://127.0.0.1:27017/chatapp | MongoDB connection string |
| `FRONTEND_URL` | http://localhost:3000 | CORS origin for frontend |
| `MAX_FILE_SIZE` | 5242880 (5MB) | Max file upload size in bytes |
| `RATE_LIMIT_WINDOW_MS` | 900000 (15min) | Rate limit time window |
| `RATE_LIMIT_MAX_REQUESTS` | 20 | Max requests per window |
| `REACT_APP_SOCKET_URL` | http://localhost:3001 | Socket.io server URL |
| `REACT_APP_API_URL` | http://localhost:3001 | Backend API URL |

## Running the Application

### Prerequisites
- Node.js and npm installed
- MongoDB running locally or remote connection configured

### Installation
```bash
npm install
```

### Development
```bash
# Terminal 1 - Start backend
npm run server

# Terminal 2 - Start frontend
npm start
```

### Production
Update `.env` with production values:
```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
MONGO_URI=your_production_mongodb_uri
```

## Important Notes

- **Never commit `.env` file** - it contains sensitive information
- Use `.env.example` as a template for new environment setups
- Frontend environment variables must be prefixed with `REACT_APP_`
- Backend uses `dotenv` package to load environment variables
- All hardcoded URLs have been replaced with environment variables

## File Upload

- Uploaded files are stored in `backend/uploads/`
- Maximum file size: 5MB (configurable via `MAX_FILE_SIZE`)
- Allowed file types: JPEG, JPG, PNG, PDF, DOCX, DOC

## Database

- MongoDB collections are created automatically
- Message schema includes: room, username, text, file info, and timestamps
