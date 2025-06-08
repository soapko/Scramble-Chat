class ChatHistoryManager {
  constructor(roomId) {
    this.roomId = roomId;
    this.storageKey = `scramble-chat-${roomId}`;
    this.maxMessages = 100;
    this.onHistoryUpdated = null;
    
    console.log(`Chat History Manager initialized for room ${roomId}`);
  }
  
  // Get the current chat history from localStorage
  getHistory() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return data.messages || [];
      }
    } catch (error) {
      console.error('Error reading chat history:', error);
    }
    return [];
  }
  
  // Save a single message to localStorage
  saveMessage(message) {
    try {
      const history = this.getHistory();
      
      // Add message with required fields
      const messageData = {
        id: message.messageId || `${message.userId || 'unknown'}-${Date.now()}`,
        userName: message.userName,
        userId: message.userId || 'unknown',
        message: message.message,
        timestamp: message.timestamp || Date.now(),
        scrambleMode: message.scrambleMode || 'unknown'
      };
      
      // Check for duplicates (same messageId)
      const existingIndex = history.findIndex(msg => msg.id === messageData.id);
      if (existingIndex !== -1) {
        console.log('Message already exists, skipping:', messageData.id);
        return false;
      }
      
      // Add new message
      history.push(messageData);
      
      // Sort by timestamp
      history.sort((a, b) => a.timestamp - b.timestamp);
      
      // Keep only the last 100 messages
      if (history.length > this.maxMessages) {
        history.splice(0, history.length - this.maxMessages);
      }
      
      // Save to localStorage
      const storageData = {
        messages: history,
        lastUpdated: Date.now(),
        messageCount: history.length
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
      
      console.log(`Message saved to history. Total messages: ${history.length}`);
      
      // Notify listeners
      if (this.onHistoryUpdated) {
        this.onHistoryUpdated(history);
      }
      
      return true;
      
    } catch (error) {
      console.error('Error saving message to history:', error);
      return false;
    }
  }
  
  // Merge multiple histories and deduplicate
  mergeHistories(histories) {
    try {
      const currentHistory = this.getHistory();
      const allMessages = [...currentHistory];
      
      // Add messages from all provided histories
      for (const history of histories) {
        for (const message of history) {
          // Check for duplicates
          const exists = allMessages.some(existing => existing.id === message.id);
          if (!exists) {
            allMessages.push(message);
          }
        }
      }
      
      // Sort by timestamp
      allMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Keep only the last 100 messages
      if (allMessages.length > this.maxMessages) {
        allMessages.splice(0, allMessages.length - this.maxMessages);
      }
      
      // Save merged history
      const storageData = {
        messages: allMessages,
        lastUpdated: Date.now(),
        messageCount: allMessages.length
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(storageData));
      
      console.log(`Merged histories. Total unique messages: ${allMessages.length}`);
      
      // Notify listeners
      if (this.onHistoryUpdated) {
        this.onHistoryUpdated(allMessages);
      }
      
      return allMessages;
      
    } catch (error) {
      console.error('Error merging histories:', error);
      return this.getHistory();
    }
  }
  
  // Clear all chat history for this room
  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
      console.log(`Chat history cleared for room ${this.roomId}`);
      
      // Notify listeners
      if (this.onHistoryUpdated) {
        this.onHistoryUpdated([]);
      }
      
      return true;
    } catch (error) {
      console.error('Error clearing chat history:', error);
      return false;
    }
  }
  
  // Get storage info
  getStorageInfo() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          messageCount: data.messageCount || 0,
          lastUpdated: data.lastUpdated || 0,
          storageSize: new Blob([stored]).size
        };
      }
    } catch (error) {
      console.error('Error getting storage info:', error);
    }
    
    return {
      messageCount: 0,
      lastUpdated: 0,
      storageSize: 0
    };
  }
  
  // Request history from peers (to be used with WebRTC)
  requestHistoryFromPeers(webrtcManager, userId) {
    if (!webrtcManager) {
      console.warn('No WebRTC manager provided for history request');
      return;
    }
    
    const historyRequest = {
      type: 'history-request',
      requesterId: userId,
      roomId: this.roomId,
      timestamp: Date.now()
    };
    
    // Send request to all connected peers
    const peers = webrtcManager.getConnectedPeers();
    for (const peer of peers) {
      try {
        if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
          peer.dataChannel.send(JSON.stringify(historyRequest));
          console.log(`History request sent to peer ${peer.userId}`);
        }
      } catch (error) {
        console.error(`Error sending history request to ${peer.userId}:`, error);
      }
    }
    
    console.log(`History requests sent to ${peers.length} peers`);
  }
  
  // Handle history request from a peer
  handleHistoryRequest(request, webrtcManager) {
    if (!webrtcManager || request.type !== 'history-request') {
      return;
    }
    
    console.log(`Received history request from ${request.requesterId}`);
    
    const history = this.getHistory();
    const historyResponse = {
      type: 'history-response',
      responderId: request.requesterId, // Who we're responding to
      roomId: this.roomId,
      messages: history,
      timestamp: Date.now()
    };
    
    // Find the peer and send response
    const peers = webrtcManager.getConnectedPeers();
    const targetPeer = peers.find(p => p.userId === request.requesterId);
    
    if (targetPeer && targetPeer.dataChannel && targetPeer.dataChannel.readyState === 'open') {
      try {
        targetPeer.dataChannel.send(JSON.stringify(historyResponse));
        console.log(`History response sent to ${request.requesterId} with ${history.length} messages`);
      } catch (error) {
        console.error(`Error sending history response to ${request.requesterId}:`, error);
      }
    } else {
      console.warn(`Could not find connected peer ${request.requesterId} to send history response`);
    }
  }
  
  // Handle history response from a peer
  handleHistoryResponse(response) {
    if (response.type !== 'history-response') {
      return;
    }
    
    console.log(`Received history response with ${response.messages.length} messages`);
    
    if (response.messages && response.messages.length > 0) {
      this.mergeHistories([response.messages]);
    }
  }
  
  // Export history for debugging
  exportHistory() {
    const history = this.getHistory();
    const storageInfo = this.getStorageInfo();
    
    return {
      roomId: this.roomId,
      messages: history,
      ...storageInfo,
      exportTimestamp: Date.now()
    };
  }
  
  // Import history (for debugging/migration)
  importHistory(exportedData) {
    if (!exportedData || !exportedData.messages) {
      console.error('Invalid history data for import');
      return false;
    }
    
    try {
      this.mergeHistories([exportedData.messages]);
      console.log(`Imported ${exportedData.messages.length} messages`);
      return true;
    } catch (error) {
      console.error('Error importing history:', error);
      return false;
    }
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatHistoryManager;
}
