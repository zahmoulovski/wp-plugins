<?php
if (!defined('ABSPATH')) exit;

function fdt_send_tracking_email_to_customer($order_id, $barcode) {
    // Debug log
    error_log("[FDT] Attempting to send tracking email for order #{$order_id} with barcode {$barcode}");
    
    // Get the order object
    $order = wc_get_order($order_id);
    if (!$order) {
        error_log("[FDT] Error: Order #{$order_id} not found");
        return false;
    }

    // Get recipient email
    $to = $order->get_billing_email();
    if (empty($to)) {
        error_log("[FDT] Error: No billing email for order #{$order_id}");
        return false;
    }

    // Get configured email and WhatsApp number
    $from_email = get_option(FDT_EMAIL_FROM, 'contact@klarrion.com');
    $whatsapp_number = get_option(FDT_WHATSAPP_NUMBER, '21698134873');

    // Prepare email content
    $subject = '📦 Votre numéro de suivi est disponible – Commande #' . $order->get_order_number();
    $tracking_url = site_url('/suivi-de-commande/?barcode=' . urlencode($barcode));
    $order_tracking_url = site_url('/suivi-de-commande/?order_id=' . $order_id);
    

    // Initialize WooCommerce mailer
    $mailer = WC()->mailer();
    
    // Get WooCommerce email template path
    $template_path = WC()->template_path();
    
    // Prepare email content with WooCommerce template
    ob_start();
    
    // Load WooCommerce email template header
    wc_get_template(
        'emails/email-header.php',
        array(
            'email_heading' => $subject,
            'order' => $order
        ),
        '',
        WC()->plugin_path() . '/templates/'
    );
    ?>
    <p>Bonjour <?php echo esc_html($order->get_billing_first_name()); ?>,</p>
    <p>Nous vous informons que votre commande <strong>#<?php echo $order->get_order_number(); ?></strong> est transférer à <strong>FIRST DELIVERY</strong> pour livraison, ci après votre numéro de suivi.</p>
    <ul>
        <li><strong>Commande :</strong> #<?php echo $order->get_order_number(); ?></li>
        <li><strong>Total :</strong> <?php echo $order->get_formatted_order_total(); ?></li>
        <li><strong>Numéro de suivi :</strong> <?php echo esc_html($barcode); ?></li>
    </ul>
    <p>👉 Vous pouvez traquer votre commande avec :<br>
    • Votre numéro de commande : <a href="<?php echo esc_url($order_tracking_url); ?>"><?php echo esc_html($order_tracking_url); ?></a><br>
    • Votre code-barres : <a href="<?php echo esc_url($tracking_url); ?>"><?php echo esc_html($tracking_url); ?></a></p>
    <div style="text-align: center; margin: 15px 0;">
        <a href="https://api.whatsapp.com/send?phone=<?php echo esc_attr($whatsapp_number); ?>" style="display: inline-block;">
            <img src="<?php echo esc_url(FDT_PLUGIN_URL . 'assets/whatsapp-button.png'); ?>" alt="Contactez-nous sur WhatsApp" style="max-width: 200px; height: auto;">
        </a>
    </div>
    <p>Merci pour votre achat,<br>L'équipe KLARRION</p>
    <?php
    
    // Load WooCommerce email template footer
    wc_get_template(
        'emails/email-footer.php',
        array(),
        '',
        WC()->plugin_path() . '/templates/'
    );
    
    $message = ob_get_clean();

    // Create a new instance of WC_Email
    $wc_email = new WC_Email();
    
    // Apply styles
    $message = $wc_email->style_inline($message);

    // Create email headers
    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: KLARRION <' . $from_email . '>'
    );

    try {
        error_log("[FDT] Attempting to send email to: {$to}");
        
        // Send the email
        $sent = wp_mail($to, $subject, $message, $headers);
        
        if ($sent) {
            error_log("[FDT] Email successfully sent for order #{$order_id}");
            return true;
        } else {
            error_log("[FDT] Failed to send email for order #{$order_id}");
            return false;
        }
    } catch (Exception $e) {
        error_log("[FDT] Email sending error: " . $e->getMessage());
        return false;
    }
}

// Debug email failures
add_action('wp_mail_failed', function($error) {
    $message = "[FDT] Email failed: " . $error->get_error_message();
    
    // Log additional debugging info
    if (isset($error->error_data['wp_mail_failed'])) {
        $data = $error->error_data['wp_mail_failed'];
        $message .= "\nTo: " . (is_array($data['to']) ? implode(', ', $data['to']) : $data['to']);
        $message .= "\nSubject: " . $data['subject'];
    }
    
    error_log($message);
});

// Test email functionality
add_action('admin_init', function() {
    if (isset($_GET['test_fdt_email']) && current_user_can('manage_options')) {
        $order_id = intval($_GET['order_id']);
        $barcode = sanitize_text_field($_GET['barcode']);
        
        if ($order_id && $barcode) {
            error_log("[FDT] Running manual email test for order #{$order_id}");
            $result = fdt_send_tracking_email_to_customer($order_id, $barcode);
            wp_die('Test email ' . ($result ? 'sent successfully' : 'failed') . '. Check error logs for details.');
        }
    }
});