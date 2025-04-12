<?php
/**
 * Plugin Name: First Delivery Tracker
 * Description: Track orders via First Delivery API.
 * Author: Med Yassine Zahmoul
 * Version: 1.1
 * Text Domain: first-delivery-tracker
 */

if (!defined('ABSPATH')) exit;

define('FDT_OPTION_NAME', 'fdt_api_token');

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
    add_settings_section('fdt_main_section', 'API Configuration', null, 'first-delivery-settings');
    add_settings_field(
        'fdt_api_token',
        'API Token',
        'fdt_api_token_field',
        'first-delivery-settings',
        'fdt_main_section'
    );
});

function fdt_api_token_field() {
    $token = esc_attr(get_option(FDT_OPTION_NAME));
    echo "<input type='text' name='" . FDT_OPTION_NAME . "' value='$token' style='width: 400px;' />";
}

// Shortcode
add_shortcode('first_delivery_tracker', function() {
    ob_start();
    ?>
    <form method="post">
        <label for="fdt_barcode">Entrez le code-barres de la commande:</label>
        <input type="text" name="fdt_barcode" id="fdt_barcode" value="<?php echo isset($_GET['bar_code']) ? esc_attr($_GET['bar_code']) : (isset($_GET['order_id']) ? esc_attr($_GET['order_id']) : ''); ?>" required />
        <input type="submit" value="Suivi de votre commande" />
    </form>
    <?php

    if (($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['fdt_barcode'])) || isset($_GET['order_id']) || isset($_GET['bar_code'])) {
        $input = '';
        
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['fdt_barcode'])) {
            $input = sanitize_text_field($_POST['fdt_barcode']);
        } elseif (isset($_GET['bar_code'])) {
            $input = sanitize_text_field($_GET['bar_code']);
        } elseif (isset($_GET['order_id'])) {
            $input = sanitize_text_field($_GET['order_id']);
        }
        
        $barcode = $input;

        // If it's a numeric WooCommerce Order ID, use the saved barcode
        if (is_numeric($input)) {
            $order = wc_get_order($input);
            if ($order) {
                $saved_barcode = get_post_meta($order->get_id(), '_first_delivery_barcode', true);
                if ($saved_barcode) {
                    $barcode = $saved_barcode;
                }
            }
        }

        $token = get_option(FDT_OPTION_NAME);
        $response = fdt_fetch_order_status($barcode, $token);

        if ($response && !$response['isError']) {
            $data = $response['result'];

            echo "<div style='margin-top:20px; padding:20px; border:1px solid #ccc; border-radius:10px; max-width:50%; background:#f9f9f9;margin: 0 auto'>";
            echo "<h3 style='margin-top:0;'>🚚 Résultat du suivi de la commande</h3>";
            echo "<p><strong>Barcode:</strong> " . esc_html($data['barCode']) . "</p>";
            echo "<p><strong>Status:</strong> <span style='color:green; font-weight:bold'>" . esc_html($data['state']) . "</span></p>";
            echo "</div>";
        }
    }

    return ob_get_clean();
});

// API call
function fdt_fetch_order_status($barcode, $token) {
    $url = 'https://www.firstdeliverygroup.com/api/v2/etat';
    $args = [
        'headers' => [
            'Authorization' => 'Bearer ' . $token,
            'Content-Type'  => 'application/json',
        ],
        'body' => json_encode(['barCode' => $barcode]),
        'timeout' => 30,
    ];

    $response = wp_remote_post($url, $args);

    if (is_wp_error($response)) {
        return null;
    }

    $body = wp_remote_retrieve_body($response);
    return json_decode($body, true);
}

// Save the barcode
add_action('woocommerce_process_shop_order_meta', function($order_id){
    if (isset($_POST['_first_delivery_barcode'])) {
        update_post_meta($order_id, '_first_delivery_barcode', sanitize_text_field($_POST['_first_delivery_barcode']));
    }
});

// Show tracking info on order details page
add_action('woocommerce_order_details_after_order_table', function($order){
    $barcode = get_post_meta($order->get_id(), '_first_delivery_barcode', true);
    $token = get_option('fdt_api_token');

    if (!$barcode || !$token) return;

    if (!function_exists('fdt_fetch_order_status')) return; // Just in case

    $response = fdt_fetch_order_status($barcode, $token);

    if ($response && !$response['isError']) {
        $data = $response['result'];
        echo "<div style='margin-top:30px;margin-bottom:30px; padding:20px; border:1px solid #ccc; background:#f7f7f7; border-radius:10px;'>";
        echo "<h3>🚚 Suivi de livraison</h3>";
        echo "<p><strong>Code de suivi :</strong> " . esc_html($data['barCode']) . "</p>";
        echo "<p><strong>État de la commande :</strong> <span style='color:green; font-weight:bold'>" . esc_html($data['state']) . "</span></p>";
        echo "</div>";
    }
});

