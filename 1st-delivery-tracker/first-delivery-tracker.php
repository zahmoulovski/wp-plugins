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
});

// Admin menu
add_action('admin_menu', function() {
    add_options_page(
        'First Delivery Settings',
        'First Delivery',
        'manage_options',
        'first-delivery-settings',
        'fdt_settings_page'
    );
});

// Settings page
function fdt_settings_page() {
    ?>
    <div class="wrap">
        <h1>First Delivery API Settings</h1>
        <form method="post" action="options.php">
            <?php
                settings_fields('fdt_settings_group');
                do_settings_sections('first-delivery-settings');
                submit_button();
            ?>
        </form>
    </div>
    <?php
}

// Register settings
add_action('admin_init', function() {
    register_setting('fdt_settings_group', FDT_OPTION_NAME);
    register_setting('fdt_settings_group', FDT_WHATSAPP_NUMBER);
    register_setting('fdt_settings_group', FDT_EMAIL_FROM);

    add_settings_section('fdt_section_main', 'API Configuration', null, 'first-delivery-settings');

    add_settings_field(FDT_OPTION_NAME, 'API Token', function() {
        $value = get_option(FDT_OPTION_NAME, '');
        echo '<input type="text" name="' . FDT_OPTION_NAME . '" value="' . esc_attr($value) . '" class="regular-text" />';
    }, 'first-delivery-settings', 'fdt_section_main');

    add_settings_field(FDT_WHATSAPP_NUMBER, 'WhatsApp Number', function() {
        $value = get_option(FDT_WHATSAPP_NUMBER, '');
        echo '<input type="text" name="' . FDT_WHATSAPP_NUMBER . '" value="' . esc_attr($value) . '" class="regular-text" />';
    }, 'first-delivery-settings', 'fdt_section_main');

    add_settings_field(FDT_EMAIL_FROM, 'From Email Address', function() {
        $value = get_option(FDT_EMAIL_FROM, '');
        echo '<input type="email" name="' . FDT_EMAIL_FROM . '" value="' . esc_attr($value) . '" class="regular-text" />';
    }, 'first-delivery-settings', 'fdt_section_main');
});
