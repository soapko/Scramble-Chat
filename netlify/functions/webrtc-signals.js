import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  // The roomId and userId are in the path, e.g., /api/webrtc-signals/room123/user456
  const pathname = new URL(req.url).pathname;
  const pathParts = pathname.split('/').filter(p => p);
  const roomId = pathParts[pathParts.length - 2];
  const userId = pathParts[pathParts.length - 1];

  if (!roomId || !userId) {
    return new Response(JSON.stringify({ error: 'Missing roomId or userId in path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const store = getStore('webrtc-signaling');
    const offers = [];
    const answers = [];
    const keysToDelete = [];

    // Get all offers for the room, excluding the current user's
    const offerBlobs = await store.list({ prefix: `offer:${roomId}:` });
    for (const blob of offerBlobs.blobs) {
      if (!blob.key.includes(`:${userId}:`)) {
        const signal = await store.get(blob.key, { type: 'json' });
        offers.push({ fromUserId: signal.userId, offer: signal.offer });
      }
    }

    // Get all answers targeted at the current user
    const answerBlobs = await store.list({ prefix: `answer:${roomId}:` });
    for (const blob of answerBlobs.blobs) {
      if (blob.key.includes(`:${userId}:`)) {
        const signal = await store.get(blob.key, { type: 'json' });
        answers.push({ fromUserId: signal.userId, answer: signal.answer });
        keysToDelete.push(blob.key);
      }
    }

    // Clean up consumed answers
    for (const key of keysToDelete) {
      await store.delete(key);
    }

    return new Response(JSON.stringify({ offers, answers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error retrieving WebRTC signals:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve signals', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
