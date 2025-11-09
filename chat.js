// Chat functionality
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const newChatBtn = document.getElementById('newChatBtn');
const historyList = document.getElementById('historyList');
const suggestedBtns = document.querySelectorAll('.suggested-btn');
const uploadButton = document.getElementById('uploadButton');
const fileInput = document.getElementById('fileInput');
const uploadedFilesContainer = document.getElementById('uploadedFiles');

let welcomeMessageVisible = true;
let isWaitingForResponse = false;
let uploadedFiles = [];
let currentConversationId = null;
let conversations = [];
let messageIdCounter = 0; // For tracking message IDs in the UI

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadChatHistory();
    await checkAuth();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });
        const data = await response.json();
        if (!data.success && !data.allowGuest) {
            // Redirect to auth page if not authenticated and guest access not allowed
            window.location.href = '/auth.html';
        } else if (!data.success && data.allowGuest) {
            // Create guest session if not authenticated
            try {
                const guestResponse = await fetch('/api/guest', {
                    method: 'POST',
                    credentials: 'include'
                });
                if (guestResponse.ok) {
                    await loadChatHistory();
                }
            } catch (error) {
                console.error('Error creating guest session:', error);
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

// Load chat history
async function loadChatHistory(autoLoad = true) {
    try {
        const response = await fetch('/api/chats', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load chat history');
        }
        
        const data = await response.json();
        if (data.success) {
            conversations = data.conversations || [];
            
            // Sort conversations by updated_at descending (newest first)
            conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
            
            renderChatHistory();
            
            // Only auto-load if requested and no current conversation is set
            if (autoLoad) {
                if (conversations.length > 0 && !currentConversationId) {
                    await loadConversation(conversations[0].id);
                } else if (conversations.length === 0) {
                    // No conversations, show welcome message
                    currentConversationId = null;
                    startNewChat();
                }
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Render chat history in sidebar
function renderChatHistory() {
    historyList.innerHTML = '';
    
    conversations.forEach(conv => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.conversationId = conv.id;
        
        if (conv.id === currentConversationId) {
            historyItem.classList.add('active');
        }
        
        const title = conv.title || 'New Chat';
        const date = new Date(conv.updated_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
        
        historyItem.innerHTML = `
            <div class="history-item-content">
                <span class="history-item-title">${title}</span>
                <span class="history-item-date">${date}</span>
            </div>
            <button class="history-item-menu-btn" title="More options">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="4" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                    <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
                </svg>
            </button>
            <div class="history-item-menu">
                <button class="history-menu-item" data-action="rename">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M8.5 2.5L11.5 5.5M10 1.5C10.3978 1.10218 10.9374 0.87868 11.5 0.87868C12.0626 0.87868 12.6022 1.10218 13 1.5C13.3978 1.89782 13.6213 2.43739 13.6213 3C13.6213 3.56261 13.3978 4.10218 13 4.5L4 13.5H0.5V10L9.5 1C9.89782 0.602176 10.4374 0.378676 11 0.378676C11.5626 0.378676 12.1022 0.602176 12.5 1L10 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Rename
                </button>
                <button class="history-menu-item" data-action="delete">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M11 3.5L3 11.5M3 3.5L11 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Remove
                </button>
            </div>
        `;
        
        // Handle click on history item (but not on menu button)
        const contentDiv = historyItem.querySelector('.history-item-content');
        contentDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            loadConversation(conv.id);
        });
        
        // Handle menu button click
        const menuBtn = historyItem.querySelector('.history-item-menu-btn');
        const menu = historyItem.querySelector('.history-item-menu');
        
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other open menus
            document.querySelectorAll('.history-item-menu').forEach(m => {
                if (m !== menu) {
                    m.classList.remove('show');
                }
            });
            menu.classList.toggle('show');
        });
        
        // Handle menu item clicks
        const renameBtn = historyItem.querySelector('[data-action="rename"]');
        const deleteBtn = historyItem.querySelector('[data-action="delete"]');
        
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.remove('show');
            renameConversation(conv.id, conv.title || 'New Chat');
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.remove('show');
            deleteConversation(conv.id);
        });
        
        historyList.appendChild(historyItem);
    });
    
    // Single global click handler to close menus when clicking outside
    if (!window.historyMenuClickHandler) {
        window.historyMenuClickHandler = (e) => {
            if (!e.target.closest('.history-item')) {
                document.querySelectorAll('.history-item-menu').forEach(m => {
                    m.classList.remove('show');
                });
            }
        };
        document.addEventListener('click', window.historyMenuClickHandler);
    }
}

