// Global variables for the new P2P architecture
let currentRoom = null;
let userName = null;
let userId = null;
let webrtcManager = null;
let chatHistoryManager = null;
let players = new Map();

// Generate a unique user ID
function generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Function to generate a random 4-character alphanumeric code
function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Function to create or join a room
async function createOrJoinRoom(code = null) {
    const roomCode = code || generateRoomCode();
    currentRoom = roomCode.replace('#', '').trim();
    
    // Initialize chat history manager
    if (chatHistoryManager) {
        chatHistoryManager.onHistoryUpdated = null;
    }
    chatHistoryManager = new ChatHistoryManager(currentRoom);
    chatHistoryManager.onHistoryUpdated = (history) => {
        displayChatHistory(history);
    };
    
    // Load existing chat history
    const existingHistory = chatHistoryManager.getHistory();
    if (existingHistory.length > 0) {
        displayChatHistory(existingHistory);
    }
    
    // Stop existing WebRTC manager if any
    if (webrtcManager) {
        webrtcManager.stop();
    }
    
    // Initialize WebRTC manager
    webrtcManager = new WebRTCChatManager(currentRoom, userId, userName);
    
    // Set up WebRTC event handlers
    webrtcManager.onMessageReceived = (messageData) => {
        handleWebRTCMessage(messageData);
    };
    
    webrtcManager.onPeerConnected = (peerId) => {
        console.log(`Peer connected: ${peerId}`);
        addSystemMessage(`${peerId} connected to the room`);
        
        // Request chat history from the newly connected peer
        setTimeout(() => {
            chatHistoryManager.requestHistoryFromPeers(webrtcManager, userId);
        }, 1000);
    };
    
    webrtcManager.onPeerDisconnected = (peerId) => {
        console.log(`Peer disconnected: ${peerId}`);
        addSystemMessage(`${peerId} left the room`);
    };
    
    // Start WebRTC connection process
    await webrtcManager.start();
    
    // Update UI
    document.getElementById('currentRoom').textContent = `# ${currentRoom}`;
    closePopup('joinRoomPopup');
    
    // Add system message
    addSystemMessage(`Joined room ${currentRoom}`);
    
    console.log(`Joined room ${currentRoom} as ${userName} (${userId})`);
}

// Handle WebRTC messages
function handleWebRTCMessage(messageData) {
    console.log('Received WebRTC message:', messageData);
    
    switch (messageData.type) {
        case 'message':
            // Regular chat message
            addChatMessage({
                userName: messageData.userName,
                message: messageData.message,
                timestamp: messageData.timestamp
            });
            
            // Save to history
            chatHistoryManager.saveMessage(messageData);
            break;
            
        case 'history-request':
            // Another peer is requesting chat history
            chatHistoryManager.handleHistoryRequest(messageData, webrtcManager);
            break;
            
        case 'history-response':
            // Received chat history from a peer
            chatHistoryManager.handleHistoryResponse(messageData);
            break;
            
        case 'user-joined':
            addSystemMessage(`${messageData.userName} joined the room`);
            break;
            
        case 'user-left':
            addSystemMessage(`${messageData.userName} left the room`);
            break;
            
        default:
            console.log('Unknown message type:', messageData.type);
    }
}

// Add a system message
function addSystemMessage(text) {
    addChatMessage({
        userName: 'System',
        message: text,
        timestamp: Date.now()
    });
}

// Function to update the player list (simplified for WebRTC)
function updatePlayerList() {
    if (!webrtcManager) return;
    
    const connectedPeers = webrtcManager.getConnectedPeers();
    console.log(`Connected to ${connectedPeers.length} peers:`, connectedPeers);
    
    // Could update a UI element showing connected users if needed
}

