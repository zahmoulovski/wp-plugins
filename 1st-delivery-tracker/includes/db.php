<?php
if (!defined('ABSPATH')) exit;

// Save the barcode with email trigger
add_action('woocommerce_process_shop_order_meta', function($order_id) {
    if (isset($_POST['_first_delivery_barcode'])) {
        $new_barcode = sanitize_text_field($_POST['_first_delivery_barcode']);
        $old_barcode = get_post_meta($order_id, '_first_delivery_barcode', true);
        
        update_post_meta($order_id, '_first_delivery_barcode', $new_barcode);
        
        // Only send email if barcode is new or changed
        if ($new_barcode !== $old_barcode) {
            fdt_send_tracking_email_to_customer($order_id, $new_barcode);
        }
    }
}, 20, 1);

// Backup hook for programmatic updates
add_action('updated_post_meta', function($meta_id, $post_id, $meta_key, $meta_value) {
    if ($meta_key === '_first_delivery_barcode' && get_post_type($post_id) === 'shop_order') {
        $order = wc_get_order($post_id);
        if ($order) {
            // Skip if this was already handled by woocommerce_process_shop_order_meta
            if (did_action('woocommerce_process_shop_order_meta') > 0) {
                return;
            }
            fdt_send_tracking_email_to_customer($post_id, $meta_value);
        }
    }
}, 10, 4);

// Add barcode column to orders list
add_filter('manage_edit-shop_order_columns', function($columns) {
    $new_columns = [];
    foreach ($columns as $key => $name) {
        $new_columns[$key] = $name;
        if ($key === 'shipping_address') {
            $new_columns['fdt_barcode'] = __('Tracking Barcode', 'first-delivery-tracker');
        }
    }
    return $new_columns;
}, 20);

// Display barcode in orders list
add_action('manage_shop_order_posts_custom_column', function($column) {
    global $post;
    if ($column === 'fdt_barcode') {
        $barcode = get_post_meta($post->ID, '_first_delivery_barcode', true);
        echo $barcode ? esc_html($barcode) : '—';
    }
}, 10, 2);

// Make barcode column sortable
add_filter('manage_edit-shop_order_sortable_columns', function($columns) {
    $columns['fdt_barcode'] = '_first_delivery_barcode';
    return $columns;
});

// Handle barcode deletion
add_action('wp_ajax_fdt_delete_barcode', function() {
    check_ajax_referer('fdt_delete_barcode_nonce');
    
    $order_id = absint($_POST['order_id']);
    if (!$order_id) {
        wp_send_json_error();
    }
    
    delete_post_meta($order_id, '_first_delivery_barcode');
    wp_send_json_success();
});

// Handle barcode updates and trigger email sending
function fdt_handle_barcode_update($order_id, $new_barcode) {
    error_log("[FDT] Handling barcode update for order #{$order_id}");
    
    if (empty($new_barcode)) {
        error_log("[FDT] Empty barcode provided for order #{$order_id}");
        return;
    }

    $old_barcode = get_post_meta($order_id, '_first_delivery_barcode', true);
    
    // Only proceed if the barcode is new or different
    if ($new_barcode !== $old_barcode) {
        error_log("[FDT] New barcode detected: {$new_barcode} (old: {$old_barcode})");
        
        // Update the meta
        update_post_meta($order_id, '_first_delivery_barcode', $new_barcode);
        
        // Send email immediately
        fdt_send_tracking_email_to_customer($order_id, $new_barcode);
    } else {
        error_log("[FDT] Barcode unchanged for order #{$order_id}");
    }
}

// Hook for manual barcode updates in admin
add_action('woocommerce_process_shop_order_meta', function($order_id) {
    if (isset($_POST['_first_delivery_barcode'])) {
        $new_barcode = sanitize_text_field($_POST['_first_delivery_barcode']);
        fdt_handle_barcode_update($order_id, $new_barcode);
    }
}, 20, 1);

// Hook for AJAX barcode updates
add_action('wp_ajax_fdt_save_and_fetch_tracking', function() {
    check_ajax_referer('fdt_live_save_nonce');
    
    $order_id = absint($_POST['order_id']);
    $barcode = sanitize_text_field($_POST['barcode']);
    
    if (!empty($barcode)) {
        fdt_handle_barcode_update($order_id, $barcode);
    }
});

// Hook for programmatic updates
add_action('updated_post_meta', function($meta_id, $post_id, $meta_key, $meta_value) {
    if ($meta_key === '_first_delivery_barcode' && get_post_type($post_id) === 'shop_order') {
        // Avoid duplicate emails if already handled by other hooks
        if (!did_action('woocommerce_process_shop_order_meta')) {
            fdt_handle_barcode_update($post_id, $meta_value);
        }
    }
}, 10, 4);