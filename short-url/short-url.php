<?php
/**
 * Plugin Name: Short URL Manager
 * Description: A plugin to create, edit, and manage short URLs directly on klarrion.com.
 * Version: 1.2
 * Author: Med Yassine Zahmoul
 */

if (!defined('ABSPATH')) exit; // Exit if accessed directly

// Include necessary files
require_once plugin_dir_path(__FILE__) . 'short-url-admin.php';
require_once plugin_dir_path(__FILE__) . 'short-url-crud.php';

// Create database table on activation
function short_url_create_table() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'short_urls';
    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id INT AUTO_INCREMENT PRIMARY KEY,
        short_code VARCHAR(8) UNIQUE NOT NULL,
        long_url TEXT NOT NULL
    ) $charset_collate;";

    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'short_url_create_table');

// Add rewrite rules for short URLs
function short_url_rewrite_rules() {
    add_rewrite_rule('^([a-zA-Z0-9]{8})/?$', 'index.php?short_url_code=$matches[1]', 'top');
}
add_action('init', 'short_url_rewrite_rules');

function short_url_query_vars($vars) {
    $vars[] = 'short_url_code';
    return $vars;
}
add_filter('query_vars', 'short_url_query_vars');


// Flush rewrite rules on plugin activation
function short_url_plugin_activation() {
    short_url_rewrite_rules();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'short_url_plugin_activation');


// Flush rewrite rules on plugin deactivation
function short_url_deactivation() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'short_url_deactivation');

// Add a "Short URL" link next to the Deactivate link in the plugin list
function short_url_add_action_link($links) {
    $admin_page_url = admin_url('admin.php?page=short-url-manager');
    $custom_link = '<a href="' . esc_url($admin_page_url) . '">Short URL</a>';
    array_unshift($links, $custom_link); // Add the link to the beginning of the links array
    return $links;
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'short_url_add_action_link');

// Handle the redirect for short URLs
function short_url_redirect() {
    $short_url_code = get_query_var('short_url_code');
    
    if ($short_url_code) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'short_urls';

        // Query to find the original long URL
        $url = $wpdb->get_row($wpdb->prepare("SELECT long_url FROM $table_name WHERE short_code = %s", $short_url_code));

        // If the URL exists, redirect to it
        if ($url && isset($url->long_url)) {
            wp_redirect($url->long_url, 301); // Permanent redirect
            exit;
        } else {
            // If not found, show 404
            wp_redirect(home_url('/404'), 404);
            exit;
        }
    }
}
add_action('template_redirect', 'short_url_redirect');
