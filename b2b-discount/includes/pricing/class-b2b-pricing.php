<?php
if (!defined('ABSPATH')) {
    exit;
}

class B2B_Pricing {
    public function set_minimum_quantity($args, $product) {
        if (is_user_logged_in() && current_user_can('b2b')) {
            $min_qty = get_post_meta($product->get_id(), '_b2b_min_qty', true);
            if ($min_qty) {
                $args['min_value'] = 1;
            }
        }
        return $args;
    }

    public function adjust_cart_prices($cart) {
        if (is_admin() && !defined('DOING_AJAX')) return;
        
        foreach ($cart->get_cart() as $cart_item) {
            $product_id = $cart_item['product_id'];
            $b2b_price = get_post_meta($product_id, '_b2b_price', true);
            $min_qty = get_post_meta($product_id, '_b2b_min_qty', true);
            
            if (is_user_logged_in() && current_user_can('b2b') && $b2b_price) {
                if ($cart_item['quantity'] >= $min_qty) {
                    $cart_item['data']->set_price($b2b_price);
                } else {
                    $cart_item['data']->set_price($cart_item['data']->get_sale_price() ?: $cart_item['data']->get_regular_price());
                }
            }
        }
    }

    public function display_b2b_price($price_html, $product) {
        $b2b_price = get_post_meta($product->get_id(), '_b2b_price', true);
        $min_qty = get_post_meta($product->get_id(), '_b2b_min_qty', true);
        $sale_price = $product->get_sale_price() ?: $product->get_regular_price();
        
        if ($b2b_price && is_user_logged_in() && current_user_can('b2b')) {
            $regular_price_html = "<del>Prix de vente: " . wc_price($sale_price) . " TTC</del><br>";
            $b2b_price_html = "<strong>Prix B2B: " . wc_price($b2b_price) . " TTC</strong><br>";
            $min_qty_text = "<small>La quantité minimale pour le prix B2B est: " . esc_html($min_qty) . "</small>";
            return $regular_price_html . $b2b_price_html . $min_qty_text;
        }
        return $price_html;
    }
}