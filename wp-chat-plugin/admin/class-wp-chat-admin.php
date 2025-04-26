<?php
/**
 * Admin-specific functionality for WP Chat Plugin
 */

 require_once WP_CHAT_PLUGIN_DIR . 'admin/partials/sessions.php';

class WP_Chat_Admin {
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        // Main menu
        add_menu_page(
            'Chat Plugin',
            'Chat Plugin',
            'manage_options',
            'wp-chat-plugin',
            array($this, 'display_dashboard_page'),
            'dashicons-format-chat',
            30
        );
        
        // Submenus
        add_submenu_page(
            'wp-chat-plugin',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'wp-chat-plugin',
            array($this, 'display_dashboard_page')
        );
        
        add_submenu_page(
            'wp-chat-plugin',
            'Chat Sessions',
            'Chat Sessions',
            'manage_options',
            'wp-chat-sessions',
            array($this, 'display_sessions_page')
        );
        
        add_submenu_page(
            'wp-chat-plugin',
            'Settings',
            'Settings',
            'manage_options',
            'wp-chat-settings',
            array($this, 'display_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        // General settings
        register_setting('wp_chat_general', 'wp_chat_enable_chat');
        register_setting('wp_chat_general', 'wp_chat_widget_position');
        register_setting('wp_chat_general', 'wp_chat_primary_color');
        register_setting('wp_chat_general', 'wp_chat_welcome_message');
        register_setting('wp_chat_general', 'wp_chat_company_name');
        register_setting('wp_chat_general', 'wp_chat_use_company_name');
        
        // Working hours settings
        register_setting('wp_chat_working_hours', 'wp_chat_working_hours_enable');
        register_setting('wp_chat_working_hours', 'wp_chat_working_hours');
        register_setting('wp_chat_working_hours', 'wp_chat_offline_message');
        
        // Advanced settings
        register_setting('wp_chat_advanced', 'wp_chat_user_status_indicators');
        
        // Agent display names (one option per agent)
        global $wpdb;
        $admin_users = get_users(array('role__in' => array('administrator')));
        foreach ($admin_users as $admin) {
            register_setting('wp_chat_advanced', 'wp_chat_agent_name_' . $admin->ID);
        }
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_scripts($hook) {
        // Only enqueue on our plugin pages
        if (strpos($hook, 'wp-chat') === false) {
            return;
        }
        
        // Styles
        wp_enqueue_style(
            'wp-chat-admin-style',
            WP_CHAT_PLUGIN_URL . 'admin/css/wp-chat-admin.css',
            array(),
            WP_CHAT_PLUGIN_VERSION
        );
        
        // Color picker
        wp_enqueue_style('wp-color-picker');
        
        // Scripts
        wp_enqueue_script(
            'wp-chat-admin-script',
            WP_CHAT_PLUGIN_URL . 'admin/js/wp-chat-admin.js',
            array('jquery', 'wp-color-picker'),
            WP_CHAT_PLUGIN_VERSION,
            true
        );
        
        // Localize script with AJAX URL and nonce
        wp_localize_script(
            'wp-chat-admin-script',
            'wp_chat_admin',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('wp_chat_security'),
                'polling_interval' => 5000 // 5 seconds for checking new messages
            )
        );
    }
    
    /**
     * Display dashboard page
     */
    public function display_dashboard_page() {
        // Get chat stats
        $db = new WP_Chat_DB();
        $args = array(
            'status' => 'pending',
            'limit' => 100
        );
        $pending_sessions = $db->get_all_sessions($args);
        
        $args = array(
            'status' => 'active',
            'limit' => 100
        );
        $active_sessions = $db->get_all_sessions($args);
        
        $args = array(
            'limit' => 10
        );
        $recent_sessions = $db->get_all_sessions($args);
        
        $user_status = new WP_Chat_User_Status();
        $online_users = $user_status->get_online_users();
        
        // Include template
        include(WP_CHAT_PLUGIN_DIR . 'admin/partials/dashboard.php');
    }
    
    /**
     * Display sessions page
     */
    public function display_sessions_page() {
        // Get filters from URL
        $status = isset($_GET['status']) ? sanitize_text_field($_GET['status']) : '';
        $search = isset($_GET['search']) ? sanitize_text_field($_GET['search']) : '';
        
        $db = new WP_Chat_DB();
        $args = array(
            'status' => $status,
            'search' => $search
        );
        $sessions = $db->get_all_sessions($args);
        
        // Include template
        include(WP_CHAT_PLUGIN_DIR . 'admin/partials/sessions.php');
    }
    
    /**
     * Display settings page
     */
    public function display_settings_page() {
        // Get current settings
        $enable_chat = get_option('wp_chat_enable_chat', '1');
        $widget_position = get_option('wp_chat_widget_position', 'bottom-right');
        $primary_color = get_option('wp_chat_primary_color', '#4f46e5');
        $welcome_message = get_option('wp_chat_welcome_message', 'Hello! How can we help you today?');
        
        $working_hours_enable = get_option('wp_chat_working_hours_enable', '1');
        $working_hours = get_option('wp_chat_working_hours', array(
            'monday' => array('start' => '08:30', 'end' => '16:30', 'closed' => false),
            'tuesday' => array('start' => '08:30', 'end' => '16:30', 'closed' => false),
            'wednesday' => array('start' => '08:30', 'end' => '16:30', 'closed' => false),
            'thursday' => array('start' => '08:30', 'end' => '16:30', 'closed' => false),
            'friday' => array('start' => '08:30', 'end' => '16:30', 'closed' => false),
            'saturday' => array('start' => '08:30', 'end' => '11:30', 'closed' => false),
            'sunday' => array('start' => '00:00', 'end' => '00:00', 'closed' => true)
        ));
        $offline_message = get_option('wp_chat_offline_message', "We're currently offline. Please leave a message and we'll get back to you.");
        
        $user_status_indicators = get_option('wp_chat_user_status_indicators', '1');
        
        // Include template
        include(WP_CHAT_PLUGIN_DIR . 'admin/partials/settings.php');
    }
}