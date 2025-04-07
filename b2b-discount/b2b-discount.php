<?php
/*
Plugin Name: B2B Discount
Description: Adds a B2B user role and applies a B2B discount on selected products for B2B users.
Version: 1.1
Author: Med Yassine Zahmoul
*/

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Include the main plugin class
require_once plugin_dir_path(__FILE__) . 'includes/class-b2b-discount.php';

function b2b_discount_plugin_init() {
    static $b2b_discount_plugin = null;

    if ($b2b_discount_plugin === null) {
        $b2b_discount_plugin = new B2B_Discount_Plugin();
        $b2b_discount_plugin->run();
    }
}
add_action('plugins_loaded', 'b2b_discount_plugin_init');