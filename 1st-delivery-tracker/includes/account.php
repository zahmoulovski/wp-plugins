<?php
if (!defined('ABSPATH')) exit;

// Add custom endpoint for order tracking
add_action('init', function() {
    add_rewrite_endpoint('track-order', EP_ROOT | EP_PAGES);
});

// Add the tracking menu item to My Account
add_filter('woocommerce_account_menu_items', function($items) {
    $new_items = [];

    foreach ($items as $key => $label) {
        if ($key === 'dashboard') {
            $label = 'Tableau de bord';
        }

        $new_items[$key] = $label;

        if ($key === 'orders') {
            $new_items['track-order'] = '🚚 Suivi de commande';
        }
    }

    return $new_items;
});

// Display the tracking page content
add_action('woocommerce_account_track-order_endpoint', function() {
    echo '<h2>📦 Suivi de votre commande</h2>';
    echo do_shortcode('[first_delivery_tracker]');
});

// Flush rewrite rules on plugin activation
register_activation_hook(__FILE__, function() {
    add_rewrite_endpoint('track-order', EP_ROOT | EP_PAGES);
    flush_rewrite_rules();
});

// Flush rewrite rules on plugin deactivation
register_deactivation_hook(__FILE__, function() {
    flush_rewrite_rules();
});