const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // We'll restrict this later to the frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('DevSync API is running');
});

const roomsRouter = require('./routes/rooms');
app.use('/api/rooms', roomsRouter);

const aiRouter = require('./routes/ai');
app.use('/api/ai', aiRouter);

const githubRouter = require('./routes/github');
app.use('/api/github', githubRouter);

const executeRouter = require('./routes/execute');
app.use('/api/execute', executeRouter);

// Socket.io for Real-time Collaboration
const roomUsers = new Map(); // roomId -> Set of user objects
const roomFiles = new Map(); // roomId -> Record<filePath, content>
const roomComments = new Map(); // roomId -> Array of comments

io.on('connection', (socket) => {
  const { roomId, uid, displayName, photoURL } = socket.handshake.query;

  if (roomId && uid) {
    socket.join(roomId);

    // Track user presence
    if (!roomUsers.has(roomId)) {
      roomUsers.set(roomId, new Map());
    }
    
    const usersInRoom = roomUsers.get(roomId);
    usersInRoom.set(uid, { uid, displayName, photoURL, socketId: socket.id });

    // Broadcast updated users list
    io.to(roomId).emit('users_update', Array.from(usersInRoom.values()));

    // Initialize default file if room is new
    if (!roomFiles.has(roomId)) {
      roomFiles.set(roomId, {
        'index.js': '// Start coding here...\n'
      });
    }

    // Send current files to the new user
    socket.emit('files_update', roomFiles.get(roomId));
    
    // Send current comments to the new user
    if (roomComments.has(roomId)) {
      socket.emit('comments_update', roomComments.get(roomId));
    }

    // Handle single file content changes
    socket.on('file_change', ({ filePath, content }) => {
      const files = roomFiles.get(roomId);
      if (files) {
        files[filePath] = content;
        socket.to(roomId).emit('file_change', { filePath, content });
      }
    });

    // Handle new file creation
    socket.on('file_create', ({ filePath, content = '' }) => {
      const files = roomFiles.get(roomId);
      if (files && !files[filePath]) {
        files[filePath] = content;
        io.to(roomId).emit('files_update', files);
      }
    });

    // Handle file deletion
    socket.on('file_delete', ({ filePath }) => {
      const files = roomFiles.get(roomId);
      if (files && files[filePath]) {
        delete files[filePath];
        io.to(roomId).emit('files_update', files);
      }
    });

    // Handle cursor movements
    socket.on('cursor_change', (cursorData) => {
      // cursorData should include uid, position, etc.
      socket.to(roomId).emit('cursor_update', { uid, ...cursorData });
    });

    // Handle comments
    socket.on('add_comment', (comment) => {
      if (!roomComments.has(roomId)) {
        roomComments.set(roomId, []);
      }
      const comments = roomComments.get(roomId);
      comments.push(comment);
      io.to(roomId).emit('comments_update', comments);
    });

    // WebRTC Signaling
    socket.on('webrtc_join', ({ roomId }) => {
      // Tell others in the room that this user joined the WebRTC call
      socket.to(roomId).emit('webrtc_user_joined', { socketId: socket.id });
    });

    socket.on('webrtc_signal', (payload) => {
      // payload: { to: string, signal: any, from: string }
      socket.to(payload.to).emit('webrtc_signal', {
        signal: payload.signal,
        from: socket.id
      });
    });

    socket.on('disconnect', () => {
      if (usersInRoom.has(uid)) {
        usersInRoom.delete(uid);
        if (usersInRoom.size === 0) {
          roomUsers.delete(roomId);
          // Optional: we can delete code from memory after a delay, or persist it.
        } else {
          io.to(roomId).emit('users_update', Array.from(usersInRoom.values()));
        }
      }
    });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
