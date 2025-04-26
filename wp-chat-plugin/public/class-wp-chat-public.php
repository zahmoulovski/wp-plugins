<?php
/**
 * Public-facing functionality for WP Chat Plugin
 */
class WP_Chat_Public {
    /**
     * Enqueue front-end scripts and styles
     */
    public function enqueue_scripts() {
        // Check if chat is enabled
        $enable_chat = get_option('wp_chat_enable_chat', '1');
        if ($enable_chat !== '1') {
            return;
        }
        
        // Styles
        wp_enqueue_style(
            'wp-chat-public-style',
            WP_CHAT_PLUGIN_URL . 'public/css/wp-chat-public.css',
            array(),
            WP_CHAT_PLUGIN_VERSION
        );
        
        // Scripts
        wp_enqueue_script(
            'wp-chat-public-script',
            WP_CHAT_PLUGIN_URL . 'public/js/wp-chat-public.js',
            array('jquery'),
            WP_CHAT_PLUGIN_VERSION,
            true
        );
        
        // Pass configuration to script
        $this->localize_script();
    }
    
    /**
     * Localize script with configuration
     */
    private function localize_script() {
        // Get chat configuration
        $widget_position = get_option('wp_chat_widget_position', 'bottom-right');
        $primary_color = get_option('wp_chat_primary_color', '#4f46e5');
        $welcome_message = get_option('wp_chat_welcome_message', 'Hello! How can we help you today?');
        
        $working_hours_enable = get_option('wp_chat_working_hours_enable', '1');
        $working_hours = get_option('wp_chat_working_hours', array());
        $offline_message = get_option('wp_chat_offline_message', "We're currently offline. Please leave a message and we'll get back to you.");
        
        $user_status_indicators = get_option('wp_chat_user_status_indicators', '1');
        
        // Get current user info if logged in
        $current_user = wp_get_current_user();
        $user_data = array(
            'is_logged_in' => is_user_logged_in(),
            'user_id' => 0,
            'display_name' => '',
            'email' => ''
        );
        
        if (is_user_logged_in()) {
            $user_data['user_id'] = $current_user->ID;
            $user_data['display_name'] = $current_user->display_name;
            $user_data['email'] = $current_user->user_email;
        }
        
        // Check if within working hours
        $is_within_hours = $this->is_within_working_hours($working_hours);
        
        // Localize script
        wp_localize_script(
            'wp-chat-public-script',
            'wp_chat_config',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('wp_chat_security'),
                'widget_position' => $widget_position,
                'primary_color' => $primary_color,
                'welcome_message' => $welcome_message,
                'working_hours_enable' => $working_hours_enable,
                'is_within_hours' => $is_within_hours,
                'offline_message' => $offline_message,
                'user_status_indicators' => $user_status_indicators,
                'current_user' => $user_data,
                'visitor_id' => isset($_COOKIE['wp_chat_visitor_id']) ? intval($_COOKIE['wp_chat_visitor_id']) : 0,
                'polling_interval' => 3000, // 3 seconds for checking new messages
                'typing_interval' => 500 // 0.5 seconds for typing indicator
            )
        );
    }
    
    /**
     * Check if current time is within working hours
     */
    private function is_within_working_hours($working_hours) {
        if (empty($working_hours)) {
            return true; // Default to open if not configured
        }
        
        // Get current day and time
        $current_day = strtolower(date('l'));
        $current_time = date('H:i');
        
        // Map day name to array key
        $day_map = array(
            'monday' => 'monday',
            'tuesday' => 'tuesday',
            'wednesday' => 'wednesday',
            'thursday' => 'thursday',
            'friday' => 'friday',
            'saturday' => 'saturday',
            'sunday' => 'sunday'
        );
        
        $day_key = $day_map[$current_day];
        
        // Check if day exists in working hours
        if (!isset($working_hours[$day_key])) {
            return true; // Default to open if day not configured
        }
        
        $hours = $working_hours[$day_key];
        
        // Check if closed for the day
        if (isset($hours['closed']) && $hours['closed']) {
            return false;
        }
        
        // Check if within time range
        $start_time = isset($hours['start']) ? $hours['start'] : '00:00';
        $end_time = isset($hours['end']) ? $hours['end'] : '23:59';
        
        return ($current_time >= $start_time && $current_time <= $end_time);
    }
    
    /**
     * Display chat widget in footer
     */
    public function display_chat_widget() {
        // Check if chat is enabled
        $enable_chat = get_option('wp_chat_enable_chat', '1');
        if ($enable_chat !== '1') {
            return;
        }
        
        // Get position class
        $position = get_option('wp_chat_widget_position', 'bottom-right');
        $position_class = 'wp-chat-' . $position;
        
        // Include template
        include(WP_CHAT_PLUGIN_DIR . 'public/partials/chat-widget.php');
    }
    
    /**
     * Shortcode for embedding chat
     */
    public function chat_shortcode($atts) {
        // Check if chat is enabled
        $enable_chat = get_option('wp_chat_enable_chat', '1');
        if ($enable_chat !== '1') {
            return '';
        }
        
        // Parse attributes
        $atts = shortcode_atts(
            array(
                'width' => '100%',
                'height' => '400px',
                'inline' => 'false'
            ),
            $atts,
            'wp_chat'
        );
        
        // Start output buffering
        ob_start();
        
        // Include template
        include(WP_CHAT_PLUGIN_DIR . 'public/partials/chat-shortcode.php');
        
        // Return buffered output
        return ob_get_clean();
    }
}