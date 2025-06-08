# Scramble Chat

A serverless AI-powered chat application that transforms messages through LLM processing with real-time peer-to-peer communication.

## Features

- **AI Message Processing**: Messages are transformed using OpenAI's GPT-4 in various styles (pirate, professional, Shakespeare, etc.)
- **Peer-to-Peer Chat**: Direct WebRTC connections between users for real-time messaging
- **Serverless Architecture**: Built on Netlify Functions with Netlify Blobs for persistence
- **Room-based Chat**: Join chat rooms with 4-character codes
- **Client-side History**: Local storage with peer-to-peer history sharing
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices

## Architecture

- **Frontend**: Vanilla JavaScript with WebRTC
- **Backend**: Netlify Functions (serverless)
- **AI Processing**: OpenAI GPT-4.1-nano
- **Real-time**: WebRTC peer-to-peer data channels
- **Storage**: Netlify Blobs for signaling, localStorage for chat history
- **Deployment**: Netlify with automatic CI/CD

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript
- WebRTC for P2P communication
- Netlify Functions (Node.js)
- OpenAI API
- Netlify Blobs
- Git/GitHub for version control

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run locally: `npm run dev:netlify`

## Environment Variables

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Message Flow

1. User types message → 
2. Process through `/api/process-message` (OpenAI) → 
3. Broadcast via WebRTC data channels → 
4. Save to localStorage →
5. Display in chat

## Live Demo

[Live Demo URL will be here after deployment]

## License

MIT License
