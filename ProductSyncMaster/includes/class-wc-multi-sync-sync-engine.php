<?php
/**
 * Sync Engine - Handles the actual synchronization logic
 */
class WC_Multi_Sync_Sync_Engine {
    
    public function __construct() {
        add_action('wc_multi_sync_cron', array($this, 'process_sync_queue'));
        add_action('init', array($this, 'maybe_process_immediate_sync'));
    }
    
    /**
     * Queue a product for synchronization
     */
    public static function queue_product_sync($product_id, $action = 'sync') {
        $sites = WC_Multi_Sync_Database::get_sites();
        
        foreach ($sites as $site) {
            if (!$site->is_active) continue;
            
            WC_Multi_Sync_Database::add_sync_job($product_id, $site->id, $action);
        }
        
        WC_Multi_Sync_Database::add_log(
            'sync_queued',
            sprintf(__('Product #%d queued for sync to %d sites', 'wc-multi-sync'), $product_id, count($sites)),
            $product_id
        );
    }
    
    /**
     * Process sync queue (called by cron)
     */
    public static function process_sync_queue() {
        $settings = get_option('wc_multi_sync_settings', array());
        $batch_size = isset($settings['batch_size']) ? intval($settings['batch_size']) : 50;
        
        $jobs = WC_Multi_Sync_Database::get_pending_jobs($batch_size);
        
        foreach ($jobs as $job) {
            self::process_single_job($job);
        }
    }
    
    /**
     * Process immediate sync for real-time updates
     */
    public function maybe_process_immediate_sync() {
        if (isset($_GET['wc_multi_sync_immediate']) && wp_verify_nonce($_GET['nonce'], 'wc_multi_sync_immediate')) {
            $this->process_sync_queue();
            wp_redirect(remove_query_arg(array('wc_multi_sync_immediate', 'nonce')));
            exit;
        }
    }
    
    /**
     * Process a single sync job
     */
    private static function process_single_job($job) {
        // Update job status to processing
        WC_Multi_Sync_Database::update_job_status($job->id, 'processing', 0);
        
        try {
            $product = wc_get_product($job->product_id);
            if (!$product) {
                throw new Exception(__('Product not found', 'wc-multi-sync'));
            }
            
            $site = WC_Multi_Sync_Database::get_site($job->site_id);
            if (!$site) {
                throw new Exception(__('Destination site not found', 'wc-multi-sync'));
            }
            
            $api = new WC_Multi_Sync_API();
            
            // Update progress
            WC_Multi_Sync_Database::update_job_status($job->id, 'processing', 25);
            
            switch ($job->action) {
                case 'created':
                case 'updated':
                case 'sync':
                    $result = self::sync_product_to_site($product, $site, $api);
                    break;
                    
                case 'deleted':
                    $result = self::delete_product_from_site($product->get_id(), $site, $api);
                    break;
                    
                case 'stock_changed':
                    $result = self::sync_product_stock($product, $site, $api);
                    break;
                    
                default:
                    throw new Exception(__('Unknown sync action', 'wc-multi-sync'));
            }
            
            // Update progress
            WC_Multi_Sync_Database::update_job_status($job->id, 'processing', 90);
            
            if ($result['success']) {
                WC_Multi_Sync_Database::update_job_status($job->id, 'completed', 100);
                
                // Update site last sync time
                WC_Multi_Sync_Database::update_site($site->id, array(
                    'last_sync' => current_time('mysql')
                ));
                
                WC_Multi_Sync_Database::add_log(
                    'sync_success',
                    sprintf(__('Product "%s" synced successfully to %s', 'wc-multi-sync'), $product->get_name(), $site->name),
                    $product->get_id(),
                    $site->id,
                    $result
                );
            } else {
                throw new Exception($result['message']);
            }
            
        } catch (Exception $e) {
            WC_Multi_Sync_Database::update_job_status($job->id, 'failed', null, $e->getMessage());
            
            WC_Multi_Sync_Database::add_log(
                'sync_error',
                sprintf(__('Failed to sync product #%d to %s: %s', 'wc-multi-sync'), $job->product_id, $site->name ?? 'Unknown Site', $e->getMessage()),
                $job->product_id,
                $job->site_id
            );
            
            // Send email notification if enabled
            self::maybe_send_error_notification($job, $e->getMessage());
        }
    }
    
