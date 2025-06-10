import { NetlifyDB } from '@netlify/sdk';

export default async (req, context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(p => p);
  const roomId = pathParts[pathParts.length - 2];
  const userId = pathParts[pathParts.length - 1];

  if (!roomId || !userId) {
    return new Response(JSON.stringify({ error: 'Missing roomId or userId in path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = new NetlifyDB();
    const offers = [];
    const answers = [];
    const keysToDelete = [];

    // Get all offers for the room
    const offerDocs = await db.list({ prefix: `offer:${roomId}:` });
    for (const doc of offerDocs.items) {
      if (!doc.key.includes(`:${userId}:`)) {
        offers.push({ fromUserId: doc.value.userId, offer: doc.value.offer });
      }
    }

    // Get all answers targeted at the current user
    const answerDocs = await db.list({ prefix: `answer:${roomId}:` });
    for (const doc of answerDocs.items) {
      if (doc.key.includes(`:${userId}:`)) {
        answers.push({ fromUserId: doc.value.userId, answer: doc.value.answer });
        keysToDelete.push(doc.key);
      }
    }

    // Clean up consumed answers
    for (const key of keysToDelete) {
      await db.delete(key);
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
