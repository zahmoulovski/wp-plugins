<?php
/**
 * Frontend functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class FSPB_Frontend {
    
    private $settings;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->settings = get_option('fspb_settings', array());
        
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_fspb_update_progress', array($this, 'ajax_update_progress'));
        add_action('wp_ajax_nopriv_fspb_update_progress', array($this, 'ajax_update_progress'));
        
        // Hook into WooCommerce locations
        $this->add_display_hooks();
    }
    
    /**
     * Add display hooks based on settings
     */
    private function add_display_hooks() {
        // Product page
        if ($this->settings['show_on_product'] ?? 1) {
            add_action('woocommerce_single_product_summary', array($this, 'display_progress_bar'), 35);
        }
        
        // Mini cart
        if ($this->settings['show_on_mini_cart'] ?? 1) {
            add_action('woocommerce_widget_shopping_cart_total', array($this, 'display_progress_bar'));
        }
        
        // Cart page
        if ($this->settings['show_on_cart'] ?? 1) {
            add_action('woocommerce_cart_totals_before_shipping', array($this, 'display_progress_bar'));
        }
        
        // Checkout page - display at the top
        if ($this->settings['show_on_checkout'] ?? 1) {
            add_action('woocommerce_before_checkout_form', array($this, 'display_progress_bar'), 5);
            add_action('woocommerce_checkout_before_customer_details', array($this, 'display_progress_bar'), 5);
        }
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        if (!is_woocommerce() && !is_cart() && !is_checkout()) {
            return;
        }
        
        wp_enqueue_style('fspb-frontend-css', FSPB_PLUGIN_URL . 'assets/css/frontend.css', array(), FSPB_PLUGIN_VERSION);
        wp_enqueue_script('fspb-frontend-js', FSPB_PLUGIN_URL . 'assets/js/frontend.js', array('jquery'), FSPB_PLUGIN_VERSION, true);
        
        wp_localize_script('fspb-frontend-js', 'fspb_frontend', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('fspb_frontend_nonce'),
            'currency_symbol' => get_woocommerce_currency_symbol(),
            'currency_position' => get_option('woocommerce_currency_pos')
        ));
    }
    
    /**
     * Display the progress bar
     */
    public function display_progress_bar() {
        $calculator = new FSPB_Calculator();
        $progress_data = $calculator->calculate_progress();
        
        // Don't show if cart is empty
        if (!WC()->cart || WC()->cart->is_empty()) {
            return;
        }
        
        // Don't show if no eligible products in cart (when filters are set)
        if ($this->has_filters_set() && $progress_data['cart_total'] <= 0) {
            return;
        }
        
        include FSPB_PLUGIN_PATH . 'templates/progress-bar.php';
    }
    
    /**
     * Check if product/category filters are set
     */
    private function has_filters_set() {
        $included_products = $this->settings['included_products'] ?? array();
        $excluded_products = $this->settings['excluded_products'] ?? array();
        $included_categories = $this->settings['included_categories'] ?? array();
        $excluded_categories = $this->settings['excluded_categories'] ?? array();
        
        return !empty($included_products) || !empty($excluded_products) || 
               !empty($included_categories) || !empty($excluded_categories);
    }
    
    /**
     * AJAX update progress
     */
    public function ajax_update_progress() {
        check_ajax_referer('fspb_frontend_nonce', 'nonce');
        
        $calculator = new FSPB_Calculator();
        $progress_data = $calculator->calculate_progress();
        
        wp_send_json_success($progress_data);
    }
}
