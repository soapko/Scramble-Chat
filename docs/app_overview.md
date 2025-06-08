# Scramble Chat - Application Overview

**Project ID:** `scramble`

## Overview

Scramble Chat is a real-time chatroom system with a unique AI-powered twist: all user messages are processed through an LLM to rewrite them in various styles before being displayed to other users. This creates a fun, dynamic chat experience where messages can be transformed to "talk like a pirate", "no swearing", "only allow in-game roleplaying", or any other style prompt.

## Core Features

### Real-Time Chat
- **Room-based conversations** with 4-character alphanumeric room codes
- **WebSocket communication** via Socket.IO for instant messaging
- **User management** with customizable usernames and avatars
- **Chat history** preservation (100 messages per room)
- **Mobile-responsive design** with adaptive UI

### AI Message Transformation
- **LLM Integration** using OpenAI's gpt-4.1-nano model
- **Style-based rewriting** of all user messages before display
- **Configurable scramble modes** (e.g., "silly", "pirate", "professional")
- **Fallback handling** - original message sent if AI processing fails
- **Real-time processing** with minimal latency impact

### User Experience
- **Automatic room joining** (defaults to "DEMO" room)
- **Dynamic user avatars** with color-coded initials
- **Responsive chat interface** optimized for desktop and mobile
- **Toast notifications** for new messages when scrolled up
- **Live user list** showing all participants in the room

## Technical Architecture

### Current Stack (Legacy - Being Migrated)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Backend:** Node.js with Express.js
- **Real-time:** Socket.IO for WebSocket communication
- **AI Processing:** OpenAI API (gpt-4.1-nano model)
- **Deployment:** Traditional server architecture (migrating to serverless)

### Target Architecture (Serverless + P2P)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Serverless Backend:** Netlify Functions for AI processing and WebRTC signaling
- **Real-time:** WebRTC data channels for direct peer-to-peer communication
- **AI Processing:** OpenAI API (gpt-4.1-nano model) via stateless functions
- **Persistence:** Client-side localStorage with peer history sharing
- **Deployment:** Netlify Functions + CDN distribution

### Key Components

#### Legacy Server Components (`server.js`) - Being Replaced
- **Express HTTP Server** - Serves static files and handles basic routing
- **Socket.IO Server** - Manages real-time WebSocket connections
- **Room Management** - Tracks users and chat state per room
- **Message Processing** - AI transformation pipeline for all messages
- **Chat History** - In-memory storage with automatic cleanup

#### Target Serverless Components
- **Message Processing** (`netlify/functions/process-message.js`) - Stateless OpenAI API processing
- **WebRTC Signaling** (`netlify/functions/webrtc-*.js`) - Peer connection coordination
- **Static Assets** - HTML/CSS/JS served via Netlify CDN
- **No server state** - All persistence moved to client-side

#### Frontend Components (Updated)
- **Chat Interface** (`index.html`) - Main chat UI with scramble mode selector
- **P2P Client** (`script.js`) - WebRTC client and chat history management
- **Responsive Styling** (`styles.css`) - Mobile-first responsive design
- **WebRTCChatManager** - Direct peer-to-peer communication via data channels
- **ChatHistoryManager** - Local storage and peer history sharing

#### New AI Processing Pipeline
```javascript
User Message → fetch(/api/process-message) → Processed Message → WebRTC Broadcast → localStorage
```

#### New Peer-to-Peer Data Flow
1. **User joins room** → Use signaling server to discover and connect to peers
2. **WebRTC handshake** → Exchange offers/answers via Netlify signaling functions  
3. **Direct connection** → Establish WebRTC data channels between peers
4. **User sends message** → Call serverless function for AI processing
5. **Processed message** → Broadcast directly to connected peers via WebRTC
6. **Message received** → Store in localStorage + display in UI
7. **New user joins** → Existing peers share their localStorage history
8. **User disconnect** → WebRTC handles cleanup, no server involvement

## Environment Configuration

### Required Environment Variables
- `OPENAI_API_KEY` - OpenAI API key for message processing

### Legacy Dependencies (Being Replaced)
```json
{
  "express": "^4.19.2",
  "openai": "^4.57.0", 
  "socket.io": "^4.7.5"
}
```

### Target Dependencies (Serverless)
```json
{
  "openai": "^4.57.0"
}
```

## Development Workflow

### Current Architecture Limitations
⚠️ **Migration Required:** Current architecture uses traditional Express server, not compatible with Netlify serverless requirements.

