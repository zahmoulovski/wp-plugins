<?php
if (!defined('ABSPATH')) exit;

class FDT_Email_Handler {
    private $from_email;
    private $whatsapp_number;

    public function __construct() {
        $this->from_email = get_option(FDT_EMAIL_FROM, 'contact@klarrion.com');
        $this->whatsapp_number = get_option(FDT_WHATSAPP_NUMBER, '21698134873');
    }

    public function send_tracking_email($order_id = null, $barcode, $customer_email = null) {
        // For order-based tracking
        if ($order_id) {
            return $this->send_order_tracking_email($order_id, $barcode);
        }
        // For manual barcode tracking
        return $this->send_barcode_tracking_email($barcode, $customer_email);
    }

    private function send_order_tracking_email($order_id, $barcode) {
        // Check if email was already sent
        if (get_post_meta($order_id, '_fdt_tracking_email_sent', true)) {
            error_log("[FDT] Tracking email already sent for order #{$order_id}");
            return false;
        }

        $order = wc_get_order($order_id);
        if (!$order) {
            error_log("[FDT] Error: Order #{$order_id} not found");
            return false;
        }

        $to = $order->get_billing_email();
        if (empty($to)) {
            error_log("[FDT] Error: No billing email for order #{$order_id}");
            return false;
        }

        $subject = '📦 Votre numéro de suivi est disponible – Commande #' . $order->get_order_number();
        $tracking_url = site_url('/suivi-de-commande/?barcode=' . urlencode($barcode));
        $order_tracking_url = site_url('/suivi-de-commande/?order_id=' . $order_id);

        $message = $this->get_email_template([
            'subject' => $subject,
            'order' => $order,
            'barcode' => $barcode,
            'tracking_url' => $tracking_url,
            'order_tracking_url' => $order_tracking_url,
            'customer_name' => $order->get_billing_first_name(),
            'order_number' => $order->get_order_number(),
            'order_total' => $order->get_formatted_order_total()
        ]);

        if ($this->send_email($to, $subject, $message)) {
            update_post_meta($order_id, '_fdt_tracking_email_sent', true);
            return true;
        }
        return false;
    }

    private function send_barcode_tracking_email($barcode, $customer_email) {
        if (empty($customer_email)) {
            error_log("[FDT] Error: No customer email provided for barcode {$barcode}");
            return false;
        }

        $subject = '📦 Votre numéro de suivi First Delivery';
        $tracking_url = site_url('/suivi-de-commande/?barcode=' . urlencode($barcode));

        $message = $this->get_email_template([
            'subject' => $subject,
            'barcode' => $barcode,
            'tracking_url' => $tracking_url,
            'is_barcode_only' => true
        ]);

        return $this->send_email($customer_email, $subject, $message);
    }

    private function get_email_template($data) {
        ob_start();
        
        wc_get_template('emails/email-header.php', 
            ['email_heading' => $data['subject']], 
            '', 
            WC()->plugin_path() . '/templates/'
        );

        if (isset($data['is_barcode_only'])) {
            $this->get_barcode_email_content($data);
        } else {
            $this->get_order_email_content($data);
        }

        wc_get_template('emails/email-footer.php', 
            [], 
            '', 
            WC()->plugin_path() . '/templates/'
        );

        $message = ob_get_clean();
        $wc_email = new WC_Email();
        return $wc_email->style_inline($message);
    }

    private function get_order_email_content($data) {
        ?>
        <p>Bonjour <?php echo esc_html($data['customer_name']); ?>,</p>
        <p>Nous vous informons que votre commande <strong>#<?php echo $data['order_number']; ?></strong> est transférer à <strong>FIRST DELIVERY</strong> pour livraison, ci après votre numéro de suivi.</p>
        <ul>
            <li><strong>Commande :</strong> #<?php echo $data['order_number']; ?></li>
            <li><strong>Total :</strong> <?php echo $data['order_total']; ?></li>
            <li><strong>Numéro de suivi :</strong> <?php echo esc_html($data['barcode']); ?></li>
        </ul>
        <p>👉 Vous pouvez traquer votre commande avec :<br>
        • Votre numéro de commande : <a href="<?php echo esc_url($data['order_tracking_url']); ?>"><?php echo esc_html($data['order_tracking_url']); ?></a></p>
        <?php
        $this->add_whatsapp_button();
        ?>
        <p>Merci pour votre achat,<br>L'équipe KLARRION</p>
        <?php
    }

    private function get_barcode_email_content($data) {
        ?>
        <p>Bonjour,</p>
        <p>Voici votre numéro de suivi First Delivery.</p>
        <ul>
            <li><strong>Numéro de suivi :</strong> <?php echo esc_html($data['barcode']); ?></li>
        </ul>
        <p>👉 Vous pouvez traquer votre colis ici : <a href="<?php echo esc_url($data['tracking_url']); ?>"><?php echo esc_html($data['tracking_url']); ?></a></p>
        <?php
        $this->add_whatsapp_button();
        ?>
        <p>Merci,<br>L'équipe KLARRION</p>
        <?php
    }

    private function add_whatsapp_button() {
        ?>
        <div style="text-align: center; margin: 15px 0;">
            <a href="https://api.whatsapp.com/send?phone=<?php echo esc_attr($this->whatsapp_number); ?>" style="display: inline-block;">
                <img src="<?php echo esc_url(FDT_PLUGIN_URL . 'assets/whatsapp-button.png'); ?>" alt="Contactez-nous sur WhatsApp" style="max-width: 200px; height: auto;">
            </a>
        </div>
        <?php
    }

    private function send_email($to, $subject, $message) {
        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: KLARRION <' . $this->from_email . '>'
        ];

        try {
            error_log("[FDT] Attempting to send email to: {$to}");
            return wp_mail($to, $subject, $message, $headers);
        } catch (Exception $e) {
            error_log("[FDT] Email sending error: " . $e->getMessage());
            return false;
        }
    }
}

// Initialize email handler
$fdt_email_handler = new FDT_Email_Handler();

// Function to maintain backward compatibility
function fdt_send_tracking_email_to_customer($order_id = null, $barcode, $customer_email = null) {
    global $fdt_email_handler;
    return $fdt_email_handler->send_tracking_email($order_id, $barcode, $customer_email);
}

// Debug email failures
add_action('wp_mail_failed', function($error) {
    $message = "[FDT] Email failed: " . $error->get_error_message();
    if (isset($error->error_data['wp_mail_failed'])) {
        $data = $error->error_data['wp_mail_failed'];
        $message .= "\nTo: " . (is_array($data['to']) ? implode(', ', $data['to']) : $data['to']);
        $message .= "\nSubject: " . $data['subject'];
    }
    error_log($message);
});