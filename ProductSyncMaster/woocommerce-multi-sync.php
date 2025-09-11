<?php
/**
 * Plugin Name: WooCommerce Multi-Site Sync Pro
 * Plugin URI: https://yoursite.com/woocommerce-multi-sync
 * Description: Enhanced WooCommerce product synchronization system with real-time sync, multi-site management, and automated conflict resolution
 * Version: 2.0.1
 * Author: Your Name
 * Author URI: https://yoursite.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: wc-multi-sync
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * WC requires at least: 4.0
 * WC tested up to: 8.4
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('WC_MULTI_SYNC_VERSION', '2.0.1');
define('WC_MULTI_SYNC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WC_MULTI_SYNC_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('WC_MULTI_SYNC_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Check if WooCommerce is active
add_action('plugins_loaded', 'wc_multi_sync_check_woocommerce');

function wc_multi_sync_check_woocommerce() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', 'wc_multi_sync_woocommerce_missing_notice');
        return;
    }
    
    // Initialize the plugin
    WC_Multi_Sync::instance();
}

function wc_multi_sync_woocommerce_missing_notice() {
    echo '<div class="notice notice-error"><p>';
    echo '<strong>' . esc_html__('WooCommerce Multi-Site Sync Pro', 'wc-multi-sync') . '</strong> ';
    echo esc_html__('requires WooCommerce to be installed and active.', 'wc-multi-sync');
    echo '</p></div>';
}

/**
 * Main plugin class
 */
class WC_Multi_Sync {
    
