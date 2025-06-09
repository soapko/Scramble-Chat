const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  // The roomId and userId are in the path, e.g., /api/webrtc-signals/room123/user456
  const pathParts = event.path.split('/').filter(p => p);
  const roomId = pathParts[pathParts.length - 2];
  const userId = pathParts[pathParts.length - 1];

  if (!roomId || !userId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing roomId or userId in path' })
    };
  }

  try {
    // Get the store inside the handler
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offers, answers })
    };

  } catch (error) {
    console.error('Error retrieving WebRTC signals:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to retrieve signals', details: error.message })
    };
  }
};