// Function to get user initials
function getUserInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Function to generate a unique color based on the user's name
function generateUniqueColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 40%)`;
}

// Function to check if chat is scrolled to bottom
function isChatScrolledToBottom() {
    const chatContainer = document.getElementById('chatContainer');
    const threshold = 1;
    return Math.abs(chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight) <= threshold;
}

// Function to scroll chat to bottom
function scrollChatToBottom() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Function to show toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    toast.textContent = message;
    document.body.appendChild(toast);

    toast.addEventListener('click', () => {
        scrollChatToBottom();
        toast.remove();
    });

    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Function to add a chat message to the UI
function addChatMessage(data) {
    console.log('Adding chat message:', data);
    const chatContainer = document.getElementById('chatContainer');
    const chatMessages = document.getElementById('chatMessages');
    const wasAtBottom = isChatScrolledToBottom();
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.textContent = getUserInitials(data.userName);
    avatar.style.backgroundColor = generateUniqueColor(data.userName);

    const content = document.createElement('div');
    content.classList.add('message-content');

    const header = document.createElement('div');
    header.classList.add('message-header');

    const sender = document.createElement('span');
    sender.classList.add('message-sender');
    sender.textContent = data.userName;

    const time = document.createElement('span');
    time.classList.add('message-time');
    const timestamp = data.timestamp || Date.now();
    time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const text = document.createElement('div');
    text.classList.add('message-text');
    text.textContent = data.message;

    header.appendChild(sender);
    header.appendChild(time);
    content.appendChild(header);
    content.appendChild(text);

    messageElement.appendChild(avatar);
    messageElement.appendChild(content);

    chatMessages.appendChild(messageElement);

    if (wasAtBottom) {
        scrollChatToBottom();
    } else {
        showToast('New message received. Click to scroll to bottom.');
    }

    // Force a reflow to ensure the scroll height is updated
    chatContainer.offsetHeight;

    // Check if we need to scroll again
    if (wasAtBottom) {
        scrollChatToBottom();
    }
}

// Function to display chat history
function displayChatHistory(history) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = ''; // Clear existing messages
    
    history.forEach(message => {
        addChatMessage({
            userName: message.userName,
            message: message.message,
            timestamp: message.timestamp
        });
    });
    
    scrollChatToBottom();
}

// Function to open a popup
function openPopup(popupId) {
    document.getElementById(popupId).style.display = 'block';
}

// Function to close a popup
function closePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

// Function to update user name
function updateUserName(name) {
    if (name && name.trim()) {
        userName = name.trim();
        document.getElementById('currentUserName').textContent = userName;
        
        // Update user avatar in chat input
        const userAvatar = document.getElementById('userAvatar');
        userAvatar.textContent = getUserInitials(userName);
        userAvatar.style.backgroundColor = generateUniqueColor(userName);
        
        return true;
    }
    return false;
}

// New serverless + WebRTC message sending flow
async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const scrambleModeSelect = document.getElementById('scrambleMode');
    
    if (!chatInput) {
        console.error('Chat input not found');
        return;
    }

    const message = chatInput.value.trim();
    const scrambleMode = scrambleModeSelect ? scrambleModeSelect.value : 'silly';
    
    if (!message || !currentRoom || !webrtcManager) {
        console.log('Cannot send message: missing requirements');
        return;
    }

    console.log('Sending chat message:', message);
    
    try {
        // Step 1: Process message through serverless function
        const response = await fetch('/api/process-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                scrambleMode: scrambleMode
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to process message: ${response.status}`);
        }
        
        const result = await response.json();
        const processedMessage = result.processedMessage || message;
        
        console.log('Message processed:', processedMessage);
        
        // Step 2: Create message data
        const messageData = {
            type: 'message',
            userName: userName,
            userId: userId,
            message: processedMessage,
            timestamp: Date.now(),
            messageId: `${userId}-${Date.now()}`,
            scrambleMode: scrambleMode
        };
        
        // Step 3: Add to local chat (show immediately)
        addChatMessage(messageData);
        
        // Step 4: Save to local history
        chatHistoryManager.saveMessage(messageData);
        
        // Step 5: Broadcast to peers via WebRTC
        const sentToPeers = webrtcManager.sendMessage(processedMessage);
        
        if (!sentToPeers) {
            console.log('No peers connected - message only stored locally');
        }
        
        // Clear input
        chatInput.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Fallback: show original message locally
        const fallbackMessage = {
            userName: userName,
            message: `[Error] ${message}`,
            timestamp: Date.now()
        };
        addChatMessage(fallbackMessage);
    }
}

// Function to adjust chat container height for mobile
function adjustChatContainerHeight() {
    const chatContainer = document.getElementById('chatContainer');
    const chatControls = document.getElementById('chatControls');
    const windowHeight = window.innerHeight;
    const chatControlsHeight = chatControls.offsetHeight;
    
    chatContainer.style.height = `${windowHeight - chatControlsHeight}px`;
    scrollChatToBottom();
}

