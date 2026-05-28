const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific room
    socket.on('joinRoom', (roomCode) => {
        // Check how many people are currently in this room
        const room = io.sockets.adapter.rooms.get(roomCode);
        const numClients = room ? room.size : 0;

        if (numClients === 0) {
            // Be the first to join
            socket.join(roomCode);
            socket.room = roomCode; // Save room info to the socket
            socket.emit('waiting', { message: `Waiting for friend in room: ${roomCode}` });
        } else if (numClients === 1) {
            // Join as the second player and start the game
            socket.join(roomCode);
            socket.room = roomCode;
            io.to(roomCode).emit('gameStart', { message: 'Friend joined! Game On!' });
        } else {
            // Room is already full (max 2 players)
            socket.emit('roomError', { message: 'This room is already full!' });
        }
    });

    // Handle Player Choices
    socket.on('makeChoice', (run) => {
        socket.choice = run;
        const roomCode = socket.room;
        
        // Get both players in the room
        const clients = io.sockets.adapter.rooms.get(roomCode);
        if (clients && clients.size === 2) {
            const players = Array.from(clients).map(id => io.sockets.sockets.get(id));
            const [p1, p2] = players;
            
            // If both players have made their choices, resolve the round
            if (p1.choice && p2.choice) {
                io.to(roomCode).emit('roundResult', {
                    p1Choice: p1.choice,
                    p2Choice: p2.choice
                });
                // Reset choices for the next ball
                p1.choice = null;
                p2.choice = null;
            }
        }
    });

    // Handle Disconnects
    socket.on('disconnect', () => {
        if (socket.room) {
            io.to(socket.room).emit('opponentDisconnected', { message: 'Your friend disconnected.' });
        }
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});