// Rename a conversation
async function renameConversation(conversationId, currentTitle) {
    const newTitle = prompt('Enter new title for this chat:', currentTitle);
    
    if (newTitle === null) {
        return; // User cancelled
    }
    
    if (!newTitle.trim()) {
        alert('Title cannot be empty');
        return;
    }
    
    try {
        const response = await fetch(`/api/chats/${conversationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ title: newTitle.trim() })
        });
        
        if (!response.ok) {
            throw new Error('Failed to rename conversation');
        }
        
        const data = await response.json();
        if (data.success) {
            // Reload chat history to show updated title
            await loadChatHistory(false);
            
            // Reload current conversation if it's the one being renamed
            if (conversationId === currentConversationId) {
                await loadConversation(conversationId);
            }
        } else {
            throw new Error(data.message || 'Failed to rename conversation');
        }
    } catch (error) {
        console.error('Error renaming conversation:', error);
        alert('Failed to rename conversation. Please try again.');
    }
}

// Delete a conversation
async function deleteConversation(conversationId) {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
        return; // User cancelled
    }
    
    try {
        const response = await fetch(`/api/chats/${conversationId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }
        
        const data = await response.json();
        if (data.success) {
            // If the deleted conversation was the current one, start a new chat
            if (conversationId === currentConversationId) {
                currentConversationId = null;
                startNewChat();
            }
            
            // Reload chat history
            await loadChatHistory(false);
        } else {
            throw new Error(data.message || 'Failed to delete conversation');
        }
    } catch (error) {
        console.error('Error deleting conversation:', error);
        alert('Failed to delete conversation. Please try again.');
    }
}

// Load a specific conversation
async function loadConversation(conversationId) {
    try {
        const response = await fetch(`/api/chats/${conversationId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversation');
        }
        
        const data = await response.json();
        if (data.success) {
            currentConversationId = conversationId;
            renderChatHistory(); // Update active state
            
            // Clear current messages
            chatMessages.innerHTML = '';
            welcomeMessageVisible = false;
            
            // Load messages
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    let fileInfo = null;
                    if (msg.file_info) {
                        try {
                            fileInfo = JSON.parse(msg.file_info);
                        } catch (e) {
                            console.error('Error parsing file_info:', e);
                        }
                    }
                    addMessageToUI(msg.content, msg.role, fileInfo, msg.id, msg.created_at);
                });
            } else {
                // Show welcome message if no messages
                showWelcomeMessage();
            }
            
            // Scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        alert('Failed to load conversation. Please try again.');
    }
}

// Auto-resize textarea
chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Send message on Enter (Shift+Enter for new line)
chatInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send button click
sendButton.addEventListener('click', sendMessage);

// Suggested questions
suggestedBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const question = this.getAttribute('data-question');
        chatInput.value = question;
        sendMessage();
    });
});

// New chat button
newChatBtn.addEventListener('click', async function() {
    await createNewChat();
});

// Send message function
async function sendMessage() {
    const message = chatInput.value.trim();
    
    // Allow sending even with just files (no message)
    if ((!message && uploadedFiles.length === 0) || isWaitingForResponse) {
        return;
    }

    // Hide welcome message
    if (welcomeMessageVisible) {
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.style.display = 'none';
            welcomeMessageVisible = false;
        }
    }

    // Prepare message with file info
    let messageToSend = message;
    if (uploadedFiles.length > 0) {
        const fileNames = uploadedFiles.map(f => f.name).join(', ');
        messageToSend = message ? `${message}\n\n[Attached files: ${fileNames}]` : `[Attached files: ${fileNames}]`;
    }

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Disable input
    chatInput.disabled = true;
    sendButton.disabled = true;
    uploadButton.disabled = true;
    isWaitingForResponse = true;

    // Add user message with file attachments (temporary, will be replaced with saved message)
    const tempMessageId = 'temp-' + Date.now();
    addMessageToUI(messageToSend, 'user', uploadedFiles, tempMessageId);

    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    
    try {
        // Prepare form data for file upload
        const formData = new FormData();
        formData.append('message', message || '');
        if (currentConversationId) {
            formData.append('conversationId', currentConversationId);
        }
        
        uploadedFiles.forEach((file, index) => {
            formData.append(`file${index}`, file);
        });

        // Send message and files to AI
        const response = await fetch('/api/chat', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        // Check if response is ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server did not return JSON response');
        }

        // Remove typing indicator
        typingIndicator.remove();

        const data = await response.json();

        if (data.success) {
            // Update current conversation ID if it was a new conversation
            if (data.conversationId) {
                currentConversationId = data.conversationId;
                
                // Refresh history to update order (newest first) and show new/updated conversation
                await loadChatHistory(false); // Don't auto-load, we'll load manually
                
                // Reload conversation to get saved messages with proper IDs
                await loadConversation(currentConversationId);
            } else if (currentConversationId) {
                // Conversation already exists, refresh history to update order
                await loadChatHistory(false); // Don't auto-load, we'll load manually
                // Reload conversation to get saved messages with proper IDs
                await loadConversation(currentConversationId);
            } else {
                // Fallback: Add AI response directly
                addMessageToUI(data.response, 'ai');
            }
        } else {
            addMessageToUI(data.message || 'Sorry, I encountered an error. Please try again.', 'ai');
        }
    } catch (error) {
        console.error('Chat error:', error);
        typingIndicator.remove();
        let errorMessage = 'Sorry, I\'m having trouble connecting. Please check your connection and make sure the server is running.';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please make sure the server is running on http://localhost:3000';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Server returned an invalid response. Please check the server logs.';
        }
        addMessageToUI(errorMessage, 'ai');
    } finally {
        // Clear uploaded files
        uploadedFiles = [];
        uploadedFilesContainer.innerHTML = '';
        
        // Re-enable input
        chatInput.disabled = false;
        sendButton.disabled = false;
        uploadButton.disabled = false;
        isWaitingForResponse = false;
        chatInput.focus();
    }
}

// Add message to UI (with edit functionality)
function addMessageToUI(text, sender, files = [], messageId = null, timestamp = null) {
    // Remove temporary message if exists
    if (messageId && messageId.toString().startsWith('temp-')) {
        const tempMsg = document.querySelector(`[data-message-id="${messageId}"]`);
        if (tempMsg) {
            tempMsg.remove();
        }
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    if (messageId) {
        messageDiv.dataset.messageId = messageId;
    }

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? 'U' : 'AI';

    const content = document.createElement('div');
    content.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Add file attachments if any
    if (files && files.length > 0) {
        const filesDiv = document.createElement('div');
        filesDiv.className = 'message-files';
        filesDiv.style.cssText = 'margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);';
        
        files.forEach(file => {
            const fileDiv = document.createElement('div');
            fileDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px;';
            
            if (typeof file === 'object' && file.name) {
                // File object from upload or file info from database
                const fileName = file.name;
                const fileSize = file.size || 0;
                fileDiv.innerHTML = `
                    ${getFileIcon(fileName)}
                    <span>${fileName}</span>
                    ${fileSize > 0 ? `<span style="color: rgba(255,255,255,0.5); font-size: 11px;">(${formatFileSize(fileSize)})</span>` : ''}
                `;
            }
            
            filesDiv.appendChild(fileDiv);
        });
        
        textDiv.appendChild(filesDiv);
    }
    
    // Add message text (editable for user messages)
    const messageText = document.createElement('div');
    messageText.className = 'message-text-content';
    const cleanText = text.replace(/\[Attached files:.*?\]/g, '').replace(/\[User uploaded.*?\]/g, '').trim() || (files.length > 0 ? 'Files attached' : '');
    messageText.textContent = cleanText;
    textDiv.appendChild(messageText);

    // Add edit button for user messages
    if (sender === 'user' && messageId && !messageId.toString().startsWith('temp-')) {
        const editButton = document.createElement('button');
        editButton.className = 'message-edit-btn';
        editButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 2.5L11.5 5.5M10 1.5C10.3978 1.10218 10.9374 0.87868 11.5 0.87868C12.0626 0.87868 12.6022 1.10218 13 1.5C13.3978 1.89782 13.6213 2.43739 13.6213 3C13.6213 3.56261 13.3978 4.10218 13 4.5L4 13.5H0.5V10L9.5 1C9.89782 0.602176 10.4374 0.378676 11 0.378676C11.5626 0.378676 12.1022 0.602176 12.5 1L10 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        editButton.title = 'Edit message';
        editButton.addEventListener('click', () => {
            editMessage(messageId, cleanText, messageDiv);
        });
        bubble.appendChild(editButton);
    }

    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    if (timestamp) {
        const date = new Date(timestamp);
        timeDiv.textContent = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    } else {
        timeDiv.textContent = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    bubble.appendChild(textDiv);
    bubble.appendChild(timeDiv);
    content.appendChild(bubble);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Edit message function
async function editMessage(messageId, currentText, messageElement) {
    const messageTextDiv = messageElement.querySelector('.message-text-content');
    const originalText = messageTextDiv.textContent;
    
    // Create input field
    const input = document.createElement('textarea');
    input.value = originalText;
    input.className = 'message-edit-input';
    input.style.cssText = `
        width: 100%;
        min-height: 60px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(102, 178, 255, 0.5);
        border-radius: 8px;
        color: white;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
    `;
    
    // Replace text with input
    messageTextDiv.style.display = 'none';
    messageTextDiv.parentElement.insertBefore(input, messageTextDiv);
    input.focus();
    input.select();
    
    // Create save/cancel buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px; margin-top: 8px;';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.style.cssText = 'padding: 6px 12px; background: #66B2FF; border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding: 6px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: white; cursor: pointer; font-size: 12px;';
    
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(cancelBtn);
    input.parentElement.insertBefore(buttonContainer, input.nextSibling);
    
    // Save handler
    const saveHandler = async () => {
        const newText = input.value.trim();
        if (newText === originalText) {
            cancelHandler();
            return;
        }
        
        if (!newText) {
            alert('Message cannot be empty');
            return;
        }
        
        try {
            const response = await fetch(`/api/chats/${currentConversationId}/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ content: newText })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update message');
            }
            
            const data = await response.json();
            if (data.success) {
                // Update UI
                messageTextDiv.textContent = newText;
                messageTextDiv.style.display = '';
                input.remove();
                buttonContainer.remove();
            } else {
                throw new Error(data.message || 'Failed to update message');
            }
        } catch (error) {
            console.error('Error updating message:', error);
            alert('Failed to update message. Please try again.');
        }
    };
    
    // Cancel handler
    const cancelHandler = () => {
        messageTextDiv.style.display = '';
        input.remove();
        buttonContainer.remove();
    };
    
    saveBtn.addEventListener('click', saveHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    
    // Save on Enter (Ctrl+Enter or Cmd+Enter)
    input.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            saveHandler();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelHandler();
        }
    });
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'AI';

    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'typing-dots';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        dotsDiv.appendChild(dot);
    }

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(dotsDiv);
    chatMessages.appendChild(typingDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return typingDiv;
}

