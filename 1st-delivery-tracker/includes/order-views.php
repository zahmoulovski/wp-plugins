<?php
if (!defined('ABSPATH')) exit;

// Show tracking info on customer order details page (frontend)
add_action('woocommerce_order_details_after_order_table', function($order) {
    $barcode = get_post_meta($order->get_id(), '_first_delivery_barcode', true);
    $token = get_option(FDT_OPTION_NAME);

    if (!$barcode || !$token) return;

    $response = fdt_fetch_order_status($barcode, $token);

    if ($response && !$response['isError']) {
        $item = $response['result']['Items'][0];
        ?>
        <div class="fdt-tracking-box">
            <h3>🚚 Suivi de livraison</h3>
            <div class="fdt-tracking-grid">
                <div class="fdt-tracking-row">
                    <strong>Code de suivi</strong>
                    <span><?php echo esc_html($barcode); ?></span>
                </div>
                <div class="fdt-tracking-row">
                    <strong>État de la commande</strong>
                    <span style="color:green; font-weight:bold"><?php echo esc_html($item['state']); ?></span>
                </div>
            </div>
        </div>
        <?php
    }
});

// Show tracking info in admin order details
add_action('woocommerce_admin_order_data_after_order_details', function($order) {
    $order_id = $order->get_id();
    $barcode = get_post_meta($order_id, '_first_delivery_barcode', true);
    ?>
    <div class="form-field form-field-wide">
        <label for="first_delivery_barcode_input"><strong>First Delivery Barcode</strong></label>
        <input type="text" id="first_delivery_barcode_input"
               name="_first_delivery_barcode"
               value="<?php echo esc_attr($barcode); ?>"
               style="width: 300px;" placeholder="Enter barcode..." />
        <?php if ($barcode) : ?>
            <button type="button" class="button button-secondary" id="fdt_delete_barcode" style="margin-top: 5px;">
                <?php _e('Delete Barcode', 'first-delivery-tracker'); ?>
            </button>
        <?php endif; ?>
        <div id="fdt_tracking_result" style="margin-top:15px;"></div>
    </div>

    <script type="text/javascript">
    jQuery(document).ready(function($){
        let typingTimer;
        const doneTypingInterval = 1500;
        const $input = $('#first_delivery_barcode_input');
        const $result = $('#fdt_tracking_result');
        const $deleteBtn = $('#fdt_delete_barcode');
        const orderId = <?php echo $order_id; ?>;

        function updateTracking(barcode) {
            $result.html('⏳  Sauvegarde et récupération des informations de suivi...');
            $.post(ajaxurl, {
                action: 'fdt_save_and_fetch_tracking',
                order_id: orderId,
                barcode: barcode,
                _ajax_nonce: '<?php echo wp_create_nonce('fdt_live_save_nonce'); ?>'
            }, function(response){
                if (response.success) {
                    $result.html(response.data.html);
                    if (barcode) {
                        $deleteBtn.show();
                    } else {
                        $deleteBtn.hide();
                    }
                } else {
                    $result.html('❌ Error fetching tracking info');
                }
            });
        }

        $input.on('input', function () {
            clearTimeout(typingTimer);
            const barcode = $input.val().trim();
            if (barcode.length > 5) {
                typingTimer = setTimeout(() => updateTracking(barcode), doneTypingInterval);
            }
        });

        $input.on('blur', function () {
            const barcode = $input.val().trim();
            if (barcode.length > 5) {
                updateTracking(barcode);
            }
        });

        $deleteBtn.on('click', function() {
            if (confirm('Are you sure you want to delete this barcode?')) {
                $input.val('');
                updateTracking('');
                $.post(ajaxurl, {
                    action: 'fdt_delete_barcode',
                    order_id: orderId,
                    _ajax_nonce: '<?php echo wp_create_nonce('fdt_delete_barcode_nonce'); ?>'
                });
            }
        });

        // Auto-load on page load if barcode exists
        if ($input.val().trim().length > 5) {
            updateTracking($input.val().trim());
        }
    });
    </script>
    <?php
});

// AJAX handler for saving and fetching tracking info
add_action('wp_ajax_fdt_save_and_fetch_tracking', function(){
    check_ajax_referer('fdt_live_save_nonce');

    $order_id = absint($_POST['order_id']);
    $barcode = sanitize_text_field($_POST['barcode']);
    $token = get_option(FDT_OPTION_NAME);

    if (!$order_id || !$token) {
        wp_send_json_error();
    }

    if (!empty($barcode)) {
        update_post_meta($order_id, '_first_delivery_barcode', $barcode);
        $response = fdt_fetch_order_status($barcode, $token);
    } else {
        delete_post_meta($order_id, '_first_delivery_barcode');
        wp_send_json_success(['html' => '<div style="color:#999;">Barcode deleted</div>']);
        return;
    }

    if (!$response || $response['isError']) {
        wp_send_json_error();
    }

    $item = $response['result']['Items'][0];

    ob_start();
    ?>
    <div class="fdt-tracking-box" style="padding:10px; background:#f1f1f1; border:1px solid #ccc; border-radius:5px;">
        <strong>📦 Code :</strong> <?php echo esc_html($barcode); ?><br>
        <strong>📍 Statut :</strong>
        <span style="color:green; font-weight:bold"><?php echo esc_html($item['state']); ?></span>
    </div>
    <?php
    $html = ob_get_clean();

    wp_send_json_success(['html' => $html]);
});