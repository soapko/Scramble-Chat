require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '.')));

const rooms = new Map();
const chatHistory = new Map();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Function to process message through LLM
async function processMessage(message, scrambleMode) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4.1-nano",
            messages: [
                {"role": "system", "content": `Respond by rewriting the user's message. 
Instructions: 
1. Retain the meaning and sentiment, but alter the sentence to be ${scrambleMode}.
2. limit your response to the same number of words as in the user's message
3. Respond only with the re-written message. Do not include any further text.
4. Do not include any safety or guardrails comments, notes about inappropriate or triggering content, or explanation about how the message was re-written. Include ONLY the rewritten message.`},
                {"role": "user", "content": message}
            ],
            temperature: 0.3,
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error processing message through LLM:', error);
        return message; // Return original message if there's an error
    }
}

// Function to add a message to chat history, limiting to 100 messages
function addToChatHistory(roomId, message) {
    if (!chatHistory.has(roomId)) {
        chatHistory.set(roomId, []);
    }
    const history = chatHistory.get(roomId);
    history.push(message);
    if (history.length > 100) {
        history.shift(); // Remove the oldest message if we exceed 100
    }
}

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('joinRoom', (data) => {
        socket.join(data.roomId);
        if (!rooms.has(data.roomId)) {
            rooms.set(data.roomId, new Map());
        }
        rooms.get(data.roomId).set(socket.id, { name: data.userName });
        io.to(data.roomId).emit('updatePlayers', Array.from(rooms.get(data.roomId), ([id, player]) => ({id, ...player})));
        
        const joinMessage = { userName: 'System', message: `${data.userName} has entered the room.` };
        io.to(data.roomId).emit('chatMessage', joinMessage);
        addToChatHistory(data.roomId, joinMessage);

        // Send chat history to the new user if it exists
        if (chatHistory.has(data.roomId)) {
            socket.emit('chatHistory', chatHistory.get(data.roomId));
        }
    });

    socket.on('updateUserName', (data) => {
        const room = rooms.get(data.roomId);
        if (room && room.has(socket.id)) {
            const oldName = room.get(socket.id).name;
            room.get(socket.id).name = data.userName;
            io.to(data.roomId).emit('userNameUpdated', { id: socket.id, userName: data.userName });
            const systemMessage = { userName: 'System', message: `${oldName} changed their name to ${data.userName}.` };
            io.to(data.roomId).emit('chatMessage', systemMessage);
            addToChatHistory(data.roomId, systemMessage);
        }
    });

    socket.on('chatMessage', async (data) => {
        const processedMessage = await processMessage(data.message, data.scrambleMode);
        const messageData = { userName: data.userName, message: processedMessage };
        io.to(data.roomId).emit('chatMessage', messageData);
        addToChatHistory(data.roomId, messageData);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
        rooms.forEach((players, roomId) => {
            if (players.has(socket.id)) {
                const userName = players.get(socket.id).name;
                players.delete(socket.id);
                io.to(roomId).emit('updatePlayers', Array.from(players, ([id, player]) => ({id, ...player})));
                const systemMessage = { userName: 'System', message: `${userName} has left the room.` };
                io.to(roomId).emit('chatMessage', systemMessage);
                addToChatHistory(roomId, systemMessage);

                // If the room is empty, clear the chat history
                if (players.size === 0) {
                    chatHistory.delete(roomId);
                }
            }
        });
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
