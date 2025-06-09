import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { roomId, userId, targetUserId, answer } = await req.json();

    // Validate input
    if (!roomId || !userId || !targetUserId || !answer) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the store inside the handler
    const store = getStore('webrtc-signaling');
    const timestamp = Date.now();
    const signalKey = `answer:${roomId}:${userId}:${targetUserId}:${timestamp}`;
    const signal = { type: 'answer', roomId, userId, targetUserId, answer, timestamp };

    await store.setJSON(signalKey, signal);

    return new Response(JSON.stringify({ success: true, message: 'Answer stored successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error storing WebRTC answer:', error);
    return new Response(JSON.stringify({ error: 'Failed to store answer', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
