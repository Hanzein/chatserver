const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// In-memory storage for messages (replace with a database in production)
const messages = [];

// Socket.IO connection handler
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        socket.userId = decodedToken.uid;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
}).on('connection', (socket) => {
    console.log('New client connected');

    // Send existing messages to the newly connected client
    socket.emit('initial messages', messages);

    // Handle new messages
    socket.on('new message', (message) => {
        const newMessage = {
            ...message,
            userId: socket.userId,
            timestamp: new Date()
        };
        messages.push(newMessage);
        io.emit('new message', newMessage); // Broadcast the message to all connected clients
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});