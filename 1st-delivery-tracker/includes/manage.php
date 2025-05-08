<?php
if (!defined('ABSPATH')) exit;

// Add barcode management page
add_action('admin_menu', function() {
    // Add main menu
    add_menu_page(
        'First Delivery',
        'First Delivery',
        'manage_options',
        'first-delivery-settings',
        'fdt_settings_page',
        'dashicons-car',
        30
    );

    // Add Settings submenu
    add_submenu_page(
        'first-delivery-settings',
        'First Delivery Settings',
        'Settings',
        'manage_options',
        'first-delivery-settings',
        'fdt_settings_page'
    );

    // Add Barcode submenu
    add_submenu_page(
        'first-delivery-settings',
        'First Delivery Barcode',
        'Barcode',
        'manage_options',
        'first-delivery-barcode',
        'fdt_barcode_page'
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

// Barcode page
function fdt_barcode_page() {
    global $wpdb;
    
    // Handle bulk actions
    if (isset($_POST['bulk_action']) && check_admin_referer('fdt_bulk_action', 'fdt_bulk_nonce')) {
        if ($_POST['bulk_action'] === 'delete' && !empty($_POST['barcodes'])) {
            $table_name = $wpdb->prefix . 'fdt_barcodes';
            $barcodes = array_map('sanitize_text_field', $_POST['barcodes']);
            
            // Delete from custom table
            $wpdb->query(
                $wpdb->prepare(
                    "DELETE FROM $table_name WHERE barcode IN (" . implode(',', array_fill(0, count($barcodes), '%s')) . ")",
                    $barcodes
                )
            );
            
            // Show success message
            echo '<div class="notice notice-success is-dismissible"><p>Selected barcodes have been deleted successfully!</p></div>';
        }
    }

    // Handle form submission
    if (isset($_POST['add_barcode']) && check_admin_referer('fdt_add_barcode')) {
        $barcode = sanitize_text_field($_POST['barcode']);
        $email = sanitize_email($_POST['email']);
        
        if (!empty($barcode) && !empty($email)) {
            // Insert into the custom table
            $table_name = $wpdb->prefix . 'fdt_barcodes';
            $result = $wpdb->insert(
                $table_name,
                array(
                    'barcode' => $barcode,
                    'customer_email' => $email,
                    'status' => '-',
                    'created_at' => current_time('mysql')
                ),
                array('%s', '%s', '%s', '%s')
            );
            
            if ($result !== false) {
                // Send tracking email
                fdt_send_tracking_email_to_customer(null, $barcode, $email);
                
                // Show success message
                echo '<div class="notice notice-success is-dismissible"><p>Barcode added successfully and notification email sent!</p></div>';
            } else {
                echo '<div class="notice notice-error is-dismissible"><p>Error adding barcode. It might be a duplicate.</p></div>';
            }
        }
    }
    
    // Query to get all barcodes
    $barcodes_query = "
        SELECT 
            pm.meta_id,
            pm.post_id,
            pm.meta_value as barcode,
            p.post_status,
            COALESCE(
                (SELECT meta_value FROM {$wpdb->prefix}postmeta WHERE post_id = pm.post_id AND meta_key = '_billing_email' LIMIT 1),
                ''
            ) as customer_email,
            p.post_date as created_at
        FROM {$wpdb->prefix}postmeta pm
        LEFT JOIN {$wpdb->prefix}posts p ON p.ID = pm.post_id
        WHERE pm.meta_key = '_first_delivery_barcode'
        UNION ALL
        SELECT 
            id as meta_id,
            NULL as post_id,
            barcode,
            status as post_status,
            customer_email,
            created_at
        FROM {$wpdb->prefix}fdt_barcodes
        ORDER BY created_at DESC
    ";
    
    $barcodes = $wpdb->get_results($barcodes_query);
    
    ?>
    <div class="wrap">
        <h1>First Delivery Barcode Management</h1>
        
        <!-- Add new barcode form -->
        <div class="fdt-add-form" style="margin-bottom: 20px; padding: 15px; background: #fff; border: 1px solid #ccd0d4; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
            <h2 style="margin-top: 0;">Add New Barcode</h2>
            <form method="post" action="">
                <?php wp_nonce_field('fdt_add_barcode'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="barcode">Barcode</label></th>
                        <td><input type="text" name="barcode" id="barcode" class="regular-text" required></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="email">Customer Email</label></th>
                        <td><input type="email" name="email" id="email" class="regular-text" required></td>
                    </tr>
                </table>
                <p class="submit">
                    <input type="submit" name="add_barcode" class="button button-primary" value="Add Barcode">
                </p>
            </form>
        </div>

        <!-- Barcodes list table -->
        <form method="post" action="">
            <?php wp_nonce_field('fdt_bulk_action', 'fdt_bulk_nonce'); ?>
            <div class="tablenav top">
                <div class="alignleft actions bulkactions">
                    <select name="bulk_action">
                        <option value="-1">Bulk Actions</option>
                        <option value="delete">Delete</option>
                    </select>
                    <input type="submit" class="button action" value="Apply">
                </div>
            </div>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <td class="manage-column column-cb check-column">
                            <input type="checkbox" id="cb-select-all-1">
                        </td>
                        <th>Barcode</th>
                        <th>Customer Email</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($barcodes): ?>
                        <?php foreach ($barcodes as $barcode): ?>
                            <tr>
                                <th scope="row" class="check-column">
                                    <input type="checkbox" name="barcodes[]" value="<?php echo esc_attr($barcode->barcode); ?>">
                                </th>
                                <td><?php echo esc_html($barcode->barcode); ?></td>
                                <td>
                                    <?php if ($barcode->post_id): ?>
                                        <a href="<?php echo admin_url('post.php?post=' . $barcode->post_id . '&action=edit'); ?>">
                                            #<?php echo esc_html($barcode->post_id); ?>
                                        </a>
                                    <?php else: ?>
                                        —
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($barcode->customer_email); ?></td>
                                <td>
                                    <?php 
                                    if ($barcode->post_status) {
                                        echo esc_html(wc_get_order_status_name($barcode->post_status));
                                    } else {
                                        echo '—';
                                    }
                                    ?>
                                </td>
                                <td><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($barcode->created_at))); ?></td>
                                <td>
                                    <a href="<?php echo esc_url(site_url('/suivi-de-commande/?barcode=' . urlencode($barcode->barcode))); ?>" 
                                       class="button button-small" 
                                       target="_blank">Track</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="6">No barcodes found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </form>
    </div>
    <script type="text/javascript">
    jQuery(document).ready(function($) {
        // Handle select all checkbox
        $('#cb-select-all-1').on('change', function() {
            $('input[name="barcodes[]"]').prop('checked', $(this).prop('checked'));
        });
    });
    </script>
    <?php
}

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
        echo $barcode ? esc_html($barcode) : '*';
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


// Add dashboard widget
add_action('wp_dashboard_setup', function() {
    wp_add_dashboard_widget(
        'fdt_dashboard_widget',
        'First Delivery Tracking',
        'fdt_dashboard_widget_content'
    );
});

// Dashboard widget content
function fdt_dashboard_widget_content() {
    global $wpdb;
    
    // Get recent barcodes (limit to 5)
    $barcodes_query = "
        SELECT 
            pm.meta_id,
            pm.post_id,
            pm.meta_value as barcode,
            p.post_status,
            COALESCE(
                (SELECT meta_value FROM {$wpdb->prefix}postmeta WHERE post_id = pm.post_id AND meta_key = '_billing_email' LIMIT 1),
                ''
            ) as customer_email,
            p.post_date as created_at
        FROM {$wpdb->prefix}postmeta pm
        LEFT JOIN {$wpdb->prefix}posts p ON p.ID = pm.post_id
        WHERE pm.meta_key = '_first_delivery_barcode'
        UNION ALL
        SELECT 
            id as meta_id,
            NULL as post_id,
            barcode,
            status as post_status,
            customer_email,
            created_at
        FROM {$wpdb->prefix}fdt_barcodes
        ORDER BY created_at DESC
        LIMIT 5
    ";
    
    $barcodes = $wpdb->get_results($barcodes_query);
    ?>
    
    <div class="fdt-dashboard-widget">
        <div class="fdt-widget-form" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px;">
            <form method="post" action="">
                <?php wp_nonce_field('fdt_widget_add_barcode'); ?>
                <div style="margin-bottom: 10px;">
                    <label for="widget_barcode"><strong>Barcode:</strong></label>
                    <input type="text" name="barcode" id="widget_barcode" class="widefat" required>
                </div>
                <div style="margin-bottom: 10px;">
                    <label for="widget_email"><strong>Customer Email:</strong></label>
                    <input type="email" name="email" id="widget_email" class="widefat" required>
                </div>
                <div style="text-align: right;">
                    <input type="submit" name="widget_add_barcode" class="button button-primary" value="Add Barcode">
                </div>
            </form>
        </div>
        <table class="widefat">
            <thead>
                <tr>
                    <th>Barcode</th>
                    <th>Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php if ($barcodes): ?>
                    <?php foreach ($barcodes as $barcode): ?>
                        <tr>
                            <td><?php echo esc_html($barcode->barcode); ?></td>
                            <td>
                                <?php if ($barcode->post_id): ?>
                                    <a href="<?php echo admin_url('post.php?post=' . $barcode->post_id . '&action=edit'); ?>">
                                        #<?php echo esc_html($barcode->post_id); ?>
                                    </a>
                                <?php else: ?>
                                    —
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php 
                                if ($barcode->post_status) {
                                    echo esc_html(wc_get_order_status_name($barcode->post_status));
                                } else {
                                    echo '—';
                                }
                                ?>
                            </td>
                            <td>
                                <a href="<?php echo esc_url(site_url('/suivi-de-commande/?barcode=' . urlencode($barcode->barcode))); ?>" 
                                   class="button button-small" 
                                   target="_blank">Track</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                <?php else: ?>
                    <tr>
                        <td colspan="4">No recent barcodes found.</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
        
        <p class="fdt-widget-footer" style="margin-top: 10px; text-align: right;">
            <a href="<?php echo admin_url('admin.php?page=first-delivery-barcode'); ?>" class="button">
                View All Barcodes
            </a>
        </p>
    </div>
    <?php
}

// Add some basic styles for the widget
add_action('admin_head', function() {
    ?>
    <style>
        .fdt-dashboard-widget table {
            margin-top: 10px;
        }
        .fdt-dashboard-widget td, 
        .fdt-dashboard-widget th {
            padding: 8px;
        }
        .fdt-dashboard-widget .button-small {
            padding: 0 5px;
            font-size: 11px;
            min-height: 20px;
            line-height: 18px;
        }
    </style>
    <?php
});