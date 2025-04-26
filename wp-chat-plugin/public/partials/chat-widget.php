<?php
/**
 * Template for the chat widget
 */
?>
<div id="wp-chat-widget" class="wp-chat-widget <?php echo esc_attr($position_class); ?>">
    <button id="wp-chat-toggle" class="wp-chat-toggle" aria-label="Toggle chat">
        <span class="wp-chat-toggle-icon"></span>
    </button>
    
    <div id="wp-chat-container" class="wp-chat-container" style="display: none;">
        <div class="wp-chat-header">
            <span class="wp-chat-title"><?php echo esc_html(get_option('wp_chat_title', 'Chat Support')); ?></span>
            <button id="wp-chat-close" class="wp-chat-close" aria-label="Close chat">
                <span class="wp-chat-close-icon"></span>
            </button>
        </div>
        
        <div class="wp-chat-content">
            <div id="wp-chat-messages" class="wp-chat-messages"></div>
            <div id="wp-chat-typing-indicator" class="wp-chat-typing-indicator"></div>
            
            <form id="wp-chat-form" class="wp-chat-form">
                <div class="wp-chat-input-wrapper">
                    <?php if (get_option('wp_chat_enable_attachments', false)): ?>
                    <button type="button" id="wp-chat-file-btn" class="wp-chat-file-btn" aria-label="Attach file">
                        <span class="wp-chat-file-icon"></span>
                    </button>
                    <input type="file" id="wp-chat-file-input" class="wp-chat-file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;">
                    <?php endif; ?>
                    
                    <input type="text" id="wp-chat-input" class="wp-chat-input" placeholder="Type your message..." aria-label="Chat message">
                    <button type="submit" class="wp-chat-send-btn" aria-label="Send message">
                        <span class="wp-chat-send-icon"></span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>