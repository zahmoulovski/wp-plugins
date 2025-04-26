<?php
/**
 * Plugin Name: WP Chat Plugin
 * Plugin URI:  https://klarrion.com
 * Description: A comprehensive WordPress chat plugin for real-time communication between website visitors and admins.
 * Version:     1.0.0
 * Author:      Klarrion
 * Author URI:  https://klarrion.com
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: wp-chat-plugin
 * Domain Path: /languages
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}


register_activation_hook(__FILE__, function() {
    $db = new WP_Chat_DB();
    $db->create_tables();
});

// Define plugin constants
define('WP_CHAT_PLUGIN_VERSION', '1.0.0');
define('WP_CHAT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WP_CHAT_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include required files
require_once WP_CHAT_PLUGIN_DIR . 'includes/class-wp-chat-db.php';
require_once WP_CHAT_PLUGIN_DIR . 'includes/class-wp-chat-user-status.php';
require_once WP_CHAT_PLUGIN_DIR . 'includes/class-wp-chat-ajax.php';
require_once WP_CHAT_PLUGIN_DIR . 'admin/class-wp-chat-admin.php';
require_once WP_CHAT_PLUGIN_DIR . 'public/class-wp-chat-public.php';

/**
 * Main WP Chat Plugin Class
 */
class WP_Chat_Plugin {
    /**
     * Plugin instance
     */
    private static $instance;
    
    /**
     * DB instance
     */
    private $db;
    
    /**
     * User status instance
     */
    private $user_status;
    
    /**
     * AJAX instance
     */
    private $ajax;
    
    /**
     * Admin instance
     */
    private $admin;
    
    /**
     * Public instance
     */
    private $public;
    
    /**
     * Get plugin instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        // Initialize components
        $this->db = new WP_Chat_DB();
        $this->user_status = new WP_Chat_User_Status();
        $this->ajax = new WP_Chat_Ajax();
        $this->admin = new WP_Chat_Admin();
        $this->public = new WP_Chat_Public();
        
        // Register hooks
        $this->register_hooks();
    }
    
    /**
     * Register plugin hooks
     */
    private function register_hooks() {
        // Activation and deactivation
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Initialize AJAX hooks
        add_action('init', array($this->ajax, 'register_ajax_hooks'));
        
        // Track user activity for status indicators
        add_action('init', array($this->user_status, 'track_user_activity'));
        
        // Admin hooks
        add_action('admin_menu', array($this->admin, 'add_admin_menu'));
        add_action('admin_init', array($this->admin, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this->admin, 'enqueue_scripts'));
        
        // Public hooks
        add_action('wp_enqueue_scripts', array($this->public, 'enqueue_scripts'));
        add_action('wp_footer', array($this->public, 'display_chat_widget'));
        
        // Register shortcode
        add_shortcode('wp_chat', array($this->public, 'chat_shortcode'));
        
        // User display name with status indicator
        add_filter('the_author', array($this->user_status, 'add_status_indicator'), 10, 2);
        add_filter('comment_author', array($this->user_status, 'add_status_indicator'), 10, 2);
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Create database tables
        $this->db->create_tables();
        
        // Create uploads directory
        $uploads_dir = WP_CHAT_PLUGIN_DIR . 'uploads';
        if (!file_exists($uploads_dir)) {
            mkdir($uploads_dir, 0755, true);
        }
        
        // Add .htaccess to protect uploads directory
        $htaccess_file = $uploads_dir . '/.htaccess';
        if (!file_exists($htaccess_file)) {
            $htaccess_content = "# Protect files from direct access\n";
            $htaccess_content .= "<Files ~ \".*\..*\">\n";
            $htaccess_content .= "    Order Allow,Deny\n";
            $htaccess_content .= "    Deny from all\n";
            $htaccess_content .= "</Files>\n";
            $htaccess_content .= "# Allow specific file types\n";
            $htaccess_content .= "<FilesMatch \"\.(jpg|jpeg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx)$\">\n";
            $htaccess_content .= "    Order Deny,Allow\n";
            $htaccess_content .= "    Allow from all\n";
            $htaccess_content .= "</FilesMatch>\n";
            file_put_contents($htaccess_file, $htaccess_content);
        }
        
        // Set default options
        if (get_option('wp_chat_enable_chat') === false) {
            update_option('wp_chat_enable_chat', '1');
        }
        
        if (get_option('wp_chat_widget_position') === false) {
            update_option('wp_chat_widget_position', 'bottom-right');
        }
        
        if (get_option('wp_chat_primary_color') === false) {
            update_option('wp_chat_primary_color', '#4f46e5');
        }
        
        if (get_option('wp_chat_welcome_message') === false) {
            update_option('wp_chat_welcome_message', 'Hello! How can we help you today?');
        }
        
        if (get_option('wp_chat_working_hours_enable') === false) {
            update_option('wp_chat_working_hours_enable', '1');
        }
        
        if (get_option('wp_chat_offline_message') === false) {
            update_option('wp_chat_offline_message', "We're currently offline. Please leave a message and we'll get back to you.");
        }
        
        if (get_option('wp_chat_user_status_indicators') === false) {
            update_option('wp_chat_user_status_indicators', '1');
        }
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Initialize plugin
function wp_chat_plugin_init() {
    WP_Chat_Plugin::get_instance();
}
add_action('plugins_loaded', 'wp_chat_plugin_init');