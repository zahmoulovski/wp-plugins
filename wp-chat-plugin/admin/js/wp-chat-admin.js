/**
 * WP Chat Plugin - Admin JavaScript
 */
(function($) {
    'use strict';

    // Initialize admin functionality
    function init() {
        initTabs();
        initColorPicker();
        initWorkingHours();
        initSessionTable();
        initLiveChat();
    }

    // Initialize tabs
    function initTabs() {
        $('.wp-chat-admin-tabs .nav-tab').on('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all tabs
            $('.wp-chat-admin-tabs .nav-tab').removeClass('nav-tab-active');
            $('.wp-chat-tab-pane').removeClass('active');
            
            // Add active class to clicked tab
            $(this).addClass('nav-tab-active');
            
            // Show the corresponding tab content
            const tabId = $(this).attr('href');
            $(tabId).addClass('active');
        });
    }

    // Initialize color picker
    function initColorPicker() {
        if ($.fn.wpColorPicker) {
            $('.wp-chat-color-picker').wpColorPicker();
        }
    }

    // Initialize working hours functionality
    function initWorkingHours() {
        $('.wp-chat-day-closed').on('change', function() {
            const $timeInputs = $(this).closest('.wp-chat-day-hours').find('.wp-chat-time-inputs');
            
            if ($(this).is(':checked')) {
                $timeInputs.hide();
            } else {
                $timeInputs.show();
            }
        });
    }

    // Initialize session table
    function initSessionTable() {
        // Handle status change
        $('.wp-chat-status-select').on('change', function() {
            const sessionId = $(this).data('session-id');
            const newStatus = $(this).val();
            
            updateSessionStatus(sessionId, newStatus);
        });
        
        // Handle admin assignment
        $('.wp-chat-assign-select').on('change', function() {
            const sessionId = $(this).data('session-id');
            const adminId = $(this).val();
            
            assignSessionToAdmin(sessionId, adminId);
        });
        
        // Handle session view/join
        $('.wp-chat-view-session').on('click', function(e) {
            e.preventDefault();
            
            const sessionId = $(this).data('session-id');
            openChatDetail(sessionId);
        });
    }

    // Update session status
    function updateSessionStatus(sessionId, status) {
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_update_session_status',
                security: wp_chat_admin.nonce,
                session_id: sessionId,
                status: status
            },
            success: function(response) {
                if (response.success) {
                    // Show success notification
                    showNotification('Status updated successfully', 'success');
                } else {
                    // Show error notification
                    showNotification(response.data.message || 'Failed to update status', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Assign session to admin
    function assignSessionToAdmin(sessionId, adminId) {
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_assign_session',
                security: wp_chat_admin.nonce,
                session_id: sessionId,
                admin_id: adminId
            },
            success: function(response) {
                if (response.success) {
                    // Show success notification
                    showNotification('Session assigned successfully', 'success');
                } else {
                    // Show error notification
                    showNotification(response.data.message || 'Failed to assign session', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Open chat detail
    function openChatDetail(sessionId) {
        // If chat detail container doesn't exist, create it
        if (!$('#wp-chat-detail-container').length) {
            $('body').append('<div id="wp-chat-detail-container" class="wp-chat-detail-container"></div>');
        }
        
        // Load chat detail content
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'GET',
            data: {
                action: 'wp_chat_get_session',
                security: wp_chat_admin.nonce,
                session_id: sessionId
            },
            success: function(response) {
                if (response.success) {
                    const session = response.data.session;
                    renderChatDetail(session);
                    
                    // Get messages
                    getSessionMessages(sessionId);
                    
                    // Start polling for new messages
                    startMessagesPolling(sessionId);
                } else {
                    showNotification(response.data.message || 'Failed to load chat session', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Render chat detail
    function renderChatDetail(session) {
        const $container = $('#wp-chat-detail-container');
        
        // Build HTML
        let html = `
            <div class="wp-chat-detail-header">
                <h2>Chat with ${session.full_name}</h2>
                <div class="wp-chat-detail-meta">
                    <div><strong>Email:</strong> ${session.email}</div>
                    ${session.phone_number ? `<div><strong>Phone:</strong> ${session.phone_number}</div>` : ''}
                    <div><strong>Status:</strong> ${session.status}</div>
                    <div><strong>Started:</strong> ${formatDateTime(session.started_at)}</div>
                    ${session.assigned_admin_name ? `<div><strong>Assigned to:</strong> ${session.assigned_admin_name}</div>` : ''}
                </div>
                <button class="wp-chat-detail-close">Close</button>
            </div>
            <div class="wp-chat-detail-messages"></div>
            <div class="wp-chat-detail-form">
                <form id="wp-chat-admin-reply-form">
                    <div class="wp-chat-detail-input-container">
                        <input type="file" id="wp-chat-admin-file" class="wp-chat-admin-file">
                        <div class="wp-chat-admin-actions">
                            <button type="button" class="wp-chat-admin-file-btn" title="Attach file">
                                <span class="dashicons dashicons-paperclip"></span>
                            </button>
                            <button type="button" class="wp-chat-admin-product-btn" title="Send product link">
                                <span class="dashicons dashicons-cart"></span>
                            </button>
                        </div>
                        <textarea id="wp-chat-admin-message" placeholder="Type your message..."></textarea>
                    </div>
                    <button type="submit" class="button button-primary">Send</button>
                </form>
            </div>
        `;
        
        // Product search modal
        html += `
            <div id="wp-chat-product-search-modal" class="wp-chat-product-search-modal">
                <div class="wp-chat-product-search-content">
                    <div class="wp-chat-product-search-header">
                        <h2>Search Products</h2>
                        <button class="wp-chat-product-search-close">×</button>
                    </div>
                    <div class="wp-chat-product-search-form">
                        <input type="text" id="wp-chat-product-search-input" placeholder="Search by name or SKU..." />
                        <button type="button" id="wp-chat-product-search-btn" class="button button-primary">Search</button>
                    </div>
                    <div id="wp-chat-product-results" class="wp-chat-product-results"></div>
                </div>
            </div>
        `;
        
        // Set HTML
        $container.html(html).show();
        
        // Set up event listeners
        $('.wp-chat-detail-close').on('click', closeChatDetail);
        $('#wp-chat-admin-reply-form').on('submit', function(e) {
            e.preventDefault();
            sendAdminMessage(session.id);
        });
        
        $('.wp-chat-admin-file-btn').on('click', function() {
            $('#wp-chat-admin-file').click();
        });
        
        $('#wp-chat-admin-file').on('change', function() {
            if (this.files.length) {
                uploadAdminFile(session.id, this.files[0]);
            }
        });
        
        // Product search
        $('.wp-chat-admin-product-btn').on('click', function() {
            openProductSearch(session.id);
        });
        
        $('.wp-chat-product-search-close').on('click', closeProductSearch);
        
        $('#wp-chat-product-search-btn').on('click', function() {
            searchProducts(session.id);
        });
        
        $('#wp-chat-product-search-input').on('keypress', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                searchProducts(session.id);
            }
        });
    }

    // Get session messages
    function getSessionMessages(sessionId) {
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'GET',
            data: {
                action: 'wp_chat_get_messages',
                security: wp_chat_admin.nonce,
                session_id: sessionId
            },
            success: function(response) {
                if (response.success) {
                    displayMessages(response.data.messages);
                } else {
                    showNotification(response.data.message || 'Failed to load messages', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Display messages
    function displayMessages(messages) {
        const $messagesContainer = $('.wp-chat-detail-messages');
        
        // Clear existing messages
        $messagesContainer.empty();
        
        // Build HTML for messages
        let html = '';
        
        messages.forEach(function(message) {
            html += createMessageHtml(message);
        });
        
        // Add messages to container
        $messagesContainer.html(html);
        
        // Scroll to bottom
        $messagesContainer.scrollTop($messagesContainer[0].scrollHeight);
    }

    // Create HTML for a message
    function createMessageHtml(message) {
        const messageClass = `wp-chat-detail-message ${message.sender_type}`;
        const timestamp = formatTime(message.timestamp);
        
        let contentHtml = '';
        
        if (message.is_file) {
            // File message
            const fileExt = message.file.name.split('.').pop().toLowerCase();
            const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(fileExt);
            
            if (isImage) {
                contentHtml = `
                    <div class="wp-chat-detail-file-preview">
                        <a href="${message.file.path}" target="_blank">
                            <img src="${message.file.path}" alt="${message.file.name}">
                        </a>
                    </div>
                `;
            } else {
                contentHtml = `
                    <div class="wp-chat-detail-file">
                        <span class="dashicons dashicons-media-document"></span>
                        <a href="${message.file.path}" target="_blank" download="${message.file.name}">
                            ${message.file.name}
                        </a>
                    </div>
                `;
            }
        } else {
            // Text message
            contentHtml = `<div class="wp-chat-detail-message-content">${message.message}</div>`;
        }
        
        return `
            <div class="${messageClass}">
                <div class="wp-chat-detail-message-header">
                    <span class="wp-chat-detail-message-sender">${message.sender_name}</span>
                    <span class="wp-chat-detail-message-time">${timestamp}</span>
                </div>
                ${contentHtml}
            </div>
        `;
    }

    // Send admin message
    function sendAdminMessage(sessionId) {
        const message = $('#wp-chat-admin-message').val().trim();
        
        if (!message) {
            return;
        }
        
        // Clear input
        $('#wp-chat-admin-message').val('');
        
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_send_message',
                security: wp_chat_admin.nonce,
                session_id: sessionId,
                message: message,
                sender_type: 'admin'
            },
            success: function(response) {
                if (response.success) {
                    // Message sent, refresh messages
                    getSessionMessages(sessionId);
                } else {
                    showNotification(response.data.message || 'Failed to send message', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Upload admin file
    function uploadAdminFile(sessionId, file) {
        // Create FormData
        const formData = new FormData();
        formData.append('action', 'wp_chat_upload_file');
        formData.append('security', wp_chat_admin.nonce);
        formData.append('session_id', sessionId);
        formData.append('sender_type', 'admin');
        formData.append('file', file);
        
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    // File uploaded, refresh messages
                    getSessionMessages(sessionId);
                    
                    // Clear file input
                    $('#wp-chat-admin-file').val('');
                } else {
                    showNotification(response.data.message || 'Failed to upload file', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Start polling for new messages
    let messagesPollingInterval;
    
    function startMessagesPolling(sessionId) {
        // Clear existing interval
        if (messagesPollingInterval) {
            clearInterval(messagesPollingInterval);
        }
        
        // Set new interval
        messagesPollingInterval = setInterval(function() {
            if ($('#wp-chat-detail-container').is(':visible')) {
                getSessionMessages(sessionId);
            } else {
                // Stop polling if chat detail is closed
                clearInterval(messagesPollingInterval);
            }
        }, wp_chat_admin.polling_interval || 5000);
    }

    // Close chat detail
    function closeChatDetail() {
        $('#wp-chat-detail-container').hide();
        
        // Stop polling
        if (messagesPollingInterval) {
            clearInterval(messagesPollingInterval);
        }
    }

    // Initialize live chat dashboard
    function initLiveChat() {
        // Poll for new sessions on the dashboard
        if ($('.wp-chat-dashboard').length) {
            setInterval(function() {
                refreshDashboard();
            }, 30000); // Every 30 seconds
        }
    }

    // Refresh dashboard
    function refreshDashboard() {
        const $pendingContainer = $('.wp-chat-pending-sessions');
        const $activeContainer = $('.wp-chat-active-sessions');
        
        if ($pendingContainer.length) {
            $.ajax({
                url: wp_chat_admin.ajax_url,
                type: 'GET',
                data: {
                    action: 'wp_chat_get_all_sessions',
                    security: wp_chat_admin.nonce,
                    status: 'pending'
                },
                success: function(response) {
                    if (response.success && response.data.sessions.length) {
                        updateDashboardSection($pendingContainer, response.data.sessions, 'pending');
                    }
                }
            });
        }
        
        if ($activeContainer.length) {
            $.ajax({
                url: wp_chat_admin.ajax_url,
                type: 'GET',
                data: {
                    action: 'wp_chat_get_all_sessions',
                    security: wp_chat_admin.nonce,
                    status: 'active'
                },
                success: function(response) {
                    if (response.success && response.data.sessions.length) {
                        updateDashboardSection($activeContainer, response.data.sessions, 'active');
                    }
                }
            });
        }
    }

    // Update dashboard section
    function updateDashboardSection($container, sessions, status) {
        // Get existing session IDs
        const existingIds = [];
        $container.find('[data-session-id]').each(function() {
            existingIds.push($(this).data('session-id'));
        });
        
        // Find new sessions
        const newSessions = sessions.filter(function(session) {
            return !existingIds.includes(session.id);
        });
        
        // Add new sessions
        if (newSessions.length) {
            let html = '';
            
            newSessions.forEach(function(session) {
                html += createSessionItemHtml(session, status);
            });
            
            // Prepend new sessions
            $container.prepend(html);
            
            // Initialize new session items
            initSessionTable();
            
            // Show notification for new pending sessions
            if (status === 'pending') {
                const count = newSessions.length;
                showNotification(
                    `${count} new pending session${count > 1 ? 's' : ''}`,
                    'info'
                );
                
                // Play notification sound
                playNotificationSound();
            }
        }
    }

    // Create session item HTML
    function createSessionItemHtml(session, status) {
        const lastActivity = formatDateTime(session.updated_at);
        const onlineStatus = session.is_online ? 
            '<span class="wp-chat-status online" title="Online">●</span>' : 
            '<span class="wp-chat-status offline" title="Offline">●</span>';
        
        return `
            <div class="wp-chat-session-item" data-session-id="${session.id}">
                <div class="wp-chat-session-item-header">
                    <h3>${session.full_name} ${onlineStatus}</h3>
                    <span class="wp-chat-session-item-time">${lastActivity}</span>
                </div>
                <div class="wp-chat-session-item-body">
                    <div><strong>Email:</strong> ${session.email}</div>
                    ${session.phone_number ? `<div><strong>Phone:</strong> ${session.phone_number}</div>` : ''}
                    <div>
                        <a href="#" class="wp-chat-view-session button button-primary" data-session-id="${session.id}">
                            View Chat
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    // Show notification
    function showNotification(message, type = 'success') {
        // Check if jQuery UI is available
        if ($.fn.dialog) {
            // Create notification element if it doesn't exist
            if (!$('#wp-chat-notification').length) {
                $('body').append('<div id="wp-chat-notification"></div>');
            }
            
            // Set message and show dialog
            $('#wp-chat-notification')
                .html(message)
                .dialog({
                    title: type.charAt(0).toUpperCase() + type.slice(1),
                    dialogClass: `wp-chat-notification wp-chat-notification-${type}`,
                    buttons: [{
                        text: 'OK',
                        click: function() {
                            $(this).dialog('close');
                        }
                    }],
                    modal: false,
                    position: {
                        my: 'right bottom',
                        at: 'right bottom-20',
                        of: window
                    },
                    width: 'auto',
                    closeOnEscape: true,
                    autoOpen: true,
                    show: {
                        effect: 'fade',
                        duration: 300
                    },
                    hide: {
                        effect: 'fade',
                        duration: 300
                    }
                });
                
            // Auto-close after 3 seconds
            setTimeout(function() {
                if ($('#wp-chat-notification').dialog('isOpen')) {
                    $('#wp-chat-notification').dialog('close');
                }
            }, 3000);
        } else {
            // Fallback if jQuery UI is not available
            alert(message);
        }
    }

    // Play notification sound
    function playNotificationSound() {
        // Create audio element if it doesn't exist
        if (!window.wpChatAdminAudio) {
            window.wpChatAdminAudio = new Audio(wp_chat_admin.plugin_url + '/admin/sounds/notification.mp3');
        }
        
        // Play sound
        window.wpChatAdminAudio.play().catch(function(error) {
            // Browsers may block autoplay
            console.log('Could not play notification sound:', error);
        });
    }

    // Format date and time
    function formatDateTime(datetime) {
        const date = new Date(datetime);
        
        // Format date: DD/MM/YYYY
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        // Format time: HH:MM
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    // Format time only
    function formatTime(datetime) {
        const date = new Date(datetime);
        
        // Format time: HH:MM
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    }
    
    // Open product search modal
    function openProductSearch(sessionId) {
        const $modal = $('#wp-chat-product-search-modal');
        const $searchInput = $('#wp-chat-product-search-input');
        
        // Store session ID as data attribute
        $modal.data('session-id', sessionId);
        
        // Show modal
        $modal.css('display', 'flex');
        
        // Focus search input
        $searchInput.val('').focus();
    }
    
    // Close product search modal
    function closeProductSearch() {
        const $modal = $('#wp-chat-product-search-modal');
        const $results = $('#wp-chat-product-results');
        
        // Hide modal
        $modal.css('display', 'none');
        
        // Clear results
        $results.empty();
    }
    
    // Search products
    function searchProducts(sessionId) {
        const $searchInput = $('#wp-chat-product-search-input');
        const $results = $('#wp-chat-product-results');
        const searchTerm = $searchInput.val().trim();
        
        if (!searchTerm) {
            return;
        }
        
        // Show loading state
        $results.html('<div class="wp-chat-loading">Searching products...</div>');
        
        // Search products via AJAX
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'GET',
            data: {
                action: 'wp_chat_search_products',
                security: wp_chat_admin.nonce,
                search: searchTerm
            },
            success: function(response) {
                if (response.success) {
                    displayProductResults(response.data.products, sessionId);
                } else {
                    showNotification(response.data.message || 'Failed to search products', 'error');
                    $results.html('<div class="wp-chat-error-message">No products found.</div>');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
                $results.html('<div class="wp-chat-error-message">Error searching products.</div>');
            }
        });
    }
    
    // Display product search results
    function displayProductResults(products, sessionId) {
        const $results = $('#wp-chat-product-results');
        
        if (!products || !products.length) {
            $results.html('<div class="wp-chat-empty-message">No products found. Try a different search term.</div>');
            return;
        }
        
        // Build HTML for products
        let html = '';
        
        products.forEach(function(product) {
            const imageHtml = product.image ? 
                `<img src="${product.image}" alt="${product.title}">` :
                '<div class="wp-chat-product-no-image"><span class="dashicons dashicons-format-image"></span></div>';
            
            const skuHtml = product.sku ? 
                `<p class="wp-chat-product-sku">SKU: ${product.sku}</p>` : '';
                
            const priceHtml = product.price ? 
                `<p class="wp-chat-product-price">${product.price}</p>` : '';
            
            html += `
                <div class="wp-chat-product-item">
                    <div class="wp-chat-product-image">${imageHtml}</div>
                    <h3 class="wp-chat-product-title">${product.title}</h3>
                    ${skuHtml}
                    ${priceHtml}
                    <button type="button" class="wp-chat-product-select" 
                        data-product-id="${product.id}"
                        data-product-title="${product.title}"
                        data-product-url="${product.url}">
                        Send Link
                    </button>
                </div>
            `;
        });
        
        // Add products to results
        $results.html(html);
        
        // Set up event listener for product selection
        $('.wp-chat-product-select').on('click', function() {
            const productId = $(this).data('product-id');
            const productTitle = $(this).data('product-title');
            const productUrl = $(this).data('product-url');
            
            sendProductLink(sessionId, productId, productTitle, productUrl);
        });
    }
    
    // Send product link
    function sendProductLink(sessionId, productId, productTitle, productUrl) {
        $.ajax({
            url: wp_chat_admin.ajax_url,
            type: 'POST',
            data: {
                action: 'wp_chat_send_product_link',
                security: wp_chat_admin.nonce,
                session_id: sessionId,
                product_id: productId,
                product_title: productTitle,
                product_url: productUrl
            },
            success: function(response) {
                if (response.success) {
                    // Close product search modal
                    closeProductSearch();
                    
                    // Refresh messages
                    getSessionMessages(sessionId);
                } else {
                    showNotification(response.data.message || 'Failed to send product link', 'error');
                }
            },
            error: function() {
                showNotification('An error occurred. Please try again.', 'error');
            }
        });
    }

    // Initialize when document is ready
    $(document).ready(init);

})(jQuery);