// Start new chat
// Create a new chat conversation
async function createNewChat() {
    if (isWaitingForResponse) {
        return; // Don't create new chat while waiting for response
    }
    
    try {
        // Create new conversation in database
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ title: 'New Chat' })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create new chat');
        }
        
        const data = await response.json();
        if (data.success && data.conversation) {
            // Set the new conversation as current
            currentConversationId = data.conversation.id;
            
            // Clear uploaded files
            uploadedFiles = [];
            uploadedFilesContainer.innerHTML = '';
            
            // Reload history to show the new chat and update active state
            await loadChatHistory(false); // Don't auto-load, we'll load manually
            
            // Load the new conversation (will show welcome message if empty)
            await loadConversation(currentConversationId);
        } else {
            alert('Failed to create new chat. Please try again.');
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
        alert('Error creating new chat. Please try again.');
    }
}

function startNewChat() {
    // Clear messages
    chatMessages.innerHTML = '';
    
    // Clear uploaded files
    uploadedFiles = [];
    uploadedFilesContainer.innerHTML = '';
    
    // Reset conversation ID
    currentConversationId = null;
    
    // Show welcome message
    showWelcomeMessage();
    
    // Update history to remove active state
    renderChatHistory();
}

// Show welcome message
function showWelcomeMessage() {
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'welcome-message';
    welcomeMsg.innerHTML = `
        <div class="welcome-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="30" fill="rgba(255, 215, 0, 0.1)"/>
                <path d="M30 15C21.7157 15 15 21.7157 15 30C15 38.2843 21.7157 45 30 45C38.2843 45 45 38.2843 45 30C45 21.7157 38.2843 15 30 15Z" stroke="#FFD700" stroke-width="2"/>
                <path d="M25 30L28 33L35 26" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h2>Welcome to AI Legal Assistant</h2>
        <p>I'm here to help you understand your legal rights and answer your questions. Ask me anything about legal matters!</p>
        <div class="suggested-questions">
            <button class="suggested-btn" data-question="What are my rights as a tenant?">What are my rights as a tenant?</button>
            <button class="suggested-btn" data-question="How do I file a complaint?">How do I file a complaint?</button>
            <button class="suggested-btn" data-question="What is the difference between civil and criminal law?">What is the difference between civil and criminal law?</button>
            <button class="suggested-btn" data-question="How do contracts work?">How do contracts work?</button>
        </div>
    `;
    chatMessages.appendChild(welcomeMsg);
    welcomeMessageVisible = true;

    // Reattach event listeners to suggested buttons
    const newSuggestedBtns = welcomeMsg.querySelectorAll('.suggested-btn');
    newSuggestedBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const question = this.getAttribute('data-question');
            chatInput.value = question;
            sendMessage();
        });
    });
}

