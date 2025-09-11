<?php
/**
 * Plugin Name: Klarrion QR Stats
 * Description: Track QR page scans and link clicks with stats in the WP dashboard.
 * Version: 1.0
 * Author: KLARRION
 */

if (!defined('ABSPATH')) exit;

// 🔹 Count visits to the QR page
function klarrion_qr_page_view() {
    if (is_page('qr')) {
        $count = (int) get_option('klarrion_qr_views', 0);
        update_option('klarrion_qr_views', $count + 1);
    }
}
add_action('wp_head', 'klarrion_qr_page_view');

// 🔹 Trackable links shortcode [qr_link url="" id=""]Texte[/qr_link]
function klarrion_qr_click($atts, $content = null) {
    $atts = shortcode_atts(array(
        'url' => '#',
        'id'  => 'link1'
    ), $atts);

    $link_id = 'klarrion_qr_clicks_' . sanitize_key($atts['id']);
    $count   = (int) get_option($link_id, 0);

    // If clicked
    if (isset($_GET['qr_click']) && $_GET['qr_click'] === $atts['id']) {
        update_option($link_id, $count + 1);
        wp_redirect($atts['url']);
        exit;
    }

    // Display link
    return '<a href="?qr_click='.esc_attr($atts['id']).'">'.do_shortcode($content).'</a>';
}
add_shortcode('qr_link', 'klarrion_qr_click');

// 🔹 Admin Page for Stats
function klarrion_qr_stats_menu() {
    add_menu_page(
        'QR Stats',
        'QR Stats',
        'manage_options',
        'klarrion-qr-stats',
        'klarrion_qr_stats_page',
        'dashicons-chart-bar',
        25
    );
}
add_action('admin_menu', 'klarrion_qr_stats_menu');

// 🔹 Display Stats
function klarrion_qr_stats_page() {
    echo '<div class="wrap"><h1>📊 Klarrion QR Stats</h1>';

    // Page views
    $views = (int) get_option('klarrion_qr_views', 0);
    echo '<p><strong>Total scans (page loads):</strong> ' . $views . '</p>';

    echo '<h2>Tracked Links</h2><table class="widefat"><thead><tr><th>Link ID</th><th>Clicks</th></tr></thead><tbody>';

    global $wpdb;
    $options = $wpdb->get_results("SELECT option_name, option_value FROM $wpdb->options WHERE option_name LIKE 'klarrion_qr_clicks_%'");

    if ($options) {
        foreach ($options as $opt) {
            $id = str_replace('klarrion_qr_clicks_', '', $opt->option_name);
            echo '<tr><td>' . esc_html($id) . '</td><td>' . (int) $opt->option_value . '</td></tr>';
        }
    } else {
        echo '<tr><td colspan="2">No clicks tracked yet.</td></tr>';
    }

    echo '</tbody></table></div>';
}
