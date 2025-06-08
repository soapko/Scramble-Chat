// Shared storage for WebRTC signaling with Netlify Blobs fallback to in-memory Map
const { getStore } = require('@netlify/blobs');

// Fallback in-memory storage when Blobs aren't available
const fallbackStore = new Map();
let useFallback = false;

// Get the signaling store (Blobs with Map fallback)
function getSignalingStore() {
  if (useFallback) {
    return null; // Signal to use Map fallback
  }
  
  try {
    // Try manual configuration with siteID and token
    const siteID = process.env.NETLIFY_SITE_ID || 'da58c02b-0367-40d6-8fc0-73da7f4d418b';
    const token = process.env.NETLIFY_ACCESS_TOKEN;
    
    console.log('Attempting Blobs with siteID:', siteID);
    console.log('Token available:', !!token);
    
    return getStore('webrtc-signaling', { siteID, token });
  } catch (error) {
    console.log('Netlify Blobs not available, using in-memory fallback:', error.message);
    useFallback = true;
    return null;
  }
}

// Helper function to clean up old signals from Map fallback
function cleanupOldSignalsFromMap() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const [key, signal] of fallbackStore.entries()) {
    if (signal.timestamp < fiveMinutesAgo) {
      fallbackStore.delete(key);
      console.log(`Cleaned up old signal from Map: ${key}`);
    }
  }
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
  
  // Use Map fallback if Blobs not available
  if (!store || useFallback) {
    cleanupOldSignalsFromMap();
    fallbackStore.set(signalKey, signal);
    console.log(`Stored WebRTC offer (Map fallback) for room ${roomId}, user ${userId}`);
    return signal;
  }
  
  try {
    await store.setJSON(signalKey, signal);
    console.log(`Stored WebRTC offer (Blobs) for room ${roomId}, user ${userId}`);
    
    // Trigger cleanup asynchronously (don't await)
    cleanupOldSignals().catch(console.error);
    
    return signal;
  } catch (error) {
    console.log('Blobs failed, falling back to Map storage:', error.message);
    useFallback = true;
    cleanupOldSignalsFromMap();
    fallbackStore.set(signalKey, signal);
    console.log(`Stored WebRTC offer (Map fallback) for room ${roomId}, user ${userId}`);
    return signal;
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
  
  // Use Map fallback if Blobs not available
  if (!store || useFallback) {
    cleanupOldSignalsFromMap();
    fallbackStore.set(signalKey, signal);
    console.log(`Stored WebRTC answer (Map fallback) for room ${roomId}, from ${userId} to ${targetUserId}`);
    return signal;
  }
  
  try {
    await store.setJSON(signalKey, signal);
    console.log(`Stored WebRTC answer (Blobs) for room ${roomId}, from ${userId} to ${targetUserId}`);
    
    // Trigger cleanup asynchronously (don't await)
    cleanupOldSignals().catch(console.error);
    
    return signal;
  } catch (error) {
    console.log('Blobs failed, falling back to Map storage:', error.message);
    useFallback = true;
    cleanupOldSignalsFromMap();
    fallbackStore.set(signalKey, signal);
    console.log(`Stored WebRTC answer (Map fallback) for room ${roomId}, from ${userId} to ${targetUserId}`);
    return signal;
  }
}

// Get signals for a user in a room
async function getSignals(roomId, userId) {
  const store = getSignalingStore();
  const offers = [];
  const answers = [];
  
  // Use Map fallback if Blobs not available
  if (!store || useFallback) {
    cleanupOldSignalsFromMap();
    const keysToDelete = [];
    
    for (const [key, signal] of fallbackStore.entries()) {
      const keyParts = key.split(':');
      
      if (keyParts.length >= 3 && keyParts[1] === roomId) {
        const signalType = keyParts[0];
        const signalUserId = keyParts[2];
        
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
              keysToDelete.push(key);
            }
          }
        }
      }
    }
    
    // Delete consumed answers
    for (const key of keysToDelete) {
      fallbackStore.delete(key);
      console.log(`Deleted consumed answer from Map: ${key}`);
    }
    
    console.log(`Retrieved (Map fallback) ${offers.length} offers and ${answers.length} answers for user ${userId} in room ${roomId}`);
    return { offers, answers };
  }
  
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
    
    console.log(`Retrieved (Blobs) ${offers.length} offers and ${answers.length} answers for user ${userId} in room ${roomId}`);
    
    return { offers, answers };
    
  } catch (error) {
    console.log('Blobs failed, falling back to Map storage:', error.message);
    useFallback = true;
    return await getSignals(roomId, userId); // Retry with Map fallback
  }
}

module.exports = {
  storeOffer,
  storeAnswer,
  getSignals
};
