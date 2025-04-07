<?php
if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'roles/class-b2b-roles.php';
require_once plugin_dir_path(__FILE__) . 'fields/class-b2b-fields.php';
require_once plugin_dir_path(__FILE__) . 'pricing/class-b2b-pricing.php';
require_once plugin_dir_path(__FILE__) . 'display/class-b2b-display.php';


class B2B_Discount_Plugin {
    private $b2b_roles;
    private $b2b_fields;
    private $b2b_pricing;
    private $b2b_display;


    public function __construct() {
    $this->b2b_roles = new B2B_Roles();
    $this->b2b_fields = new B2B_Fields();
    $this->b2b_pricing = new B2B_Pricing();
    $this->b2b_display = new B2B_Display();
}


    public function run() {
        // Add the B2B role on plugin activation
        register_activation_hook(__FILE__, array($this->b2b_roles, 'add_b2b_role'));
        register_deactivation_hook(__FILE__, array($this->b2b_roles, 'remove_b2b_role'));
        $this->b2b_roles->add_b2b_role();
        $this->b2b_display->init();
        $this->b2b_fields->init();



        // Add custom fields to product edit page and quick edit
        add_action('woocommerce_product_options_general_product_data', array($this->b2b_fields, 'add_b2b_fields'));
        add_action('woocommerce_process_product_meta', array($this->b2b_fields, 'save_b2b_fields'));
        add_filter('woocommerce_get_price_html', array($this->b2b_pricing, 'display_b2b_price'), 10, 2);
        add_filter('woocommerce_quantity_input_args', array($this->b2b_pricing, 'set_minimum_quantity'), 10, 2);
        add_action('woocommerce_before_calculate_totals', array($this->b2b_pricing, 'adjust_cart_prices'));
        
        // Add to Quick Edit
        add_action('quick_edit_custom_box', array($this->b2b_fields, 'add_quick_edit_b2b_fields'), 10, 2);
        add_action('save_post', array($this->b2b_fields, 'save_quick_edit_b2b_fields'));
    }
}

$b2b_discount_plugin = new B2B_Discount_Plugin();
$b2b_discount_plugin->run();