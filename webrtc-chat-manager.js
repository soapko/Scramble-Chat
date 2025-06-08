class WebRTCChatManager {
  constructor(roomId, userId, userName) {
    this.roomId = roomId;
    this.userId = userId;
    this.userName = userName;
    this.peers = new Map(); // Map of userId -> { connection, dataChannel, userName }
    this.isPolling = false;
    this.onMessageReceived = null;
    this.onPeerConnected = null;
    this.onPeerDisconnected = null;
    
    // WebRTC configuration with STUN servers
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    console.log(`WebRTC Chat Manager initialized for room ${roomId}, user ${userId}`);
  }
  
  // Start the WebRTC connection process
  async start() {
    console.log('Starting WebRTC Chat Manager...');
    
    // Start polling for signals
    this.startSignalPolling();
    
    // Create an offer to connect to existing peers
    await this.createOfferForRoom();
  }
  
  // Stop the WebRTC manager
  stop() {
    console.log('Stopping WebRTC Chat Manager...');
    this.isPolling = false;
    
    // Close all peer connections
    for (const [userId, peer] of this.peers) {
      if (peer.connection) {
        peer.connection.close();
      }
    }
    this.peers.clear();
  }
  
  // Create an offer to connect to the room
  async createOfferForRoom() {
    try {
      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      
      // Create data channel for messaging
      const dataChannel = peerConnection.createDataChannel('messages', {
        ordered: true
      });
      
      this.setupDataChannel(dataChannel, 'broadcast');
      this.setupPeerConnection(peerConnection, 'broadcast');
      
      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Send offer to signaling server
      await this.sendOffer(offer);
      
      // Store the connection temporarily
      this.peers.set('broadcast', {
        connection: peerConnection,
        dataChannel: dataChannel,
        userName: 'broadcast'
      });
      
      console.log('Offer created and sent to signaling server');
      
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }
  
  // Send offer to signaling server
  async sendOffer(offer) {
    try {
      const response = await fetch('/api/webrtc-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId: this.roomId,
          userId: this.userId,
          offer: offer
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send offer: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Offer sent successfully:', result);
      
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  }
  
  // Send answer to signaling server
  async sendAnswer(answer, targetUserId) {
    try {
      const response = await fetch('/api/webrtc-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId: this.roomId,
          userId: this.userId,
          targetUserId: targetUserId,
          answer: answer
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send answer: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Answer sent successfully:', result);
      
    } catch (error) {
      console.error('Error sending answer:', error);
    }
  }
  
  // Start polling for signals from other peers
  startSignalPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.pollForSignals();
  }
  
  // Poll for signals
  async pollForSignals() {
    if (!this.isPolling) return;
    
    try {
      const response = await fetch(`/api/webrtc-signals/${this.roomId}/${this.userId}`);
      
      if (response.ok) {
        const signals = await response.json();
        
        // Process offers
        for (const offerSignal of signals.offers) {
          await this.handleOffer(offerSignal);
        }
        
        // Process answers
        for (const answerSignal of signals.answers) {
          await this.handleAnswer(answerSignal);
        }
      }
      
    } catch (error) {
      console.error('Error polling for signals:', error);
    }
    
    // Poll again in 500ms for real-time messaging
    if (this.isPolling) {
      setTimeout(() => this.pollForSignals(), 500);
    }
  }
  
  // Handle incoming offer
  async handleOffer(offerSignal) {
    try {
      console.log('Handling offer from:', offerSignal.fromUserId);
      
      const peerConnection = new RTCPeerConnection(this.rtcConfig);
      this.setupPeerConnection(peerConnection, offerSignal.fromUserId);
      
      // Set remote description
      await peerConnection.setRemoteDescription(offerSignal.offer);
      
      // Create answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send answer back
      await this.sendAnswer(answer, offerSignal.fromUserId);
      
      // Store the connection
      this.peers.set(offerSignal.fromUserId, {
        connection: peerConnection,
        dataChannel: null, // Will be set when datachannel is received
        userName: offerSignal.fromUserId
      });
      
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }
  
  // Handle incoming answer
  async handleAnswer(answerSignal) {
    try {
      console.log('Handling answer from:', answerSignal.fromUserId);
      
      const broadcastPeer = this.peers.get('broadcast');
      if (broadcastPeer && broadcastPeer.connection) {
        await broadcastPeer.connection.setRemoteDescription(answerSignal.answer);
        
        // Update the peer mapping
        this.peers.set(answerSignal.fromUserId, broadcastPeer);
        this.peers.delete('broadcast');
      }
      
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }
  
  // Setup peer connection event handlers
  setupPeerConnection(peerConnection, peerId) {
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated for', peerId);
        // In a more complete implementation, you'd send ICE candidates
        // For simplicity, we're relying on the offer/answer exchange
      }
    };
    
    peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed for', peerId, ':', peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        if (this.onPeerConnected) {
          this.onPeerConnected(peerId);
        }
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        this.peers.delete(peerId);
        if (this.onPeerDisconnected) {
          this.onPeerDisconnected(peerId);
        }
      }
    };
    
    peerConnection.ondatachannel = (event) => {
      console.log('Data channel received from', peerId);
      const dataChannel = event.channel;
      this.setupDataChannel(dataChannel, peerId);
      
      // Update peer info
      const peer = this.peers.get(peerId);
      if (peer) {
        peer.dataChannel = dataChannel;
      }
    };
  }
  
  // Setup data channel event handlers
  setupDataChannel(dataChannel, peerId) {
    dataChannel.onopen = () => {
      console.log('Data channel opened with', peerId);
    };
    
    dataChannel.onclose = () => {
      console.log('Data channel closed with', peerId);
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Message received from', peerId, ':', message);
        
        if (this.onMessageReceived) {
          this.onMessageReceived(message);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error('Data channel error with', peerId, ':', error);
    };
  }
  
  // Send message to all connected peers
  sendMessage(message) {
    const messageData = {
      type: 'message',
      userName: this.userName,
      userId: this.userId,
      message: message,
      timestamp: Date.now(),
      messageId: `${this.userId}-${Date.now()}`
    };
    
    let sentCount = 0;
    for (const [peerId, peer] of this.peers) {
      if (peer.dataChannel && peer.dataChannel.readyState === 'open') {
        try {
          peer.dataChannel.send(JSON.stringify(messageData));
          sentCount++;
        } catch (error) {
          console.error('Error sending message to', peerId, ':', error);
        }
      }
    }
    
    console.log(`Message sent to ${sentCount} peers`);
    return sentCount > 0;
  }
  
  // Get list of connected peers
  getConnectedPeers() {
    const connected = [];
    for (const [peerId, peer] of this.peers) {
      if (peer.connection && peer.connection.connectionState === 'connected') {
        connected.push({
          userId: peerId,
          userName: peer.userName
        });
      }
    }
    return connected;
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebRTCChatManager;
}
