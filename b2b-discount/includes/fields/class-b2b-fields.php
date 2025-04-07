<?php
if (!defined('ABSPATH')) {
    exit;
}

class B2B_Fields {
    public function add_b2b_fields() {
        if (did_action('woocommerce_product_options_general_product_data') > 1) {
            return;
        }
            echo '<div class="options_group">';
        
        woocommerce_wp_text_input(array(
            'id' => '_b2b_price',
            'label' => __('Prix B2B (TND TTC)', 'b2b-discount'),
            'desc_tip' => 'true',
            'description' => __('Fixer un prix spécial B2B pour ce produit.', 'b2b-discount'),
            'type' => 'number',
            'custom_attributes' => array('step' => '1', 'min' => '1')
        ));
        
        woocommerce_wp_text_input(array(
            'id' => '_b2b_min_qty',
            'label' => __('B2B Quantité minimale', 'b2b-discount'),
            'desc_tip' => 'true',
            'description' => __('Fixer une quantité minimale pour les commandes B2B.', 'b2b-discount'),
            'type' => 'number',
            'custom_attributes' => array('step' => '1', 'min' => '1')
        ));
        
        echo '</div>';
    }

    public function save_b2b_fields($post_id) {
        if (isset($_POST['_b2b_price'])) {
            update_post_meta($post_id, '_b2b_price', sanitize_text_field($_POST['_b2b_price']));
        }
        if (isset($_POST['_b2b_min_qty'])) {
            update_post_meta($post_id, '_b2b_min_qty', sanitize_text_field($_POST['_b2b_min_qty']));
        }
    }

    /**
     * Add fields to the Quick Edit panel in the WooCommerce product list
     */
    public function add_quick_edit_b2b_fields($column_name, $post_type) {
        if ($post_type !== 'product' || $column_name !== 'price') {
            return;
        }
        ?>
        <fieldset class="inline-edit-col-right">
            <div class="inline-edit-col">
                <span class="title"><?php esc_html_e('B2B Pricing', 'b2b-discount'); ?></span>
                <label>
                    <span class="title"><?php esc_html_e('Prix B2B (TND TTC)', 'b2b-discount'); ?></span>
                    <input type="number" name="_b2b_price" class="b2b_price" step="1" min="1" placeholder="<?php esc_attr_e('Prix B2B', 'b2b-discount'); ?>">
                </label>
                <label>
                    <span class="title"><?php esc_html_e('Quantité minimale', 'b2b-discount'); ?></span>
                    <input type="number" name="_b2b_min_qty" class="b2b_min_qty" step="1" min="1" placeholder="<?php esc_attr_e('Quantité minimale', 'b2b-discount'); ?>">
                </label>
            </div>
        </fieldset>
        <?php
    }

    /**
     * Save Quick Edit fields when a product is updated
     */
    public function save_quick_edit_b2b_fields($post_id) {
        if (isset($_POST['_b2b_price'])) {
            update_post_meta($post_id, '_b2b_price', sanitize_text_field($_POST['_b2b_price']));
        }
        if (isset($_POST['_b2b_min_qty'])) {
            update_post_meta($post_id, '_b2b_min_qty', sanitize_text_field($_POST['_b2b_min_qty']));
        }
    }
    public function init() {
    static $initialized = false;

    if (!$initialized) {
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_b2b_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_b2b_fields'));

        // Quick Edit Hooks
        add_action('quick_edit_custom_box', array($this, 'add_quick_edit_b2b_fields'), 10, 2);
        add_action('save_post', array($this, 'save_quick_edit_b2b_fields'));

        $initialized = true;
    }
}

}