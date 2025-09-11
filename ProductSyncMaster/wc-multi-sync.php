<?php
/**
 * Plugin Name: WooCommerce Multi-Site Sync Pro
 * Plugin URI: https://yoursite.com/wc-multi-sync
 * Description: Advanced WooCommerce product synchronization across multiple sites with real-time sync, automated conflict resolution, and comprehensive management dashboard.
 * Version: 2.1.0
 * Author: Your Name
 * License: GPL v2 or later
 * Text Domain: wc-multi-sync
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * WC requires at least: 5.0
 * WC tested up to: 8.5
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WC_MULTI_SYNC_VERSION', '2.1.0');
define('WC_MULTI_SYNC_PLUGIN_FILE', __FILE__);
define('WC_MULTI_SYNC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WC_MULTI_SYNC_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main WooCommerce Multi-Site Sync class
 */
class WC_Multi_Sync {
    
    /**
     * Single instance of the plugin
     */
    private static $instance = null;
    
    /**
     * Get single instance
     */
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
        
        $this->load_textdomain();
        $this->includes();
        $this->init_hooks();
    }
    
    /**
     * Load plugin textdomain
     */
    public function load_textdomain() {
        load_plugin_textdomain('wc-multi-sync', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Include required files
     */
    public function includes() {
        // Load database class first as other classes depend on it
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-database.php';
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-logger.php';
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-api.php';
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-sync-engine.php';
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-webhook-handler.php';
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-admin.php';
    }
    
    /**
     * Initialize hooks
     */
    public function init_hooks() {
        // Initialize admin interface
        if (is_admin()) {
            new WC_Multi_Sync_Admin();
        }
        
        // Initialize API
        new WC_Multi_Sync_API();
        
        // Initialize sync engine
        new WC_Multi_Sync_Sync_Engine();
        
        // Initialize webhook handler
        new WC_Multi_Sync_Webhook_Handler();
        
        // Product hooks for real-time sync
        add_action('woocommerce_new_product', array($this, 'on_product_created'), 10, 1);
        add_action('woocommerce_update_product', array($this, 'on_product_updated'), 10, 1);
        add_action('woocommerce_delete_product', array($this, 'on_product_deleted'), 10, 1);
        add_action('woocommerce_product_set_stock', array($this, 'on_product_stock_changed'), 10, 1);
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Include required files for activation
        require_once WC_MULTI_SYNC_PLUGIN_DIR . 'includes/class-wc-multi-sync-database.php';
        
        // Create database tables
        WC_Multi_Sync_Database::create_tables();
        
        // Set default options
        if (!get_option('wc_multi_sync_settings')) {
            update_option('wc_multi_sync_settings', array(
                'real_time_sync' => 'yes',
                'sync_frequency' => '300', // 5 minutes
                'batch_size' => '50',
                'timeout' => '30',
                'conflict_resolution' => 'source_wins',
                'email_notifications' => 'yes',
                'webhook_notifications' => 'no',
                'sync_images' => 'yes',
                'sync_categories' => 'yes',
                'sync_variations' => 'yes',
                'sync_inventory' => 'no'
            ));
        }
        
        // Schedule cron job for periodic sync
        if (!wp_next_scheduled('wc_multi_sync_cron')) {
            wp_schedule_event(time(), 'wc_multi_sync_interval', 'wc_multi_sync_cron');
        }
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clear scheduled cron
        wp_clear_scheduled_hook('wc_multi_sync_cron');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * WooCommerce missing notice
     */
    public function woocommerce_missing_notice() {
        ?>
        <div class="notice notice-error">
            <p><?php _e('WooCommerce Multi-Site Sync Pro requires WooCommerce to be installed and active.', 'wc-multi-sync'); ?></p>
        </div>
        <?php
    }
    
    /**
     * Handle product created event
     */
    public function on_product_created($product_id) {
        if (get_option('wc_multi_sync_settings')['real_time_sync'] === 'yes') {
            WC_Multi_Sync_Sync_Engine::queue_product_sync($product_id, 'created');
        }
    }
    
    /**
     * Handle product updated event
     */
    public function on_product_updated($product_id) {
        if (get_option('wc_multi_sync_settings')['real_time_sync'] === 'yes') {
            WC_Multi_Sync_Sync_Engine::queue_product_sync($product_id, 'updated');
        }
    }
    
    /**
     * Handle product deleted event
     */
    public function on_product_deleted($product_id) {
        if (get_option('wc_multi_sync_settings')['real_time_sync'] === 'yes') {
            WC_Multi_Sync_Sync_Engine::queue_product_sync($product_id, 'deleted');
        }
    }
    
    /**
     * Handle product stock changed event
     */
    public function on_product_stock_changed($product) {
        if (get_option('wc_multi_sync_settings')['sync_inventory'] === 'yes') {
            WC_Multi_Sync_Sync_Engine::queue_product_sync($product->get_id(), 'stock_changed');
        }
    }
}

// Initialize plugin
WC_Multi_Sync::get_instance();

// Add custom cron interval
add_filter('cron_schedules', function($schedules) {
    $settings = get_option('wc_multi_sync_settings', array());
    $interval = isset($settings['sync_frequency']) ? intval($settings['sync_frequency']) : 300;
    
    $schedules['wc_multi_sync_interval'] = array(
        'interval' => $interval,
        'display' => __('WC Multi-Sync Interval', 'wc-multi-sync')
    );
    
    return $schedules;
});

// Handle cron job
add_action('wc_multi_sync_cron', function() {
    WC_Multi_Sync_Sync_Engine::process_sync_queue();
});