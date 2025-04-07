<?php
/**
 * Plugin Name: Product Label Generator
 * Description: Generates PDF labels for products with QR codes
 * Version: 1.0.0
 * Author: Med Yassine Zahmoul
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */
if (!defined('ABSPATH')) {
    exit;
}
// Include TCPDF library
require_once plugin_dir_path(__FILE__) . 'tcpdf/tcpdf.php';
// Check if WooCommerce is active
if (!in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
    add_action('admin_notices', function() {
        ?>
        <div class="notice notice-error">
            <p>Product Label Generator requires WooCommerce to be installed and activated.</p>
        </div>
        <?php
    });
    return;
}
class ProductLabelGenerator {
    public function __construct() {
        add_action('admin_bar_menu', [$this, 'add_admin_bar_button'], 100);
        add_action('admin_post_generate_product_label', [$this, 'generate_label']);
        add_action('admin_init', [$this, 'handle_generate_request']);
    }
    public function add_admin_bar_button($admin_bar) {
        global $post;
        // Check if we're viewing a product
        $is_product = false;

        if (is_admin()) {
            // In admin area, check if we're editing a product
            if (function_exists('get_current_screen')) {
                $screen = get_current_screen();
                $is_product = $screen && $screen->post_type === 'product';
            }
        } else {
            // On frontend, check if we're viewing a single product
            $is_product = is_singular('product');
        }
        // Only show button for products
        if (!$is_product || !$post) {
            return;
        }
        $admin_bar->add_menu([
            'id'    => 'generate-product-label',
            'title' => '📄 Generate Label PDF',
            'href'  => wp_nonce_url(
                admin_url('admin-post.php?action=generate_product_label&product_id=' . $post->ID),
                'generate_product_label'
            ),
        ]);
    }
    public function handle_generate_request() {
        if (!isset($_GET['action']) || $_GET['action'] !== 'generate_product_label') {
            return;
        }
        if (!isset($_GET['product_id']) || !wp_verify_nonce($_GET['_wpnonce'], 'generate_product_label')) {
            wp_die('Invalid request');
        }

        $this->generate_label(intval($_GET['product_id']));
    }
    public function generate_label($product_id) {
    try {
        $product = wc_get_product($product_id);
        if (!$product) {
            wp_die('Product not found');
        }
        // DEBUG: Log product data
        error_log('Generating label for product ID: ' . $product_id);
        error_log('Product SKU: ' . $product->get_sku());
        error_log('Product Name: ' . $product->get_name());
        // Create PDF (100x50mm landscape)
        $pdf = new TCPDF('L', 'mm', [100, 50], true, 'UTF-8', false);
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false);
        $pdf->AddPage();
        // Add background (scaled to fit inside border)
        $background_url = 'https://klarrion.com/signature/label.png';
        $pdf->Image($background_url, 1, 1, 98, 48, 'PNG', '', '', false, 300);
        // Product Image (35x35mm, positioned)
        $image_id = $product->get_image_id();
        if ($image_id) {
            $image_path = get_attached_file($image_id);
            if ($image_path && file_exists($image_path)) {
                $pdf->Image($image_path, 4, 4, 40, 40);
            }
        }
        // Product Title (wrapped, blue)
        $pdf->SetFont('helvetica', 'B', 10);
        $pdf->SetTextColor(29, 126, 170); // #1D7EAA
        $pdf->SetXY(45, 5);
        $product_name = ucfirst(strtolower($product->get_name())); // Convert to sentence case
        $pdf->MultiCell(55, 5, $product_name, 0, 'L');
        // Add SKU
            $pdf->SetFont('helvetica', '', 8);
            $pdf->SetXY(50, 15);
            $pdf->Cell(45, 10, 'REF: ' . $product->get_sku(), 0, 1);
        // QR Code (positioned)
        $product_url = get_permalink($product_id);
        $style = [
            'border' => false,
            'vpadding' => '0',
            'hpadding' => '0',
            'fgcolor' => [0, 0, 0],
            'bgcolor' => false,
            'module_width' => 2.5,
            'module_height' => 2.5
        ];
        $pdf->write2DBarcode($product_url, 'QRCODE,L', 81, 30, 17, 17, $style);
        // Output PDF
        $pdf->Output($product->get_sku() . '_label.pdf', 'D');
        exit;
    } catch (Exception $e) {
        error_log('Label Generator Error: ' . $e->getMessage());
        wp_die('Error generating PDF: ' . $e->getMessage());
    }
}
}
// Initialize plugin
new ProductLabelGenerator();