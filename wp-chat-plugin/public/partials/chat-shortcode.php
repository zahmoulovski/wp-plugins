<?php
/**
 * Template for the chat shortcode
 */
?>
<div class="wp-chat-shortcode" style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">
    <div class="wp-chat-shortcode-container">
        <div class="wp-chat-header">
            <span class="wp-chat-title"><?php echo esc_html(get_option('wp_chat_title', 'Chat Support')); ?></span>
        </div>
        
        <div class="wp-chat-content">
            <div id="wp-chat-messages-<?php echo esc_attr(uniqid()); ?>" class="wp-chat-messages"></div>
            <div id="wp-chat-typing-indicator-<?php echo esc_attr(uniqid()); ?>" class="wp-chat-typing-indicator"></div>
            
            <form id="wp-chat-form-<?php echo esc_attr(uniqid()); ?>" class="wp-chat-form">
                <div class="wp-chat-input-wrapper">
                    <?php if (get_option('wp_chat_enable_attachments', false)): ?>
                    <button type="button" class="wp-chat-file-btn" aria-label="Attach file">
                        <span class="wp-chat-file-icon"></span>
                    </button>
                    <input type="file" class="wp-chat-file-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none;">
                    <?php endif; ?>
                    
                    <input type="text" class="wp-chat-input" placeholder="Type your message..." aria-label="Chat message">
                    <button type="submit" class="wp-chat-send-btn" aria-label="Send message">
                        <span class="wp-chat-send-icon"></span>
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>