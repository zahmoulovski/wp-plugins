<?php
/**
 * Plugin Name: First Delivery Tracker
 * Description: Track orders via First Delivery API.
 * Author: Med Yassine Zahmoul
 * Version: 2.6
 * Text Domain: first-delivery-tracker
 */

if (!defined('ABSPATH')) exit;

// Ensure WooCommerce is active before proceeding
if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    deactivate_plugins(plugin_basename(__FILE__));
    wp_die('This plugin requires WooCommerce to be installed and active.');
}

// Define constants
define('FDT_OPTION_NAME', 'fdt_api_token');
define('FDT_WHATSAPP_NUMBER', 'fdt_whatsapp_number');
define('FDT_EMAIL_FROM', 'fdt_email_from');
define('FDT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FDT_PLUGIN_URL', plugin_dir_url(__FILE__));

// Load required files
require_once FDT_PLUGIN_DIR . 'includes/account.php';
require_once FDT_PLUGIN_DIR . 'includes/db.php';
require_once FDT_PLUGIN_DIR . 'includes/email.php';
require_once FDT_PLUGIN_DIR . 'includes/tracking.php';
require_once FDT_PLUGIN_DIR . 'includes/order-views.php';
require_once FDT_PLUGIN_DIR . 'includes/manage.php';

// Create plugin assets directory and copy WhatsApp image on activation
register_activation_hook(__FILE__, function() {
    $assets_dir = FDT_PLUGIN_DIR . 'assets';
    if (!file_exists($assets_dir)) {
        mkdir($assets_dir, 0755, true);
    }

    // Copy WhatsApp button image if it doesn't exist
    $whatsapp_image = $assets_dir . '/whatsapp-button.png';
    if (!file_exists($whatsapp_image)) {
        copy('https://klarrion.com/signature/whatsapp-button.png', $whatsapp_image);
    }
    
    // Create barcodes table
    fdt_create_barcodes_table();
});