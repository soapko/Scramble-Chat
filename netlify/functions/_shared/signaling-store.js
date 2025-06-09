const { getStore } = require('@netlify/blobs');

// Hardcoding credentials as a last resort to match the library's requirement.
const siteID = 'da58c02b-0367-40d6-8fc0-73da7f4d418b';
const token = 'nfp_A2VqK6bYNWwEJ2WoAfptm2jegWMA3s25b969';

function getSignalingStore() {
  return getStore('webrtc-signaling', { siteID, token });
}

// Helper function to clean up old signals (older than 5 minutes)
async function cleanupOldSignals() {
  const store = getSignalingStore();
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

  try {
    const { blobs } = await store.list();
    for (const blob of blobs) {
      const keyParts = blob.key.split(':');
      if (keyParts.length >= 4) {
        const timestamp = parseInt(keyParts[keyParts.length - 1], 10);
        if (timestamp < fiveMinutesAgo) {
          await store.delete(blob.key);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old signals:', error);
  }
}

// Store an offer
async function storeOffer(roomId, userId, offer) {
  const store = getSignalingStore();
  const timestamp = Date.now();
  const signalKey = `offer:${roomId}:${userId}:${timestamp}`;
  const signal = { type: 'offer', roomId, userId, offer, timestamp };

  await store.setJSON(signalKey, signal);
  cleanupOldSignals().catch(console.error);
  return signal;
}

// Store an answer
async function storeAnswer(roomId, userId, targetUserId, answer) {
  const store = getSignalingStore();
  const timestamp = Date.now();
  const signalKey = `answer:${roomId}:${userId}:${targetUserId}:${timestamp}`;
  const signal = { type: 'answer', roomId, userId, targetUserId, answer, timestamp };

  await store.setJSON(signalKey, signal);
  cleanupOldSignals().catch(console.error);
  return signal;
}

// Get signals for a user in a room
async function getSignals(roomId, userId) {
  const store = getSignalingStore();
  const offers = [];
  const answers = [];
  const keysToDelete = [];

  const { blobs } = await store.list({ prefix: `offer:${roomId}:` });
  for (const blob of blobs) {
    if (!blob.key.includes(`:${userId}:`)) {
      const signal = await store.get(blob.key, { type: 'json' });
      offers.push({ fromUserId: signal.userId, offer: signal.offer, timestamp: signal.timestamp });
    }
  }

  const { blobs: answerBlobs } = await store.list({ prefix: `answer:${roomId}:` });
  for (const blob of answerBlobs) {
    if (blob.key.includes(`:${userId}:`)) {
      const signal = await store.get(blob.key, { type: 'json' });
      answers.push({ fromUserId: signal.userId, answer: signal.answer, timestamp: signal.timestamp });
      keysToDelete.push(blob.key);
    }
  }

  for (const key of keysToDelete) {
    await store.delete(key);
  }

  return { offers, answers };
}

module.exports = {
  storeOffer,
  storeAnswer,
  getSignals,
};