### Required Migration Tasks
1. **Serverless Functions** - Convert to Netlify function handlers
2. **WebSocket Replacement** - Implement alternatives for real-time features
3. **State Management** - Replace in-memory storage with persistent solution
4. **Function Architecture** - Split into individual serverless endpoints

## Hosting Configuration

### Netlify Setup
```toml
# netlify.toml — minimum viable scaffold
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"     # faster cold starts 
  external_node_modules = ["express"]

[[redirects]]
  from = "/api/*"
  to   = "/.netlify/functions/api/:splat"
  status = 200
  force  = true               # optional but recommended 
```

## Security Considerations

### API Security
- **Environment variables** for sensitive keys
- **Input validation** for user messages
- **Rate limiting** considerations for OpenAI API calls
- **Error handling** to prevent information disclosure

### Content Moderation
- **AI-based filtering** through message transformation
- **Fallback to original** message if processing fails
- **System message filtering** (join/leave notifications not processed)

## Performance Characteristics

### Current Metrics
- **Message latency** ~200-500ms (including AI processing)
- **Concurrent users** Limited by server resources
- **Memory usage** Grows with active rooms and chat history
- **API costs** Proportional to message volume

### Optimization Opportunities
- **Message batching** for high-volume rooms
- **Caching** for common transformations
- **Connection pooling** for database operations
- **CDN integration** for static assets

## Future Enhancements

### Planned Features
- **Custom scramble modes** - User-defined transformation styles
- **Message persistence** - Database storage for chat history
- **User authentication** - Account system with preferences
- **Room moderation** - Admin controls and user management
- **File sharing** - Image and document support
- **Voice messages** - Audio processing integration

### Technical Improvements
- **Serverless migration** - Full Netlify Functions compatibility
- **WebRTC integration** - Direct peer-to-peer features
- **Progressive Web App** - Offline capabilities and push notifications
- **Analytics integration** - Usage metrics and performance monitoring

## Known Issues

### Current Limitations
- **In-memory storage** - Data lost on server restart
- **Single server** - No horizontal scaling capability
- **No persistence** - Chat history not preserved long-term
- **Limited error handling** - Basic fallback mechanisms only

### Browser Compatibility
- **Modern browsers required** - ES6+ features used
- **Mobile Safari quirks** - Keyboard handling needs optimization
- **WebSocket support** - Required for real-time functionality

## API Reference

### Legacy Socket.IO Events (Being Replaced)

#### Client → Server
- `joinRoom({ roomId, userName })` - Join/create a chat room
- `chatMessage({ roomId, message, userName, scrambleMode })` - Send message
- `updateUserName({ roomId, userName })` - Change display name

#### Server → Client  
- `updatePlayers(playerData[])` - Room participant list
- `chatMessage({ userName, message })` - New message broadcast
- `chatHistory(messages[])` - Historical messages on join
- `userNameUpdated({ id, userName })` - Name change notification

### Target Serverless API

#### HTTP Endpoints
```javascript
POST /api/process-message
Input: { message: string, scrambleMode: string }
Output: { processedMessage: string, error?: string }

POST /api/webrtc-offer
Input: { roomId: string, userId: string, offer: RTCSessionDescription }
Output: { success: boolean }

POST /api/webrtc-answer  
Input: { roomId: string, userId: string, answer: RTCSessionDescription }
Output: { success: boolean }

GET /api/webrtc-signals/:roomId/:userId
Output: { offers: [...], answers: [...] }
```

#### WebRTC Data Channel Events
```javascript
// Direct peer-to-peer communication
'message' - { userName, message, timestamp, messageId }
'history-request' - { requesterId, userName }
'history-response' - { messages: [...], responderId }
'user-joined' - { userName, userId }
'user-left' - { userName, userId }
```

#### localStorage Schema
```javascript
// Key: `scramble-chat-${roomId}`
{
  messages: [
    { id, userName, message, timestamp, scrambleMode }
  ],
  lastUpdated: timestamp,
  messageCount: number
}
```

## Deployment Instructions

### Local Development
```bash
npm install
export OPENAI_API_KEY="your-api-key-here"
npm run dev:netlify
# Access at http://localhost:8888 (Netlify dev server)
```

### Production Deployment
⚠️ **Requires serverless migration before production deployment**

---

**Last Updated:** 2025-06-08  
**Version:** 1.0.0  
**Status:** Development (requires Netlify migration)
