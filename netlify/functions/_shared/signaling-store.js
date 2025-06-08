// Shared storage for WebRTC signaling using Netlify Blobs
const { getStore } = require('@netlify/blobs');

// Get the signaling store
function getSignalingStore() {
  return getStore('webrtc-signaling');
}

// Helper function to clean up old signals (older than 5 minutes)
async function cleanupOldSignals() {
  const store = getSignalingStore();
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  
  try {
    const { blobs } = await store.list();
    
    for (const blob of blobs) {
      // Parse timestamp from key (format: type:room:user:timestamp)
      const keyParts = blob.key.split(':');
      if (keyParts.length >= 4) {
        const timestamp = parseInt(keyParts[keyParts.length - 1]);
        if (timestamp < fiveMinutesAgo) {
          await store.delete(blob.key);
          console.log(`Cleaned up old signal: ${blob.key}`);
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
  
  const signal = {
    type: 'offer',
    roomId,
    userId,
    offer,
    timestamp
  };
  
  try {
    await store.setJSON(signalKey, signal);
    console.log(`Stored WebRTC offer for room ${roomId}, user ${userId}`);
    
    // Trigger cleanup asynchronously (don't await)
    cleanupOldSignals().catch(console.error);
    
    return signal;
  } catch (error) {
    console.error('Error storing offer:', error);
    throw error;
  }
}

// Store an answer
async function storeAnswer(roomId, userId, targetUserId, answer) {
  const store = getSignalingStore();
  const timestamp = Date.now();
  const signalKey = `answer:${roomId}:${userId}:${targetUserId}:${timestamp}`;
  
  const signal = {
    type: 'answer',
    roomId,
    userId,
    targetUserId,
    answer,
    timestamp
  };
  
  try {
    await store.setJSON(signalKey, signal);
    console.log(`Stored WebRTC answer for room ${roomId}, from ${userId} to ${targetUserId}`);
    
    // Trigger cleanup asynchronously (don't await)
    cleanupOldSignals().catch(console.error);
    
    return signal;
  } catch (error) {
    console.error('Error storing answer:', error);
    throw error;
  }
}

// Get signals for a user in a room
async function getSignals(roomId, userId) {
  const store = getSignalingStore();
  const offers = [];
  const answers = [];
  
  try {
    const { blobs } = await store.list();
    const keysToDelete = [];
    
    for (const blob of blobs) {
      const keyParts = blob.key.split(':');
      
      if (keyParts.length >= 3 && keyParts[1] === roomId) {
        const signalType = keyParts[0];
        const signalUserId = keyParts[2];
        
        try {
          const signal = await store.get(blob.key, { type: 'json' });
          
          if (signal && signal.roomId === roomId) {
            if (signalType === 'offer' && signalUserId !== userId) {
              // Offers from other users that this user should see
              offers.push({
                fromUserId: signal.userId,
                offer: signal.offer,
                timestamp: signal.timestamp
              });
            } else if (signalType === 'answer' && keyParts.length >= 4) {
              const targetUserId = keyParts[3];
              if (targetUserId === userId) {
                // Answers targeted to this user
                answers.push({
                  fromUserId: signal.userId,
                  answer: signal.answer,
                  timestamp: signal.timestamp
                });
                // Mark for deletion after retrieving (one-time use)
                keysToDelete.push(blob.key);
              }
            }
          }
        } catch (error) {
          console.error(`Error reading signal ${blob.key}:`, error);
        }
      }
    }
    
    // Delete consumed answers
    for (const key of keysToDelete) {
      try {
        await store.delete(key);
        console.log(`Deleted consumed answer: ${key}`);
      } catch (error) {
        console.error(`Error deleting ${key}:`, error);
      }
    }
    
    console.log(`Retrieved ${offers.length} offers and ${answers.length} answers for user ${userId} in room ${roomId}`);
    
    return { offers, answers };
    
  } catch (error) {
    console.error('Error retrieving signals:', error);
    return { offers: [], answers: [] };
  }
}

module.exports = {
  storeOffer,
  storeAnswer,
  getSignals
};
