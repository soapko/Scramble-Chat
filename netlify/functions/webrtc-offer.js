import { NetlifyDB } from '@netlify/sdk';

export default async (req, context) => {
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { roomId, userId, offer } = await req.json();

    // Validate input
    if (!roomId || !userId || !offer) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Netlify DB
    const db = new NetlifyDB();
    const timestamp = Date.now();
    const signalKey = `offer:${roomId}:${userId}:${timestamp}`;
    const signal = { type: 'offer', roomId, userId, offer, timestamp };

    // Use db.set instead of store.setJSON
    await db.set(signalKey, signal);

    return new Response(JSON.stringify({ success: true, message: 'Offer stored successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error storing WebRTC offer:', error);
    return new Response(JSON.stringify({ error: 'Failed to store offer', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