add_action('woocommerce_admin_order_data_after_order_details', function($order){
    $order_id = $order->get_id();
    $barcode = get_post_meta($order_id, '_first_delivery_barcode', true);
    ?>
    <div class="form-field form-field-wide">
        <label for="first_delivery_barcode_input"><strong>First Delivery Barcode</strong></label>
        <input type="text" id="first_delivery_barcode_input"
               value="<?php echo esc_attr($barcode); ?>"
               style="width: 300px;" placeholder="Enter barcode..." />
        <div id="fdt_tracking_result" style="margin-top:15px;"></div>
    </div>

    <script type="text/javascript">
    jQuery(document).ready(function($){
        let typingTimer;
        const doneTypingInterval = 1500;
        const $input = $('#first_delivery_barcode_input');
        const $result = $('#fdt_tracking_result');
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

        // Auto-load on page load if barcode exists
        if ($input.val().trim().length > 5) {
            updateTracking($input.val().trim());
        }
    });
    </script>
    <?php
});

add_action('wp_ajax_fdt_save_and_fetch_tracking', function(){
    check_ajax_referer('fdt_live_save_nonce');

    $order_id = absint($_POST['order_id']);
    $barcode = sanitize_text_field($_POST['barcode']);
    $token = get_option('fdt_api_token');

    if (!$order_id || !$barcode || !$token || !function_exists('fdt_fetch_order_status')) {
        wp_send_json_error();
    }

    update_post_meta($order_id, '_first_delivery_barcode', $barcode);
    $response = fdt_fetch_order_status($barcode, $token);

    if (!$response || $response['isError']) {
        wp_send_json_error();
    }

    $data = $response['result'];

    ob_start();
    ?>
    <div style="padding:10px; background:#f1f1f1; border:1px solid #ccc; border-radius:5px;">
        <strong>📦 Code :</strong> <?php echo esc_html($data['barCode']); ?><br>
        <strong>📍 Statut :</strong>
        <span style="color:green; font-weight:bold"><?php echo esc_html($data['state']); ?></span>
    </div>
    <?php
    $html = ob_get_clean();

    wp_send_json_success(['html' => $html]);
});

add_action('init', function() {
    add_rewrite_endpoint('track-order', EP_ROOT | EP_PAGES);
});

add_filter('woocommerce_account_menu_items', function($items) {
    $new_items = [];

    foreach ($items as $key => $label) {
        // 🛠 Replace dashboard icon
        if ($key === 'dashboard') {
            $label = 'Tableau de bord';
        }

        $new_items[$key] = $label;

        // 🎯 Inject "Suivi de commande" just after "orders" (commandes)
        if ($key === 'orders') {
            $new_items['track-order'] = '🚚 Suivi de commande';
        }
    }

    return $new_items;
});

add_action('woocommerce_account_track-order_endpoint', function() {
    echo '<h2>📦 Suivi de votre commande</h2>';
    echo do_shortcode('[first_delivery_tracker]');
});

// mailing 
add_action('updated_post_meta', function($meta_id, $post_id, $meta_key, $meta_value){
    // Trigger only when the barcode is updated
    if ($meta_key === '_first_delivery_barcode') {
        // Send custom email
        fdt_send_tracking_email_to_customer($post_id, $meta_value);
    }
}, 10, 4);

function fdt_send_tracking_email_to_customer($order_id, $barcode) {
    $order = wc_get_order($order_id);
    if (!$order || !$barcode) return;

    $to = $order->get_billing_email();
    $subject = '📦 Votre numéro de suivi est disponible – Commande #' . $order->get_order_number();

    // Tracking link (using our my-account endpoint)
    $tracking_url = site_url('/mon-compte/track-order/?bar_code=' . urlencode($barcode));

    ob_start();
    ?>
    <p>Bonjour <?php echo esc_html($order->get_billing_first_name()); ?>,</p>

    <p>Nous vous informons que votre commande <strong>#<?php echo $order->get_order_number(); ?></strong> est en cours de traitement et un numéro de suivi vient d'être ajouté.</p>

    <ul>
        <li><strong>Commande :</strong> #<?php echo $order->get_order_number(); ?></li>
        <li><strong>Total :</strong> <?php echo $order->get_formatted_order_total(); ?></li>
        <li><strong>Numéro de suivi :</strong> <?php echo esc_html($barcode); ?></li>
    </ul>

    <p>👉 Vous pouvez suivre votre commande ici :<br>
    <a href="<?php echo esc_url($tracking_url); ?>"><?php echo esc_html($tracking_url); ?></a></p>
    
    <div style="text-align: center; margin: 15px 0;">
        <a href="https://api.whatsapp.com/send?phone=21698134873" style="display: inline-block;">
            <img src="https://klarrion.com/signature/whatsapp-button.png" alt="Contactez-nous sur WhatsApp" style="max-width: 200px; height: auto;">
        </a>
    </div>

    <p>Merci pour votre achat,<br>L'équipe Klarrion</p>
    <?php
    $message = ob_get_clean();

    // WooCommerce mailer
    $mailer = WC()->mailer();
    $email = $mailer->wrap_message($subject, $message);

    $headers = ["Content-Type: text/html; charset=UTF-8"];

    wp_mail($to, $subject, $email, $headers);
}