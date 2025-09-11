<?php
/**
 * Progress calculation functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class FSPB_Calculator {
    
    private $settings;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->settings = get_option('fspb_settings', array());
    }
    
    /**
     * Calculate progress towards free shipping
     */
    public function calculate_progress() {
        $threshold = floatval($this->settings['threshold'] ?? 100);
        $cart_total = $this->get_eligible_cart_total();
        
        $percentage = min(100, ($cart_total / $threshold) * 100);
        $remaining = max(0, $threshold - $cart_total);
        
        $message = $this->get_message($percentage, $remaining);
        
        return array(
            'threshold' => $threshold,
            'cart_total' => $cart_total,
            'percentage' => $percentage,
            'remaining' => $remaining,
            'message' => $message,
            'qualified' => $percentage >= 100
        );
    }
    
    /**
     * Get eligible cart total based on include/exclude rules (including taxes)
     */
    private function get_eligible_cart_total() {
        if (!WC()->cart) {
            return 0;
        }
        
        $total = 0;
        $included_products = $this->settings['included_products'] ?? array();
        $excluded_products = $this->settings['excluded_products'] ?? array();
        $included_categories = $this->settings['included_categories'] ?? array();
        $excluded_categories = $this->settings['excluded_categories'] ?? array();
        
        // If no filters are set, use cart total including taxes
        if (empty($included_products) && empty($excluded_products) && 
            empty($included_categories) && empty($excluded_categories)) {
            return WC()->cart->get_total('edit');
        }
        
        foreach (WC()->cart->get_cart() as $cart_item) {
            $product_id = $cart_item['product_id'];
            $variation_id = $cart_item['variation_id'];
            $quantity = $cart_item['quantity'];
            $line_total = $cart_item['line_total']; // Subtotal
            $line_tax = $cart_item['line_tax']; // Tax amount
            
            // Use variation ID if it exists, otherwise use product ID
            $check_product_id = $variation_id ? $variation_id : $product_id;
            
            // Check if product should be included
            if (!$this->is_product_eligible($product_id, $check_product_id)) {
                continue;
            }
            
            // Add both subtotal and tax to get total including tax
            $total += ($line_total + $line_tax);
        }
        
        return $total;
    }
    
    /**
     * Check if a product is eligible for free shipping progress
     */
    private function is_product_eligible($product_id, $check_product_id) {
        $included_products = $this->settings['included_products'] ?? array();
        $excluded_products = $this->settings['excluded_products'] ?? array();
        $included_categories = $this->settings['included_categories'] ?? array();
        $excluded_categories = $this->settings['excluded_categories'] ?? array();
        
        // Check excluded products first
        if (!empty($excluded_products) && (in_array($product_id, $excluded_products) || in_array($check_product_id, $excluded_products))) {
            return false;
        }
        
        // Check excluded categories
        if (!empty($excluded_categories)) {
            $product_categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'ids'));
            if (array_intersect($product_categories, $excluded_categories)) {
                return false;
            }
        }
        
        // If included products are specified, check if product is in the list
        if (!empty($included_products)) {
            if (!in_array($product_id, $included_products) && !in_array($check_product_id, $included_products)) {
                return false;
            }
        }
        
        // If included categories are specified, check if product is in one of them
        if (!empty($included_categories)) {
            $product_categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'ids'));
            if (!array_intersect($product_categories, $included_categories)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get the appropriate message based on progress
     */
    private function get_message($percentage, $remaining) {
        if ($percentage >= 100) {
            $message = $this->settings['success_message'] ?? __('Congratulations! You qualify for free shipping!', 'free-shipping-progress-bar');
        } else {
            $message = $this->settings['initial_message'] ?? __('Add {remaining} more to get free shipping!', 'free-shipping-progress-bar');
            
            // Replace {remaining} placeholder with formatted amount
            $remaining_formatted = wc_price($remaining);
            $message = str_replace('{remaining}', $remaining_formatted, $message);
        }
        
        return $message;
    }
}
