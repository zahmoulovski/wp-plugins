<?php
/**
 * Plugin Name: Free Shipping Progress Bar
 * Plugin URI: https://klarrion.com/
 * Description: Adds an animated free shipping progress bar to WooCommerce stores with customizable thresholds and placement options.
 * Version: 1.0.1
 * Author: Med Yassine Zahmoul
 * Text Domain: free-shipping-progress-bar
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('FSPB_PLUGIN_URL', plugin_dir_url(__FILE__));
define('FSPB_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('FSPB_PLUGIN_VERSION', '1.0.0');

/**
 * Main plugin class
 */
class FreeShippingProgressBar {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('plugins_loaded', array($this, 'init'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
        
        // Load text domain
        load_plugin_textdomain('free-shipping-progress-bar', false, dirname(plugin_basename(__FILE__)) . '/languages/');
        
        // Include required files
        $this->includes();
        
        // Initialize classes
        new FSPB_Admin();
        new FSPB_Frontend();
        new FSPB_Shipping();
    }
    
    /**
     * Include required files
     */
    private function includes() {
        require_once FSPB_PLUGIN_PATH . 'includes/class-admin.php';
        require_once FSPB_PLUGIN_PATH . 'includes/class-frontend.php';
        require_once FSPB_PLUGIN_PATH . 'includes/class-calculator.php';
        require_once FSPB_PLUGIN_PATH . 'includes/class-shipping.php';
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        $default_options = array(
            'threshold' => 100,
            'initial_message' => __('Add {remaining} more to get free shipping!', 'free-shipping-progress-bar'),
            'success_message' => __('Congratulations! You qualify for free shipping!', 'free-shipping-progress-bar'),
            'included_products' => array(),
            'excluded_products' => array(),
            'included_categories' => array(),
            'excluded_categories' => array(),
            'show_on_product' => 1,
            'show_on_mini_cart' => 1,
            'show_on_cart' => 1,
            'show_on_checkout' => 1
        );
        
        if (!get_option('fspb_settings')) {
            add_option('fspb_settings', $default_options);
        }
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Clean up if needed
    }
    
    /**
     * WooCommerce missing notice
     */
    public function woocommerce_missing_notice() {
        echo '<div class="error"><p>';
        echo __('Free Shipping Progress Bar requires WooCommerce to be installed and active.', 'free-shipping-progress-bar');
        echo '</p></div>';
    }
}

// Initialize the plugin
new FreeShippingProgressBar();
