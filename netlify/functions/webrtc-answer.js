const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { roomId, userId, targetUserId, answer } = JSON.parse(event.body);

    if (!roomId || !userId || !targetUserId || !answer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Get the store inside the handler, relying on the runtime environment
    const store = getStore('webrtc-signaling');
    const timestamp = Date.now();
    const signalKey = `answer:${roomId}:${userId}:${targetUserId}:${timestamp}`;
    const signal = { type: 'answer', roomId, userId, targetUserId, answer, timestamp };

    await store.setJSON(signalKey, signal);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Answer stored successfully' })
    };

  } catch (error) {
    console.error('Error storing WebRTC answer:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to store answer', details: error.message })
    };
  }
};