// Set up chat input and send button event listeners
function setupChatListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');

    if (chatInput && sendButton) {
        console.log('Setting up chat input and send button');
        sendButton.addEventListener('click', sendChatMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });

        // Mobile-specific listeners
        chatInput.addEventListener('focus', () => {
            setTimeout(adjustChatContainerHeight, 300);
        });

        chatInput.addEventListener('blur', () => {
            setTimeout(adjustChatContainerHeight, 300);
        });
    } else {
        console.error('Chat input or send button not found');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Generate unique user ID
    userId = generateUserId();
    console.log('Generated user ID:', userId);
    
    const joinButton = document.getElementById('joinButton');
    const roomCodeInput = document.getElementById('roomCode');
    const userNameInput = document.getElementById('userName');
    const updateNameButton = document.getElementById('updateNameButton');
    const currentRoomLink = document.getElementById('currentRoom');
    const changeRoomLink = document.getElementById('changeRoom');
    const joinRoomPopup = document.getElementById('joinRoomPopup');
    const userNamePopup = document.getElementById('userNamePopup');
    const validationMessage = document.getElementById('validationMessage');
    const nameValidationMessage = document.getElementById('nameValidationMessage');
    const userNameLink = document.getElementById('userNameLink');
    const updateNamePopover = document.getElementById('updateNamePopover');
    const updateUserNameInput = document.getElementById('updateUserName');
    const updateNamePopoverButton = document.getElementById('updateNamePopoverButton');
    const cancelJoinButton = document.getElementById('cancelJoinButton');
    const chatContainer = document.getElementById('chatContainer');

    // Open user name popup on page load
    openPopup('userNamePopup');

    // Prevent the initial name popup from closing when clicking outside
    userNamePopup.addEventListener('click', (e) => {
        if (e.target === userNamePopup) {
            e.stopPropagation();
        }
    });

    // Handle initial user name setup
    async function handleInitialUserName() {
        const name = userNameInput.value.trim();
        if (updateUserName(name)) {
            closePopup('userNamePopup');
            await createOrJoinRoom('DEMO'); // Automatically join DEMO room after setting name
        } else {
            nameValidationMessage.textContent = 'Please enter a valid name.';
        }
    }

    updateNameButton.addEventListener('click', handleInitialUserName);
    userNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleInitialUserName();
        }
    });

    // Handle join/create room
    async function handleJoinCreateRoom() {
        const code = roomCodeInput.value.toUpperCase();
        if (code && code.length === 4) {
            await createOrJoinRoom(code);
            roomCodeInput.value = '';
            validationMessage.textContent = '';
        } else {
            validationMessage.textContent = 'Please enter a valid 4-character room code.';
        }
    }

    joinButton.addEventListener('click', handleJoinCreateRoom);
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleJoinCreateRoom();
        }
    });

    // Handle current room and change room link click
    function handleRoomChange(e) {
        e.preventDefault();
        openPopup('joinRoomPopup');
    }

    currentRoomLink.addEventListener('click', handleRoomChange);
    changeRoomLink.addEventListener('click', handleRoomChange);

    // Handle cancel button click in join room popup
    cancelJoinButton.addEventListener('click', () => {
        closePopup('joinRoomPopup');
    });

    // Close popups when clicking outside (except for the initial name popup)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('popup') && e.target.id !== 'userNamePopup') {
            closePopup(e.target.id);
        }
    });

    // Handle user name link click
    userNameLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        updateNamePopover.style.display = 'block';
        updateUserNameInput.value = userName;
        updateUserNameInput.focus();
    });

    // Handle update name in popover
    function handleUpdateName() {
        const newName = updateUserNameInput.value.trim();
        if (updateUserName(newName)) {
            updateNamePopover.style.display = 'none';
        }
    }

    updateNamePopoverButton.addEventListener('click', handleUpdateName);
    updateUserNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUpdateName();
        }
    });

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
        if (!updateNamePopover.contains(e.target) && e.target !== userNameLink) {
            updateNamePopover.style.display = 'none';
        }
    });

    // Prevent popover from closing when clicking inside it
    updateNamePopover.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Set up chat input and send button
    setupChatListeners();

    // Set up ResizeObserver for chat container
    const resizeObserver = new ResizeObserver(() => {
        adjustChatContainerHeight();
    });

    if (chatContainer) {
        resizeObserver.observe(chatContainer);
    }

    // Initial adjustment for mobile
    adjustChatContainerHeight();

    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(adjustChatContainerHeight, 300);
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (webrtcManager) {
            webrtcManager.stop();
        }
    });
});

// Call setupChatListeners after the DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChatListeners);
} else {
    setupChatListeners();
}
