<?php
if (!defined('ABSPATH')) {
    exit;
}

class B2B_Display {
    /**
     * Get the B2B SVG icon wrapped in a secure link
     */
    private function get_b2b_svg() {
        $plugin_url = plugin_dir_url(__FILE__); // Get the plugin directory URL
        $b2b_url = esc_url('https://klarrion.com/b2b/'); // B2B page URL
        
        return '<a href="' . $b2b_url . '" title="Remise B2B">
                    <img src="' . esc_url($plugin_url . 'b2b.svg') . '" 
                        alt="B2B" 
                        class="b2b-icon" 
                        style="width:35px; vertical-align: middle; margin-right: 5px;"
                        draggable="false" 
                        oncontextmenu="return false;">
                </a>';
    }

    /**
     * Add a B2B icon inline with the product title
     */
    public function add_b2b_star_to_product_title($title, $id) {
        // Check if it's in the admin dashboard
        if (is_admin()) {
            return $title;
        }
        
        $b2b_price = get_post_meta($id, '_b2b_price', true);
        
        // If the product has a B2B price, prepend the linked SVG icon
        if ($b2b_price) {
            return $this->get_b2b_svg() . $title;
        }
        return $title;
    }

    /**
     * Add a new column for B2B Star in the WooCommerce product list
     */
    public function add_b2b_star_column($columns) {
        $columns['b2b_star'] = __('B2B', 'b2b-discount');
        return $columns;
    }

    /**
     * Display the B2B icon in the WooCommerce product list if the product has a B2B price
     */
    public function display_b2b_star_column($column, $post_id) {
        if ($column === 'b2b_star') {
            $b2b_price = get_post_meta($post_id, '_b2b_price', true);
            if ($b2b_price) {
                echo $this->get_b2b_svg();
            } else {
                echo '-';
            }
        }
    }

    public function init() {
        static $initialized = false;

        if (!$initialized) {
            // Use filter instead of action to modify the title itself
            add_filter('the_title', array($this, 'add_b2b_star_to_product_title'), 10, 2);
            
            add_filter('manage_edit-product_columns', array($this, 'add_b2b_star_column'));
            add_action('manage_product_posts_custom_column', array($this, 'display_b2b_star_column'), 10, 2);

            $initialized = true;
        }
    }
}
