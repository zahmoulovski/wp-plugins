<?php
/**
 * Admin functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class FSPB_Admin {
    
    /**
     * Constructor
     */
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_fspb_search_products', array($this, 'ajax_search_products'));
        add_action('wp_ajax_fspb_search_categories', array($this, 'ajax_search_categories'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            __('Free Shipping Progress Bar', 'free-shipping-progress-bar'),
            __('Shipping Progress Bar', 'free-shipping-progress-bar'),
            'manage_woocommerce',
            'free-shipping-progress-bar',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Initialize admin settings
     */
    public function admin_init() {
        register_setting('fspb_settings_group', 'fspb_settings', array($this, 'sanitize_settings'));
        
        // General Settings Section
        add_settings_section(
            'fspb_general',
            __('General Settings', 'free-shipping-progress-bar'),
            null,
            'fspb_settings'
        );
        
        // Display Settings Section
        add_settings_section(
            'fspb_display',
            __('Display Settings', 'free-shipping-progress-bar'),
            null,
            'fspb_settings'
        );
        
        // Product/Category Settings Section
        add_settings_section(
            'fspb_products',
            __('Product & Category Settings', 'free-shipping-progress-bar'),
            null,
            'fspb_settings'
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if ($hook !== 'woocommerce_page_free-shipping-progress-bar') {
            return;
        }
        
        // Enqueue Select2 for better dropdowns
        wp_enqueue_style('select2', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css');
        wp_enqueue_script('select2', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js', array('jquery'));
        
        wp_enqueue_style('fspb-admin-css', FSPB_PLUGIN_URL . 'assets/css/admin.css', array('select2'), FSPB_PLUGIN_VERSION);
        wp_enqueue_script('fspb-admin-js', FSPB_PLUGIN_URL . 'assets/js/admin.js', array('jquery', 'wp-editor', 'select2'), FSPB_PLUGIN_VERSION, true);
        
        wp_localize_script('fspb-admin-js', 'fspb_admin', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('fspb_admin_nonce')
        ));
    }
    
    /**
     * Admin page HTML
     */
    public function admin_page() {
        $settings = get_option('fspb_settings', array());
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            
            <form method="post" action="options.php">
                <?php settings_fields('fspb_settings_group'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="fspb_threshold"><?php _e('Free Shipping Threshold', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <input type="number" id="fspb_threshold" name="fspb_settings[threshold]" 
                                   value="<?php echo esc_attr($settings['threshold'] ?? 100); ?>" 
                                   min="0" step="0.01" class="regular-text" />
                            <p class="description"><?php _e('The minimum order amount required for free shipping.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="fspb_initial_message"><?php _e('Initial Message', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <?php
                            wp_editor(
                                $settings['initial_message'] ?? '',
                                'fspb_initial_message',
                                array(
                                    'textarea_name' => 'fspb_settings[initial_message]',
                                    'media_buttons' => false,
                                    'textarea_rows' => 5,
                                    'teeny' => true
                                )
                            );
                            ?>
                            <p class="description"><?php _e('Message shown when free shipping threshold is not met. Use {remaining} for remaining amount.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="fspb_success_message"><?php _e('Success Message', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <?php
                            wp_editor(
                                $settings['success_message'] ?? '',
                                'fspb_success_message',
                                array(
                                    'textarea_name' => 'fspb_settings[success_message]',
                                    'media_buttons' => false,
                                    'textarea_rows' => 5,
                                    'teeny' => true
                                )
                            );
                            ?>
                            <p class="description"><?php _e('Message shown when free shipping threshold is achieved.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <h2><?php _e('Display Locations', 'free-shipping-progress-bar'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Show Progress Bar On', 'free-shipping-progress-bar'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="checkbox" name="fspb_settings[show_on_product]" value="1" 
                                           <?php checked($settings['show_on_product'] ?? 1, 1); ?> />
                                    <?php _e('Product Pages', 'free-shipping-progress-bar'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="fspb_settings[show_on_mini_cart]" value="1" 
                                           <?php checked($settings['show_on_mini_cart'] ?? 1, 1); ?> />
                                    <?php _e('Mini Cart', 'free-shipping-progress-bar'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="fspb_settings[show_on_cart]" value="1" 
                                           <?php checked($settings['show_on_cart'] ?? 1, 1); ?> />
                                    <?php _e('Cart Page', 'free-shipping-progress-bar'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="fspb_settings[show_on_checkout]" value="1" 
                                           <?php checked($settings['show_on_checkout'] ?? 1, 1); ?> />
                                    <?php _e('Checkout Page', 'free-shipping-progress-bar'); ?>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                </table>
                
                <h2><?php _e('Product & Category Rules', 'free-shipping-progress-bar'); ?></h2>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label><?php _e('Included Products', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <select id="fspb_included_products" name="fspb_settings[included_products][]" multiple="multiple" class="fspb-product-search" style="width: 100%; max-width: 400px;">
                                <?php
                                $included_products = $settings['included_products'] ?? array();
                                foreach ($included_products as $product_id) {
                                    $product = wc_get_product($product_id);
                                    if ($product) {
                                        echo '<option value="' . esc_attr($product_id) . '" selected="selected">' . esc_html($product->get_name()) . '</option>';
                                    }
                                }
                                ?>
                            </select>
                            <p class="description"><?php _e('Only these products will count towards free shipping. Leave empty to include all products.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label><?php _e('Excluded Products', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <select id="fspb_excluded_products" name="fspb_settings[excluded_products][]" multiple="multiple" class="fspb-product-search" style="width: 100%; max-width: 400px;">
                                <?php
                                $excluded_products = $settings['excluded_products'] ?? array();
                                foreach ($excluded_products as $product_id) {
                                    $product = wc_get_product($product_id);
                                    if ($product) {
                                        echo '<option value="' . esc_attr($product_id) . '" selected="selected">' . esc_html($product->get_name()) . '</option>';
                                    }
                                }
                                ?>
                            </select>
                            <p class="description"><?php _e('These products will not count towards free shipping.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label><?php _e('Included Categories', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <select id="fspb_included_categories" name="fspb_settings[included_categories][]" multiple="multiple" class="fspb-category-search" style="width: 100%; max-width: 400px;">
                                <?php
                                $included_categories = $settings['included_categories'] ?? array();
                                foreach ($included_categories as $category_id) {
                                    $category = get_term($category_id, 'product_cat');
                                    if ($category && !is_wp_error($category)) {
                                        echo '<option value="' . esc_attr($category_id) . '" selected="selected">' . esc_html($category->name) . '</option>';
                                    }
                                }
                                ?>
                            </select>
                            <p class="description"><?php _e('Only products from these categories will count towards free shipping. Leave empty to include all categories.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label><?php _e('Excluded Categories', 'free-shipping-progress-bar'); ?></label>
                        </th>
                        <td>
                            <select id="fspb_excluded_categories" name="fspb_settings[excluded_categories][]" multiple="multiple" class="fspb-category-search" style="width: 100%; max-width: 400px;">
                                <?php
                                $excluded_categories = $settings['excluded_categories'] ?? array();
                                foreach ($excluded_categories as $category_id) {
                                    $category = get_term($category_id, 'product_cat');
                                    if ($category && !is_wp_error($category)) {
                                        echo '<option value="' . esc_attr($category_id) . '" selected="selected">' . esc_html($category->name) . '</option>';
                                    }
                                }
                                ?>
                            </select>
                            <p class="description"><?php _e('Products from these categories will not count towards free shipping.', 'free-shipping-progress-bar'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        $sanitized = array();
        
        $sanitized['threshold'] = floatval($input['threshold'] ?? 100);
        $sanitized['initial_message'] = wp_kses_post($input['initial_message'] ?? '');
        $sanitized['success_message'] = wp_kses_post($input['success_message'] ?? '');
        
        $sanitized['show_on_product'] = isset($input['show_on_product']) ? 1 : 0;
        $sanitized['show_on_mini_cart'] = isset($input['show_on_mini_cart']) ? 1 : 0;
        $sanitized['show_on_cart'] = isset($input['show_on_cart']) ? 1 : 0;
        $sanitized['show_on_checkout'] = isset($input['show_on_checkout']) ? 1 : 0;
        
        $sanitized['included_products'] = array_map('intval', $input['included_products'] ?? array());
        $sanitized['excluded_products'] = array_map('intval', $input['excluded_products'] ?? array());
        $sanitized['included_categories'] = array_map('intval', $input['included_categories'] ?? array());
        $sanitized['excluded_categories'] = array_map('intval', $input['excluded_categories'] ?? array());
        
        return $sanitized;
    }
    
    /**
     * AJAX search for products
     */
    public function ajax_search_products() {
        check_ajax_referer('fspb_admin_nonce', 'nonce');
        
        $search_term = sanitize_text_field($_GET['term'] ?? '');
        
        $products = wc_get_products(array(
            'limit' => 10,
            's' => $search_term,
            'status' => 'publish'
        ));
        
        $results = array();
        foreach ($products as $product) {
            $results[] = array(
                'id' => $product->get_id(),
                'text' => $product->get_name()
            );
        }
        
        wp_send_json($results);
    }
    
    /**
     * AJAX search for categories
     */
    public function ajax_search_categories() {
        check_ajax_referer('fspb_admin_nonce', 'nonce');
        
        $search_term = sanitize_text_field($_GET['term'] ?? '');
        
        $categories = get_terms(array(
            'taxonomy' => 'product_cat',
            'search' => $search_term,
            'number' => 10,
            'hide_empty' => false
        ));
        
        $results = array();
        foreach ($categories as $category) {
            $results[] = array(
                'id' => $category->term_id,
                'text' => $category->name
            );
        }
        
        wp_send_json($results);
    }
}
