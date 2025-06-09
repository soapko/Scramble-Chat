const { getStore } = require('@netlify/blobs');

// --- Inlined Blob Storage Logic ---
const siteID = 'da58c02b-0367-40d6-8fc0-73da7f4d418b';
const token = 'nfp_A2VqK6bYNWwEJ2WoAfptm2jegWMA3s25b969';

function getSignalingStore() {
  return getStore('webrtc-signaling', { siteID, token });
}

async function storeOffer(roomId, userId, offer) {
  const store = getSignalingStore();
  const timestamp = Date.now();
  const signalKey = `offer:${roomId}:${userId}:${timestamp}`;
  const signal = { type: 'offer', roomId, userId, offer, timestamp };
  await store.setJSON(signalKey, signal);
  return signal;
}
// --- End Inlined Logic ---

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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const { roomId, userId, offer } = JSON.parse(event.body);

    // Validate input
    if (!roomId || !userId || !offer) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing required fields: roomId, userId, offer' })
      };
    }

    // Store the offer using the inlined function
    await storeOffer(roomId, userId, offer);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Offer stored successfully'
      })
    };

  } catch (error) {
    console.error('Error storing WebRTC offer:', error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Failed to store offer',
        details: { name: error.name, message: error.message },
        success: false
      })
    };
  }
};