    private static $instance = null;
    
    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
        $this->includes();
    }
    
    private function init_hooks() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'admin_scripts'));
        add_action('wp_ajax_wc_multi_sync_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_wc_multi_sync_sync_product', array($this, 'ajax_sync_product'));
        add_action('wp_ajax_wc_multi_sync_bulk_sync', array($this, 'ajax_bulk_sync'));
        
        // WooCommerce hooks for real-time sync
        add_action('woocommerce_new_product', array($this, 'product_created'), 10, 1);
        add_action('woocommerce_update_product', array($this, 'product_updated'), 10, 1);
        add_action('woocommerce_delete_product', array($this, 'product_deleted'), 10, 1);
        
        // REST API endpoints
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Activation/Deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    private function includes() {
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/class-database.php';
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/class-api-client.php';
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/class-sync-engine.php';
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/class-webhook-handler.php';
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/admin/class-admin.php';
    }
    
    public function init() {
        // Load text domain
        load_plugin_textdomain('wc-multi-sync', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    public function add_admin_menu() {
        add_menu_page(
            __('Multi-Site Sync', 'wc-multi-sync'),
            __('Multi-Site Sync', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync',
            array($this, 'admin_page'),
            'dashicons-update',
            58
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Dashboard', 'wc-multi-sync'),
            __('Dashboard', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync',
            array($this, 'admin_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Sites', 'wc-multi-sync'),
            __('Sites', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-sites',
            array($this, 'sites_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Sync Rules', 'wc-multi-sync'),
            __('Sync Rules', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-rules',
            array($this, 'rules_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Activity Logs', 'wc-multi-sync'),
            __('Activity Logs', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-logs',
            array($this, 'logs_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Settings', 'wc-multi-sync'),
            __('Settings', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-settings',
            array($this, 'settings_page')
        );
    }
    
    public function admin_scripts($hook) {
        if (strpos($hook, 'wc-multi-sync') === false) {
            return;
        }
        
        wp_enqueue_style(
            'wc-multi-sync-admin',
            WC_MULTI_SYNC_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            WC_MULTI_SYNC_VERSION
        );
        
        wp_enqueue_script(
            'wc-multi-sync-admin',
            WC_MULTI_SYNC_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            WC_MULTI_SYNC_VERSION,
            true
        );
        
        wp_localize_script('wc-multi-sync-admin', 'wcMultiSync', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wc_multi_sync_nonce'),
            'strings' => array(
                'confirmDelete' => __('Are you sure you want to delete this item?', 'wc-multi-sync'),
                'syncInProgress' => __('Sync in progress...', 'wc-multi-sync'),
                'syncComplete' => __('Sync completed successfully!', 'wc-multi-sync'),
                'syncError' => __('Sync failed. Please try again.', 'wc-multi-sync'),
            )
        ));
    }
    
    public function admin_page() {
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/admin/views/dashboard.php';
    }
    
    public function sites_page() {
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/admin/views/sites.php';
    }
    
    public function rules_page() {
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/admin/views/rules.php';
    }
    
    public function logs_page() {
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/admin/views/logs.php';
    }
    
    public function settings_page() {
        require_once WC_MULTI_SYNC_PLUGIN_PATH . 'includes/admin/views/settings.php';
    }
    
    public function ajax_test_connection() {
        check_ajax_referer('wc_multi_sync_nonce', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Insufficient permissions', 'wc-multi-sync'));
        }
        
        $site_url = sanitize_url($_POST['site_url']);
        $consumer_key = sanitize_text_field($_POST['consumer_key']);
        $consumer_secret = sanitize_text_field($_POST['consumer_secret']);
        
        $api_client = new WC_Multi_Sync_API_Client($site_url, $consumer_key, $consumer_secret);
        $result = $api_client->test_connection();
        
        wp_send_json($result);
    }
    
    public function ajax_sync_product() {
        check_ajax_referer('wc_multi_sync_nonce', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Insufficient permissions', 'wc-multi-sync'));
        }
        
        $product_id = intval($_POST['product_id']);
        $target_sites = array_map('intval', $_POST['target_sites']);
        
        $sync_engine = new WC_Multi_Sync_Engine();
        $result = $sync_engine->sync_product($product_id, $target_sites);
        
        wp_send_json($result);
    }
    
    public function ajax_bulk_sync() {
        check_ajax_referer('wc_multi_sync_nonce', 'nonce');
        
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Insufficient permissions', 'wc-multi-sync'));
        }
        
        $product_ids = array_map('intval', $_POST['product_ids']);
        $target_sites = array_map('intval', $_POST['target_sites']);
        
        $sync_engine = new WC_Multi_Sync_Engine();
        $result = $sync_engine->bulk_sync($product_ids, $target_sites);
        
        wp_send_json($result);
    }
    
    public function product_created($product_id) {
        if (get_option('wc_multi_sync_auto_sync', 1)) {
            $sync_engine = new WC_Multi_Sync_Engine();
            $sync_engine->auto_sync_product($product_id, 'created');
        }
    }
    
    public function product_updated($product_id) {
        if (get_option('wc_multi_sync_auto_sync', 1)) {
            $sync_engine = new WC_Multi_Sync_Engine();
            $sync_engine->auto_sync_product($product_id, 'updated');
        }
    }
    
    public function product_deleted($product_id) {
        if (get_option('wc_multi_sync_auto_sync', 1)) {
            $sync_engine = new WC_Multi_Sync_Engine();
            $sync_engine->auto_sync_product($product_id, 'deleted');
        }
    }
    
    public function register_rest_routes() {
        register_rest_route('wc-multi-sync/v1', '/webhook', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_webhook'),
            'permission_callback' => array($this, 'webhook_permission_check'),
        ));
    }
    
    public function handle_webhook($request) {
        $webhook_handler = new WC_Multi_Sync_Webhook_Handler();
        return $webhook_handler->handle($request);
    }
    
    public function webhook_permission_check($request) {
        $webhook_secret = get_option('wc_multi_sync_webhook_secret');
        $provided_secret = $request->get_header('X-WC-Webhook-Secret');
        
        return hash_equals($webhook_secret, $provided_secret);
    }
    
    public function activate() {
        WC_Multi_Sync_Database::create_tables();
        
        // Set default options
        add_option('wc_multi_sync_auto_sync', 1);
        add_option('wc_multi_sync_batch_size', 50);
        add_option('wc_multi_sync_sync_frequency', 300);
        add_option('wc_multi_sync_webhook_secret', wp_generate_password(32, false));
        
        // Schedule cron jobs
        if (!wp_next_scheduled('wc_multi_sync_cron')) {
            wp_schedule_event(time(), 'hourly', 'wc_multi_sync_cron');
        }
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        // Clear scheduled cron jobs
        wp_clear_scheduled_hook('wc_multi_sync_cron');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}