/**
 * WP Chat Plugin - Front-end JavaScript
 * Handles chat widget functionality and user status indicators
 */
(function($) {
    'use strict';

    // Chat widget state
    let chatState = {
        isOpen: false,
        sessionId: null,
        userId: null,
        visitorId: null,
        messages: [],
        lastMessageId: 0,
        typingTimeout: null,
        typingUsers: [],
        isWithinHours: false,
        pollingInterval: null,
        statusInterval: null,
        isTyping: false
    };

    // DOM elements
    let $chatWidget;
    let $chatToggle;
    let $chatContainer;
    let $chatMessages;
    let $chatInput;
    let $chatHeader;
    let $chatForm;
    let $userInfoForm;
    let $typingIndicator;
    let $fileUpload;

    // Initialize chat widget
    function init() {
        // Initialize elements
        $chatWidget = $('#wp-chat-widget');
        
        if (!$chatWidget.length) {
            return;
        }
        
        $chatToggle = $('#wp-chat-toggle');
        $chatContainer = $('#wp-chat-container');
        
        // Initialize the chat content container
        if ($chatContainer.find('.wp-chat-content').length) {
            // Show user info form initially
            $chatContainer.find('.wp-chat-content').html(`
                <div id="wp-chat-messages" class="wp-chat-messages"></div>
                <div id="wp-chat-typing-indicator" class="wp-chat-typing-indicator"></div>
            `);
        }
        
        $chatMessages = $('#wp-chat-messages');
        $chatInput = $('#wp-chat-input');
        $chatHeader = $('#wp-chat-header');
        $chatForm = $('#wp-chat-form');
        $userInfoForm = $('#wp-chat-user-info-form');
        $typingIndicator = $('#wp-chat-typing-indicator');
        $fileUpload = $('#wp-chat-file-upload');
        
        // Set primary color
        setChatColors();
        
        // Apply widget position
        applyWidgetPosition();
        
        // Check if we're within working hours
        checkWorkingHours();
        
        // Initialize visitor ID if available
        if (wp_chat_config.visitor_id) {
            chatState.visitorId = wp_chat_config.visitor_id;
        }
        
        // Initialize user ID if logged in
        if (wp_chat_config.current_user.is_logged_in) {
            chatState.userId = wp_chat_config.current_user.user_id;
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Show user info form initially
        showUserInfoForm();
        
        // Check for existing session in localStorage
        checkExistingSession();
    }

    // Set chat colors based on settings
    function setChatColors() {
        const primaryColor = wp_chat_config.primary_color;
        
        // Apply custom styles
        const customStyles = `
            .wp-chat-toggle, .wp-chat-header {
                background-color: ${primaryColor};
            }
            .wp-chat-send-btn {
                background-color: ${primaryColor};
            }
            .wp-chat-message.admin {
                background-color: ${primaryColor}22; /* 22 is hex for 13% opacity */
                border-left: 3px solid ${primaryColor};
            }
            .wp-chat-user-info-submit {
                background-color: ${primaryColor};
            }
            .wp-chat-file-btn {
                color: ${primaryColor};
            }
            .wp-chat-status-indicator.online {
                background-color: #4CAF50;
            }
            .wp-chat-status-indicator.offline {
                background-color: #F44336;
            }
            .wp-chat-status-indicator.away {
                background-color: #FF9800;
            }
        `;
        
        // Add custom styles to head
        $('head').append(`<style>${customStyles}</style>`);
    }

    // Apply widget position class
    function applyWidgetPosition() {
        const position = wp_chat_config.widget_position;
        $chatWidget.addClass(`wp-chat-${position}`);
    }

    // Check if we're within working hours
    function checkWorkingHours() {
        chatState.isWithinHours = wp_chat_config.is_within_hours === '1' || 
                                  wp_chat_config.is_within_hours === true;
        
        if (wp_chat_config.working_hours_enable === '1' && !chatState.isWithinHours) {
            // Show offline message
            showOfflineMessage();
        }
    }

    // Show offline message when outside working hours
    function showOfflineMessage() {
        $chatMessages.html(`
            <div class="wp-chat-offline-message">
                <div class="wp-chat-offline-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 2L2 22"></path>
                        <path d="M16 16v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h2"></path>
                        <path d="M22 8a10 10 0 0 1-5 8.5"></path>
                        <path d="M20 11a7 7 0 0 1-3 5.5"></path>
                        <path d="M18 14a4 4 0 0 1-1 2.5"></path>
                    </svg>
                </div>
                <p>${wp_chat_config.offline_message}</p>
                <button id="wp-chat-offline-form-toggle" class="wp-chat-offline-form-toggle">Leave a message</button>
            </div>
        `);
        
        // Show offline form when button is clicked
        $('#wp-chat-offline-form-toggle').on('click', function() {
            showUserInfoForm(true);
        });
    }

    // Set up event listeners
    function setupEventListeners() {
        // Toggle chat window
        $chatToggle.on('click', toggleChat);
        
        // Close chat window
        $('#wp-chat-close').on('click', closeChat);
        
        // Submit chat message
        $chatForm.on('submit', sendMessage);
        
        // User info form submission
        $userInfoForm.on('submit', submitUserInfo);
        
        // Typing indicator
        $chatInput.on('input', handleTyping);
        
        // File upload
        $('#wp-chat-file-btn').on('click', function() {
            $('#wp-chat-file-input').click();
        });
        
        $('#wp-chat-file-input').on('change', handleFileUpload);
    }

    // Check for existing session
    function checkExistingSession() {
        const sessionId = localStorage.getItem('wp_chat_session_id');
        const userId = localStorage.getItem('wp_chat_user_id');
        const visitorId = localStorage.getItem('wp_chat_visitor_id');
        
        if (sessionId) {
            chatState.sessionId = parseInt(sessionId);
            
            if (userId) {
                chatState.userId = parseInt(userId);
            }
            
            if (visitorId) {
                chatState.visitorId = parseInt(visitorId);
            }
            
            // Load existing chat
            loadExistingChat();
        }
    }

    // Load existing chat
    function loadExistingChat() {
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'GET',
            data: {
                action: 'wp_chat_get_session',
                security: wp_chat_config.nonce,
                session_id: chatState.sessionId
            },
            success: function(response) {
                if (response.success) {
                    // Load messages
                    getMessages();
                    
                    // Start polling for new messages
                    startPolling();
                } else {
                    // Clear invalid session
                    clearChatSession();
                }
            },
            error: function() {
                // Clear invalid session
                clearChatSession();
            }
        });
    }

    // Toggle chat window
    function toggleChat() {
        if (chatState.isOpen) {
            closeChat();
        } else {
            openChat();
        }
    }

    // Open chat window
    function openChat() {
        $chatToggle.hide();
        $chatContainer.fadeIn(300);
        chatState.isOpen = true;
        
        // If we don't have a session yet, show user info form
        if (!chatState.sessionId) {
            showUserInfoForm();
        } else {
            // Otherwise just focus the input
            $chatInput.focus();
            
            // Start polling for new messages
            startPolling();
        }
    }

    // Close chat window
    function closeChat() {
        $chatContainer.fadeOut(300);
        $chatToggle.fadeIn(300);
        chatState.isOpen = false;
        
        // Stop polling when chat is closed
        stopPolling();
    }

    // Show user info form
    function showUserInfoForm(isOffline = false) {
        // Prepare the form
        let formHtml = `
            <div class="wp-chat-user-info">
                <h3>${isOffline ? 'Leave a message' : 'Start Chat'}</h3>
                <form id="wp-chat-user-info-form" class="wp-chat-user-info-form">
                    <div class="wp-chat-form-group">
                        <label for="wp-chat-full-name">Full Name *</label>
                        <input type="text" id="wp-chat-full-name" name="full_name" required 
                            value="${wp_chat_config.current_user.is_logged_in ? wp_chat_config.current_user.display_name : ''}">
                    </div>
                    <div class="wp-chat-form-group">
                        <label for="wp-chat-email">Email Address *</label>
                        <input type="email" id="wp-chat-email" name="email" required
                            value="${wp_chat_config.current_user.is_logged_in ? wp_chat_config.current_user.email : ''}">
                    </div>
                    <div class="wp-chat-form-group">
                        <label for="wp-chat-phone">Phone Number</label>
                        <input type="tel" id="wp-chat-phone" name="phone_number">
                    </div>
                    ${isOffline ? `
                    <div class="wp-chat-form-group">
                        <label for="wp-chat-message">Message *</label>
                        <textarea id="wp-chat-message" name="message" required></textarea>
                    </div>
                    ` : ''}
                    <button type="submit" class="wp-chat-user-info-submit">
                        ${isOffline ? 'Send Message' : 'Start Chat'}
                    </button>
                </form>
            </div>
        `;
        
        // Display the form
        $chatMessages.html(formHtml);
        
        // Update references
        $userInfoForm = $('#wp-chat-user-info-form');
        
        // Set up form submission
        $userInfoForm.off('submit').on('submit', function(e) {
            e.preventDefault();
            submitUserInfo(e, isOffline);
        });
    }

    // Submit user info form
    function submitUserInfo(e, isOffline = false) {
        e.preventDefault();
        
        const formData = {
            full_name: $('#wp-chat-full-name').val(),
            email: $('#wp-chat-email').val(),
            phone_number: $('#wp-chat-phone').val() || ''
        };
        
        // Validate form
        if (!formData.full_name || !formData.email) {
            showError('Please fill in all required fields.');
            return;
        }
        
        // If offline, handle as an offline message
        if (isOffline) {
            submitOfflineMessage(formData);
            return;
        }
        
        // Create new chat session
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_start_session',
                security: wp_chat_config.nonce,
                email: formData.email,
                full_name: formData.full_name,
                phone_number: formData.phone_number
            },
            success: function(response) {
                if (response.success) {
                    // Save session info
                    chatState.sessionId = response.data.session_id;
                    
                    if (response.data.user_id) {
                        chatState.userId = response.data.user_id;
                    } else if (response.data.visitor_id) {
                        chatState.visitorId = response.data.visitor_id;
                    }
                    
                    // Save to localStorage
                    localStorage.setItem('wp_chat_session_id', chatState.sessionId);
                    
                    if (chatState.userId) {
                        localStorage.setItem('wp_chat_user_id', chatState.userId);
                    }
                    
                    if (chatState.visitorId) {
                        localStorage.setItem('wp_chat_visitor_id', chatState.visitorId);
                    }
                    
                    // Show chat interface
                    showChatInterface();
                    
                    // Get messages
                    getMessages();
                    
                    // Start polling for new messages
                    startPolling();
                } else {
                    showError(response.data.message || 'Failed to start chat session.');
                }
            },
            error: function() {
                showError('An error occurred. Please try again.');
            }
        });
    }

    // Submit offline message
    function submitOfflineMessage(formData) {
        const message = $('#wp-chat-message').val();
        
        if (!message) {
            showError('Please enter a message.');
            return;
        }
        
        // Create session with offline flag
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_start_session',
                security: wp_chat_config.nonce,
                email: formData.email,
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                is_offline: true
            },
            success: function(response) {
                if (response.success) {
                    // Save the new session
                    const sessionId = response.data.session_id;
                    
                    // Send the offline message
                    $.ajax({
                        url: wp_chat_config.ajax_url,
                        type: 'POST',
                        data: {
                            action: 'wp_chat_send_message',
                            security: wp_chat_config.nonce,
                            session_id: sessionId,
                            message: message,
                            sender_type: 'user',
                            visitor_id: response.data.visitor_id
                        },
                        success: function() {
                            // Show success message
                            $chatMessages.html(`
                                <div class="wp-chat-success-message">
                                    <div class="wp-chat-success-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                    </div>
                                    <h3>Message Sent!</h3>
                                    <p>Thank you for your message. We'll get back to you as soon as possible.</p>
                                </div>
                            `);
                        },
                        error: function() {
                            showError('Failed to send message. Please try again.');
                        }
                    });
                } else {
                    showError(response.data.message || 'Failed to send message.');
                }
            },
            error: function() {
                showError('An error occurred. Please try again.');
            }
        });
    }

    // Show chat interface
    function showChatInterface() {
        // Create chat interface
        const chatHtml = `
            <div class="wp-chat-messages-container">
                <div id="wp-chat-messages" class="wp-chat-messages"></div>
                <div id="wp-chat-typing-indicator" class="wp-chat-typing-indicator"></div>
            </div>
            <form id="wp-chat-form" class="wp-chat-form">
                <div class="wp-chat-file-upload">
                    <button type="button" id="wp-chat-file-btn" class="wp-chat-file-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                    </button>
                    <input id="wp-chat-file-input" type="file" class="wp-chat-file-input" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png">
                </div>
                <input type="text" id="wp-chat-input" class="wp-chat-input" placeholder="Type your message...">
                <button type="submit" class="wp-chat-send-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>
        `;
        
        $chatContainer.find('.wp-chat-content').html(chatHtml);
        
        // Update references
        $chatMessages = $('#wp-chat-messages');
        $chatInput = $('#wp-chat-input');
        $chatForm = $('#wp-chat-form');
        $typingIndicator = $('#wp-chat-typing-indicator');
        
        // Set up event listeners
        $chatForm.on('submit', sendMessage);
        $chatInput.on('input', handleTyping);
        
        // File upload
        $('#wp-chat-file-btn').on('click', function() {
            $('#wp-chat-file-input').click();
        });
        
        $('#wp-chat-file-input').on('change', handleFileUpload);
    }

    // Send chat message
    function sendMessage(e) {
        e.preventDefault();
        
        const message = $chatInput.val().trim();
        
        if (!message || !chatState.sessionId) {
            return;
        }
        
        // Clear input
        $chatInput.val('');
        
        // Add message to UI immediately
        const tempId = 'temp-' + Date.now();
        addMessageToUI({
            id: tempId,
            sender_type: 'user',
            sender_name: 'You',
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Send message to server
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_send_message',
                security: wp_chat_config.nonce,
                session_id: chatState.sessionId,
                message: message,
                sender_type: 'user',
                visitor_id: chatState.visitorId
            },
            success: function(response) {
                if (response.success) {
                    // Update the temporary message with correct ID
                    $('#' + tempId).attr('id', 'message-' + response.data.message_id);
                    
                    // Update status (not typing)
                    updateTypingStatus(false);
                } else {
                    showError(response.data.message || 'Failed to send message.');
                    $('#' + tempId).addClass('wp-chat-message-error');
                }
            },
            error: function() {
                showError('An error occurred. Please try again.');
                $('#' + tempId).addClass('wp-chat-message-error');
            }
        });
    }

    // Handle file upload
    function handleFileUpload(e) {
        const files = e.target.files;
        
        if (!files.length || !chatState.sessionId) {
            return;
        }
        
        const file = files[0];
        
        // Check file size
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
            showError('File is too large. Maximum size is 20MB.');
            return;
        }
        
        // Check file type
        const allowedTypes = [
            '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', 
            '.jpg', '.jpeg', '.png'
        ];
        
        let fileExtension = file.name.split('.').pop().toLowerCase();
        
        // Add period to extension
        fileExtension = '.' + fileExtension;
        
        if (!allowedTypes.includes(fileExtension)) {
            showError('File type not allowed. Allowed types: ' + allowedTypes.join(', '));
            return;
        }
        
        // Show uploading indicator
        const tempId = 'temp-' + Date.now();
        addMessageToUI({
            id: tempId,
            sender_type: 'user',
            sender_name: 'You',
            message: 'Uploading file: ' + file.name,
            timestamp: new Date().toISOString()
        });
        
        $('#' + tempId).addClass('wp-chat-message-uploading');
        
        // Create FormData
        const formData = new FormData();
        formData.append('action', 'wp_chat_upload_file');
        formData.append('security', wp_chat_config.nonce);
        formData.append('session_id', chatState.sessionId);
        formData.append('sender_type', 'user');
        formData.append('visitor_id', chatState.visitorId);
        formData.append('file', file);
        
        // Upload file
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    // Replace uploading message with file message
                    $('#' + tempId).replaceWith(createFileMessageHtml({
                        id: response.data.message_id,
                        sender_type: 'user',
                        sender_name: 'You',
                        message: 'Shared a file: ' + file.name,
                        timestamp: response.data.timestamp,
                        is_file: true,
                        file: response.data.file
                    }));
                    
                    // Scroll to bottom
                    scrollToBottom();
                } else {
                    showError(response.data.message || 'Failed to upload file.');
                    $('#' + tempId).removeClass('wp-chat-message-uploading')
                        .addClass('wp-chat-message-error');
                }
            },
            error: function() {
                showError('An error occurred. Please try again.');
                $('#' + tempId).removeClass('wp-chat-message-uploading')
                    .addClass('wp-chat-message-error');
            }
        });
        
        // Clear the file input
        $('#wp-chat-file-input').val('');
    }

    // Get messages for the current session
    function getMessages() {
        if (!chatState.sessionId) {
            return;
        }
        
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'GET',
            data: {
                action: 'wp_chat_get_messages',
                security: wp_chat_config.nonce,
                session_id: chatState.sessionId
            },
            success: function(response) {
                if (response.success) {
                    displayMessages(response.data.messages);
                    updateTypingUsers(response.data.typing_users);
                } else {
                    showError(response.data.message || 'Failed to load messages.');
                }
            },
            error: function() {
                showError('An error occurred. Please try again.');
            }
        });
    }

    // Display messages in the chat window
    function displayMessages(messages) {
        if (!messages || !messages.length) {
            return;
        }
        
        let html = '';
        let hasNewMessages = false;
        
        // Find the highest message ID
        let highestId = chatState.lastMessageId;
        
        messages.forEach(function(message) {
            // Skip messages we already have
            if (message.id && parseInt(message.id) <= chatState.lastMessageId) {
                return;
            }
            
            hasNewMessages = true;
            
            if (message.id && parseInt(message.id) > highestId) {
                highestId = parseInt(message.id);
            }
            
            if (message.is_file) {
                html += createFileMessageHtml(message);
            } else {
                html += createMessageHtml(message);
            }
        });
        
        // Update last message ID
        chatState.lastMessageId = highestId;
        
        if (hasNewMessages) {
            // If chat is empty, replace content
            if ($chatMessages.children().length === 0) {
                $chatMessages.html(html);
            } else {
                // Otherwise append new messages
                $chatMessages.append(html);
            }
            
            // Show notification if chat is closed
            if (!chatState.isOpen) {
                showNotification('New message', 'You have a new chat message.');
            }
            
            // Play sound for new messages
            playMessageSound();
            
            // Scroll to bottom
            scrollToBottom();
        }
    }

    // Create HTML for a regular message
    function createMessageHtml(message) {
        const messageClass = `wp-chat-message ${message.sender_type}`;
        const messageId = message.id ? `id="message-${message.id}"` : '';
        const timestamp = formatTimestamp(message.timestamp);
        
        // Add user status indicator if enabled
        let statusIndicator = '';
        if (wp_chat_config.user_status_indicators === '1' && message.sender_type === 'admin') {
            statusIndicator = `
                <span class="wp-chat-status-indicator online" 
                      data-user-id="${message.sender_id || ''}">
                </span>
            `;
        }
        
        return `
            <div class="${messageClass}" ${messageId}>
                <div class="wp-chat-message-header">
                    <span class="wp-chat-message-sender">
                        ${statusIndicator}
                        ${message.sender_name}
                    </span>
                    <span class="wp-chat-message-time">${timestamp}</span>
                </div>
                <div class="wp-chat-message-body">${message.message}</div>
            </div>
        `;
    }

    // Create HTML for a file message
    function createFileMessageHtml(message) {
        const messageClass = `wp-chat-message ${message.sender_type}`;
        const messageId = message.id ? `id="message-${message.id}"` : '';
        const timestamp = formatTimestamp(message.timestamp);
        
        // Add user status indicator if enabled
        let statusIndicator = '';
        if (wp_chat_config.user_status_indicators === '1' && message.sender_type === 'admin') {
            statusIndicator = `
                <span class="wp-chat-status-indicator online" 
                      data-user-id="${message.sender_id || ''}">
                </span>
            `;
        }
        
        let filePreview = '';
        
        if (message.file) {
            const fileType = message.file.type || '';
            const fileExt = message.file.name.split('.').pop().toLowerCase();
            
            if (fileType.startsWith('image/') || fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png') {
                // Image preview
                filePreview = `
                    <div class="wp-chat-file-preview">
                        <a href="${message.file.path}" target="_blank" rel="noopener noreferrer">
                            <img src="${message.file.path}" alt="${message.file.name}">
                        </a>
                    </div>
                `;
            } else {
                // Generic file icon
                filePreview = `
                    <div class="wp-chat-file-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                `;
            }
            
            // Add file info and download link
            filePreview += `
                <div class="wp-chat-file-info">
                    <span class="wp-chat-file-name">${message.file.name}</span>
                    <a href="${message.file.path}" class="wp-chat-file-download" download="${message.file.name}">
                        Download
                    </a>
                </div>
            `;
        }
        
        return `
            <div class="${messageClass}" ${messageId}>
                <div class="wp-chat-message-header">
                    <span class="wp-chat-message-sender">
                        ${statusIndicator}
                        ${message.sender_name}
                    </span>
                    <span class="wp-chat-message-time">${timestamp}</span>
                </div>
                <div class="wp-chat-message-body">
                    <div class="wp-chat-file-message">
                        ${filePreview}
                    </div>
                </div>
            </div>
        `;
    }

    // Add a message to the UI
    function addMessageToUI(message) {
        let messageHtml;
        
        if (message.is_file) {
            messageHtml = createFileMessageHtml(message);
        } else {
            messageHtml = createMessageHtml(message);
        }
        
        $chatMessages.append(messageHtml);
        scrollToBottom();
    }

    // Format timestamp for display
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }

    // Scroll chat to bottom
    function scrollToBottom() {
        $chatMessages.scrollTop($chatMessages[0].scrollHeight);
    }

    // Start polling for new messages
    function startPolling() {
        if (chatState.pollingInterval) {
            clearInterval(chatState.pollingInterval);
        }
        
        // Get messages immediately
        getMessages();
        
        // Set up polling
        chatState.pollingInterval = setInterval(function() {
            getMessages();
        }, wp_chat_config.polling_interval || 3000);
        
        // Start user status polling if enabled
        if (wp_chat_config.user_status_indicators === '1') {
            startStatusPolling();
        }
    }

    // Stop polling for new messages
    function stopPolling() {
        if (chatState.pollingInterval) {
            clearInterval(chatState.pollingInterval);
            chatState.pollingInterval = null;
        }
        
        // Stop status polling
        if (chatState.statusInterval) {
            clearInterval(chatState.statusInterval);
            chatState.statusInterval = null;
        }
    }

    // Start polling for user status
    function startStatusPolling() {
        if (chatState.statusInterval) {
            clearInterval(chatState.statusInterval);
        }
        
        // Update status indicators immediately
        updateStatusIndicators();
        
        // Set up polling
        chatState.statusInterval = setInterval(function() {
            updateStatusIndicators();
        }, 10000); // Every 10 seconds
    }

    // Update user status indicators
    function updateStatusIndicators() {
        $('.wp-chat-status-indicator').each(function() {
            const $indicator = $(this);
            const userId = $indicator.data('user-id');
            
            if (!userId) return;
            
            $.ajax({
                url: wp_chat_config.ajax_url,
                type: 'GET',
                data: {
                    action: 'wp_chat_get_user_status',
                    security: wp_chat_config.nonce,
                    user_id: userId
                },
                success: function(response) {
                    if (response.success) {
                        const isOnline = response.data.is_online;
                        
                        // Update indicator class
                        $indicator.removeClass('online offline away');
                        $indicator.addClass(isOnline ? 'online' : 'offline');
                        
                        // Update tooltip
                        $indicator.attr('title', isOnline ? 'Online' : 'Offline');
                    }
                }
            });
        });
    }

    // Handle typing events
    function handleTyping() {
        if (!chatState.sessionId) return;
        
        // User is typing
        if (!chatState.isTyping) {
            chatState.isTyping = true;
            updateTypingStatus(true);
        }
        
        // Clear previous timeout
        if (chatState.typingTimeout) {
            clearTimeout(chatState.typingTimeout);
        }
        
        // Set timeout to detect when user stops typing
        chatState.typingTimeout = setTimeout(function() {
            chatState.isTyping = false;
            updateTypingStatus(false);
        }, 2000);
    }

    // Update typing status
    function updateTypingStatus(isTyping) {
        $.ajax({
            url: wp_chat_config.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_typing_status',
                security: wp_chat_config.nonce,
                session_id: chatState.sessionId,
                is_typing: isTyping,
                visitor_id: chatState.visitorId
            },
            success: function(response) {
                if (response.success) {
                    updateTypingUsers(response.data.typing_users);
                }
            }
        });
    }

    // Update typing users indicator
    function updateTypingUsers(typingUsers) {
        if (!typingUsers || !typingUsers.length) {
            $typingIndicator.empty();
            return;
        }
        
        // Show typing indicator
        let names = typingUsers.map(function(user) {
            return user.name;
        }).join(', ');
        
        $typingIndicator.html(`
            <div class="wp-chat-typing">
                <span class="wp-chat-typing-animation">
                    <span class="wp-chat-typing-dot"></span>
                    <span class="wp-chat-typing-dot"></span>
                    <span class="wp-chat-typing-dot"></span>
                </span>
                <span class="wp-chat-typing-text">
                    ${names} ${typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
            </div>
        `);
    }

    // Play sound for new messages
    function playMessageSound() {
        // Create audio element if it doesn't exist
        if (!window.wpChatAudio) {
            window.wpChatAudio = new Audio(wp_chat_config.plugin_url + '/public/sounds/message.mp3');
        }
        
        // Play sound
        window.wpChatAudio.play().catch(function(error) {
            // Browsers may block autoplay
            console.log('Could not play notification sound:', error);
        });
    }

    // Show browser notification for new messages
    function showNotification(title, message) {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            return;
        }
        
        // Check if permission is granted
        if (Notification.permission === 'granted') {
            createNotification(title, message);
        } else if (Notification.permission !== 'denied') {
            // Request permission
            Notification.requestPermission().then(function(permission) {
                if (permission === 'granted') {
                    createNotification(title, message);
                }
            });
        }
    }

    // Create browser notification
    function createNotification(title, message) {
        const notification = new Notification(title, {
            body: message,
            icon: wp_chat_config.plugin_url + '/public/images/chat-icon.png'
        });
        
        // Open chat when notification is clicked
        notification.onclick = function() {
            window.focus();
            openChat();
            notification.close();
        };
        
        // Auto close after 5 seconds
        setTimeout(function() {
            notification.close();
        }, 5000);
    }

    // Show error message
    function showError(message) {
        const $error = $('<div class="wp-chat-error"></div>').text(message);
        
        $chatContainer.append($error);
        
        setTimeout(function() {
            $error.fadeOut(300, function() {
                $(this).remove();
            });
        }, 3000);
    }

    // Clear chat session data
    function clearChatSession() {
        localStorage.removeItem('wp_chat_session_id');
        localStorage.removeItem('wp_chat_user_id');
        localStorage.removeItem('wp_chat_visitor_id');
        
        chatState.sessionId = null;
        chatState.userId = null;
        chatState.visitorId = null;
        
        // Show user info form
        showUserInfoForm();
    }

    // Initialize on document ready
    $(document).ready(init);

})(jQuery);