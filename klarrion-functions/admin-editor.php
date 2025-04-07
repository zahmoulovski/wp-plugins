<?php
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Create a new admin menu item
add_action('admin_menu', 'klarrion_add_admin_menu');

function klarrion_add_admin_menu() {
    add_menu_page(
        'Edit KLARRION Functions', // Page title
        'KLARRION Functions', // Menu title
        'manage_options', // Capability
        'klarrion-functions-editor', // Menu slug
        'klarrion_functions_editor', // Callback function
        'dashicons-editor-code', // Icon
        1 // Position
    );
}

// The callback function that redirects to the plugin editor
function klarrion_functions_editor() {
    $file_path = plugin_dir_path(__FILE__) . 'klarrion-plugin.php'; // Adjust path if needed

    // Redirect to the WordPress plugin editor for this plugin
    $plugin_slug = 'klarrion-functions/klarrion-plugin.php'; // Update this with your plugin's path
    $editor_url = admin_url('plugin-editor.php?file=' . urlencode($plugin_slug) . '&plugin=' . urlencode($plugin_slug));
    
    wp_redirect($editor_url);
    exit; // Always call exit after wp_redirect
}