    /**
     * Sync product to destination site
     */
    private static function sync_product_to_site($product, $site, $api) {
        $settings = get_option('wc_multi_sync_settings', array());
        
        // Check if product mapping exists
        $mapping = WC_Multi_Sync_Database::get_product_mapping($product->get_id(), $site->id);
        
        // Prepare product data
        $product_data = array(
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'type' => $product->get_type(),
            'status' => $product->get_status(),
            'featured' => $product->is_featured(),
            'catalog_visibility' => $product->get_catalog_visibility(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'sku' => $product->get_sku(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'manage_stock' => $product->get_manage_stock(),
            'stock_quantity' => $product->get_stock_quantity(),
            'stock_status' => $product->get_stock_status(),
            'weight' => $product->get_weight(),
            'dimensions' => array(
                'length' => $product->get_length(),
                'width' => $product->get_width(),
                'height' => $product->get_height()
            )
        );
        
        // Add categories if enabled
        if (($settings['sync_categories'] ?? 'yes') === 'yes') {
            $categories = array();
            $terms = get_the_terms($product->get_id(), 'product_cat');
            if ($terms && !is_wp_error($terms)) {
                foreach ($terms as $term) {
                    $categories[] = array(
                        'name' => $term->name,
                        'slug' => $term->slug
                    );
                }
            }
            $product_data['categories'] = $categories;
            
            // Add tags
            $tags = array();
            $tag_terms = get_the_terms($product->get_id(), 'product_tag');
            if ($tag_terms && !is_wp_error($tag_terms)) {
                foreach ($tag_terms as $term) {
                    $tags[] = array(
                        'name' => $term->name,
                        'slug' => $term->slug
                    );
                }
            }
            $product_data['tags'] = $tags;
        }
        
        // Add images if enabled
        if (($settings['sync_images'] ?? 'yes') === 'yes') {
            $images = array();
            
            // Featured image
            $image_id = $product->get_image_id();
            if ($image_id) {
                $images[] = array(
                    'src' => wp_get_attachment_url($image_id),
                    'name' => get_the_title($image_id),
                    'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true)
                );
            }
            
            // Gallery images
            $gallery_ids = $product->get_gallery_image_ids();
            foreach ($gallery_ids as $gallery_id) {
                $images[] = array(
                    'src' => wp_get_attachment_url($gallery_id),
                    'name' => get_the_title($gallery_id),
                    'alt' => get_post_meta($gallery_id, '_wp_attachment_image_alt', true)
                );
            }
            
            $product_data['images'] = $images;
        }
        
        // Handle variations if it's a variable product
        if (($settings['sync_variations'] ?? 'yes') === 'yes' && $product->is_type('variable')) {
            $variations = array();
            $variation_ids = $product->get_children();
            
            foreach ($variation_ids as $variation_id) {
                $variation = wc_get_product($variation_id);
                if ($variation) {
                    $variations[] = array(
                        'sku' => $variation->get_sku(),
                        'price' => $variation->get_price(),
                        'regular_price' => $variation->get_regular_price(),
                        'sale_price' => $variation->get_sale_price(),
                        'stock_quantity' => $variation->get_stock_quantity(),
                        'manage_stock' => $variation->get_manage_stock(),
                        'attributes' => $variation->get_variation_attributes()
                    );
                }
            }
            
            $product_data['variations'] = $variations;
            
            // Add attributes for variable products
            $attributes = array();
            $product_attributes = $product->get_attributes();
            foreach ($product_attributes as $attribute) {
                if ($attribute->get_variation()) {
                    $attributes[] = array(
                        'name' => $attribute->get_name(),
                        'options' => $attribute->get_options(),
                        'visible' => $attribute->get_visible(),
                        'variation' => $attribute->get_variation()
                    );
                }
            }
            $product_data['attributes'] = $attributes;
        }
        
        // Sync to destination site
        if ($mapping && $mapping->remote_product_id) {
            // Update existing product
            $result = $api->update_product($site, $mapping->remote_product_id, $product_data);
        } else {
            // Check if product exists by SKU on destination site
            $existing_product = null;
            if (!empty($product_data['sku'])) {
                $existing_product = $api->find_product_by_sku($site, $product_data['sku']);
            }
            
            if ($existing_product && isset($existing_product['data']['id'])) {
                // Product exists with same SKU - update it
                $result = $api->update_product($site, $existing_product['data']['id'], $product_data);
                
                if ($result['success']) {
                    // Save product mapping for future syncs
                    WC_Multi_Sync_Database::save_product_mapping(
                        $product->get_id(),
                        $existing_product['data']['id'],
                        $site->id
                    );
                }
            } else {
                // Create new product
                $result = $api->create_product($site, $product_data);
                
                if ($result['success'] && isset($result['data']['id'])) {
                    // Save product mapping
                    WC_Multi_Sync_Database::save_product_mapping(
                        $product->get_id(),
                        $result['data']['id'],
                        $site->id
                    );
                }
            }
        }
        
        return $result;
    }
    
    /**
     * Delete product from destination site
     */
    private static function delete_product_from_site($product_id, $site, $api) {
        $mapping = WC_Multi_Sync_Database::get_product_mapping($product_id, $site->id);
        
        if (!$mapping || !$mapping->remote_product_id) {
            // Try to find by SKU if no mapping exists
            $product = wc_get_product($product_id);
            if ($product && !empty($product->get_sku())) {
                $existing_product = $api->find_product_by_sku($site, $product->get_sku());
                
                if ($existing_product && isset($existing_product['data']['id'])) {
                    $result = $api->delete_product($site, $existing_product['data']['id']);
                    return $result;
                }
            }
            
            return array(
                'success' => true,
                'message' => __('Product not found on destination site', 'wc-multi-sync')
            );
        }
        
        $result = $api->delete_product($site, $mapping->remote_product_id);
        
        if ($result['success']) {
            // Remove mapping
            global $wpdb;
            $table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
            $wpdb->delete($table, array('id' => $mapping->id), array('%d'));
        }
        
        return $result;
    }
    
    /**
     * Sync only product stock to destination site
     */
    private static function sync_product_stock($product, $site, $api) {
        $mapping = WC_Multi_Sync_Database::get_product_mapping($product->get_id(), $site->id);
        
        if (!$mapping || !$mapping->remote_product_id) {
            // Try to find by SKU if no mapping exists
            if (!empty($product->get_sku())) {
                $existing_product = $api->find_product_by_sku($site, $product->get_sku());
                
                if ($existing_product && isset($existing_product['data']['id'])) {
                    // Create mapping and update stock
                    WC_Multi_Sync_Database::save_product_mapping(
                        $product->get_id(),
                        $existing_product['data']['id'],
                        $site->id
                    );
                    
                    $stock_data = array(
                        'stock_quantity' => $product->get_stock_quantity(),
                        'stock_status' => $product->get_stock_status(),
                        'manage_stock' => $product->get_manage_stock()
                    );
                    
                    return $api->update_product($site, $existing_product['data']['id'], $stock_data);
                }
            }
            
            return array(
                'success' => false,
                'message' => __('Product not found on destination site', 'wc-multi-sync')
            );
        }
        
        $stock_data = array(
            'stock_quantity' => $product->get_stock_quantity(),
            'stock_status' => $product->get_stock_status(),
            'manage_stock' => $product->get_manage_stock()
        );
        
        return $api->update_product($site, $mapping->remote_product_id, $stock_data);
    }
    
    /**
     * Send error notification email
     */
    private static function maybe_send_error_notification($job, $error_message) {
        $settings = get_option('wc_multi_sync_settings', array());
        
        if (($settings['email_notifications'] ?? 'yes') !== 'yes') {
            return;
        }
        
        $admin_email = get_option('admin_email');
        $site_name = get_bloginfo('name');
        
        $subject = sprintf(__('[%s] WooCommerce Sync Error', 'wc-multi-sync'), $site_name);
        
        $message = sprintf(
            __("A synchronization error occurred:\n\nProduct ID: %d\nSite ID: %d\nError: %s\n\nPlease check your sync settings and destination site configuration.", 'wc-multi-sync'),
            $job->product_id,
            $job->site_id,
            $error_message
        );
        
        wp_mail($admin_email, $subject, $message);
    }
    
    /**
     * Manual sync trigger for specific product and sites
     */
    public static function manual_sync_product($product_id, $site_ids = null) {
        if ($site_ids === null) {
            $sites = WC_Multi_Sync_Database::get_sites();
            $site_ids = array_column($sites, 'id');
        }
        
        $jobs_created = 0;
        foreach ($site_ids as $site_id) {
            if (WC_Multi_Sync_Database::add_sync_job($product_id, $site_id, 'sync')) {
                $jobs_created++;
            }
        }
        
        return $jobs_created;
    }
    
    /**
     * Bulk sync all products to all sites
     */
    public static function bulk_sync_all_products() {
        $products = get_posts(array(
            'post_type' => 'product',
            'numberposts' => -1,
            'post_status' => 'publish',
            'fields' => 'ids'
        ));
        
        $sites = WC_Multi_Sync_Database::get_sites();
        $jobs_created = 0;
        
        foreach ($products as $product_id) {
            foreach ($sites as $site) {
                if (!$site->is_active) continue;
                
                if (WC_Multi_Sync_Database::add_sync_job($product_id, $site->id, 'sync')) {
                    $jobs_created++;
                }
            }
        }
        
        WC_Multi_Sync_Database::add_log(
            'bulk_sync_started',
            sprintf(__('Bulk sync started: %d jobs created for %d products across %d sites', 'wc-multi-sync'), 
                $jobs_created, count($products), count($sites))
        );
        
        return $jobs_created;
    }
    
    /**
     * Get sync statistics
     */
    public static function get_sync_stats() {
        global $wpdb;
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        
        return array(
            'pending' => $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'pending'"),
            'processing' => $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'processing'"),
            'completed' => $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'completed'"),
            'failed' => $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'failed'")
        );
    }
}