// File upload functionality
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        handleFileUpload(files);
    }
    // Reset input to allow selecting the same file again
    fileInput.value = '';
});

function handleFileUpload(files) {
    files.forEach(file => {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
            return;
        }

        // Check file type
        const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            alert(`File type "${fileExtension}" is not supported. Allowed types: PDF, DOC, DOCX, TXT, JPG, JPEG, PNG`);
            return;
        }

        // Check if file already uploaded
        if (uploadedFiles.find(f => f.name === file.name && f.size === file.size)) {
            return;
        }

        // Add to uploaded files array
        uploadedFiles.push(file);
        displayUploadedFile(file);
    });
}

function displayUploadedFile(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.fileName = file.name;

    const fileIcon = getFileIcon(file.name);
    const fileSize = formatFileSize(file.size);

    fileItem.innerHTML = `
        ${fileIcon}
        <span class="file-name" title="${file.name}">${file.name}</span>
        <span class="file-size">${fileSize}</span>
        <button class="file-remove" onclick="removeFile('${file.name}', ${file.size})">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;

    uploadedFilesContainer.appendChild(fileItem);
}

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const icons = {
        pdf: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 2V5H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        doc: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 2V5H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 8H11M5 10H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`,
        docx: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 2V5H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 8H11M5 10H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`,
        txt: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 2H13V14H3V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 6H11M5 8H11M5 10H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`,
        jpg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
            <path d="M2 10L5 7L8 10L13 5V14H2V10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        jpeg: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
            <path d="M2 10L5 7L8 10L13 5V14H2V10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`,
        png: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
            <path d="M2 10L5 7L8 10L13 5V14H2V10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
    };

    return icons[extension] || `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2H10L13 5V14H3V2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 2V5H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function removeFile(fileName, fileSize) {
    uploadedFiles = uploadedFiles.filter(f => !(f.name === fileName && f.size === fileSize));
    const fileItem = document.querySelector(`.file-item[data-file-name="${fileName}"]`);
    if (fileItem) {
        fileItem.remove();
    }
}

// Make removeFile available globally
window.removeFile = removeFile;
