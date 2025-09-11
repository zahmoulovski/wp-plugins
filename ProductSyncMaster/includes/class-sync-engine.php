<?php
/**
 * Core synchronization engine
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Multi_Sync_Engine {
    
    private $batch_size;
    private $max_retries;
    
    public function __construct() {
        $this->batch_size = get_option('wc_multi_sync_batch_size', 50);
        $this->max_retries = get_option('wc_multi_sync_max_retries', 3);
    }
    
    /**
     * Sync single product to target sites
     */
    public function sync_product($product_id, $target_site_ids = array()) {
        $product = wc_get_product($product_id);
        
        if (!$product) {
            return array(
                'success' => false,
                'error' => __('Product not found', 'wc-multi-sync')
            );
        }
        
        $results = array();
        $sites = WC_Multi_Sync_Database::get_sites('destination', true);
        
        if (empty($target_site_ids)) {
            $target_site_ids = wp_list_pluck($sites, 'id');
        }
        
        foreach ($sites as $site) {
            if (!in_array($site['id'], $target_site_ids)) {
                continue;
            }
            
            $result = $this->sync_product_to_site($product, $site);
            $results[$site['id']] = $result;
            
            // Log the sync attempt
            WC_Multi_Sync_Database::log_activity(array(
                'site_id' => $site['id'],
                'product_id' => $product_id,
                'action' => 'product_sync',
                'status' => $result['success'] ? 'success' : 'error',
                'message' => $result['success'] 
                    ? sprintf(__('Product "%s" synced successfully to %s', 'wc-multi-sync'), $product->get_name(), $site['name'])
                    : sprintf(__('Failed to sync product "%s" to %s: %s', 'wc-multi-sync'), $product->get_name(), $site['name'], $result['error']),
                'details' => json_encode($result)
            ));
        }
        
        $success_count = count(array_filter($results, function($r) { return $r['success']; }));
        $total_count = count($results);
        
        return array(
            'success' => $success_count > 0,
            'synced' => $success_count,
            'total' => $total_count,
            'results' => $results
        );
    }
    
    /**
     * Bulk sync multiple products
     */
    public function bulk_sync($product_ids = array(), $target_site_ids = array()) {
        if (empty($product_ids)) {
            // Get all published products
            $product_ids = get_posts(array(
                'post_type' => 'product',
                'post_status' => 'publish',
                'numberposts' => -1,
                'fields' => 'ids'
            ));
        }
        
        $results = array();
        $batches = array_chunk($product_ids, $this->batch_size);
        
        foreach ($batches as $batch_index => $batch) {
            foreach ($batch as $product_id) {
                $result = $this->sync_product($product_id, $target_site_ids);
                $results[$product_id] = $result;
                
                // Add small delay to prevent overwhelming the target site
                usleep(100000); // 0.1 second
            }
            
            // Longer delay between batches
            if ($batch_index < count($batches) - 1) {
                sleep(1);
            }
        }
        
        $success_count = count(array_filter($results, function($r) { return $r['success']; }));
        
        return array(
            'success' => $success_count > 0,
            'synced' => $success_count,
            'total' => count($results),
            'results' => $results
        );
    }
    
    /**
     * Auto sync product when it's created/updated/deleted
     */
    public function auto_sync_product($product_id, $action = 'updated') {
        $sites = WC_Multi_Sync_Database::get_sites('destination', true);
        
        foreach ($sites as $site) {
            // Check if auto-sync is enabled for this site
            $rules = $this->get_sync_rules_for_site($site['id']);
            $should_sync = false;
            
            foreach ($rules as $rule) {
                if ($rule['auto_sync'] && $this->product_matches_rule($product_id, $rule)) {
                    $should_sync = true;
                    break;
                }
            }
            
            if (!$should_sync) {
                continue;
            }
            
            if ($action === 'deleted') {
                $this->delete_product_from_site($product_id, $site);
            } else {
                $product = wc_get_product($product_id);
                if ($product) {
                    $this->sync_product_to_site($product, $site);
                }
            }
        }
    }
    
    /**
     * Sync single product to specific site
     */
    private function sync_product_to_site($product, $site) {
        try {
            $api_client = new WC_Multi_Sync_API_Client(
                $site['url'],
                $site['consumer_key'],
                $site['consumer_secret']
            );
            
            // Check if product already exists on target site
            $existing_mapping = $this->get_product_mapping($product->get_id(), $site['id']);
            
            $product_data = $this->prepare_product_data($product, $site);
            
            if ($existing_mapping) {
                // Update existing product
                $response = $api_client->update_product($existing_mapping['target_product_id'], $product_data);
                
                if (is_wp_error($response)) {
                    throw new Exception($response->get_error_message());
                }
                
                $this->update_product_mapping($existing_mapping['id'], array(
                    'last_sync' => current_time('mysql'),
                    'sync_hash' => $this->generate_product_hash($product)
                ));
                
            } else {
                // Create new product
                $response = $api_client->create_product($product_data);
                
                if (is_wp_error($response)) {
                    throw new Exception($response->get_error_message());
                }
                
                // Create product mapping
                $this->create_product_mapping(array(
                    'source_site_id' => 1, // Assuming current site is source
                    'target_site_id' => $site['id'],
                    'source_product_id' => $product->get_id(),
                    'target_product_id' => $response['id'],
                    'sync_hash' => $this->generate_product_hash($product)
                ));
            }
            
            // Sync product variations if it's a variable product
            if ($product->is_type('variable')) {
                $this->sync_product_variations($product, $site, $response['id'] ?? $existing_mapping['target_product_id']);
            }
            
            // Update site last sync time
            global $wpdb;
            $wpdb->update(
                $wpdb->prefix . 'wc_multi_sync_sites',
                array('last_sync' => current_time('mysql')),
                array('id' => $site['id']),
                array('%s'),
                array('%d')
            );
            
            return array(
                'success' => true,
                'product_id' => $response['id'] ?? $existing_mapping['target_product_id'],
                'action' => $existing_mapping ? 'updated' : 'created'
            );
            
        } catch (Exception $e) {
            return array(
                'success' => false,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Prepare product data for API
     */
    private function prepare_product_data($product, $site) {
        $data = array(
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'type' => $product->get_type(),
            'status' => $product->get_status(),
            'featured' => $product->get_featured(),
            'catalog_visibility' => $product->get_catalog_visibility(),
            'description' => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'sku' => $product->get_sku(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'date_on_sale_from' => $product->get_date_on_sale_from() ? $product->get_date_on_sale_from()->date('c') : null,
            'date_on_sale_to' => $product->get_date_on_sale_to() ? $product->get_date_on_sale_to()->date('c') : null,
            'virtual' => $product->get_virtual(),
            'downloadable' => $product->get_downloadable(),
            'downloads' => $product->get_downloads(),
            'download_limit' => $product->get_download_limit(),
            'download_expiry' => $product->get_download_expiry(),
            'external_url' => $product->get_product_url(),
            'button_text' => $product->get_button_text(),
            'tax_status' => $product->get_tax_status(),
            'tax_class' => $product->get_tax_class(),
            'manage_stock' => $product->get_manage_stock(),
            'stock_quantity' => $product->get_stock_quantity(),
            'stock_status' => $product->get_stock_status(),
            'backorders' => $product->get_backorders(),
            'sold_individually' => $product->get_sold_individually(),
            'weight' => $product->get_weight(),
            'dimensions' => array(
                'length' => $product->get_length(),
                'width' => $product->get_width(),
                'height' => $product->get_height(),
            ),
            'shipping_class' => $product->get_shipping_class(),
            'reviews_allowed' => $product->get_reviews_allowed(),
            'upsell_ids' => $product->get_upsell_ids(),
            'cross_sell_ids' => $product->get_cross_sell_ids(),
            'parent_id' => $product->get_parent_id(),
            'purchase_note' => $product->get_purchase_note(),
            'menu_order' => $product->get_menu_order(),
        );
        
        // Get sync rules for this site
        $rules = $this->get_sync_rules_for_site($site['id']);
        $sync_rule = $this->get_matching_sync_rule($product, $rules);
        
        // Add categories if enabled
        if (!$sync_rule || $sync_rule['sync_categories']) {
            $data['categories'] = $this->prepare_product_categories($product, $site);
        }
        
        // Add tags if enabled
        $data['tags'] = $this->prepare_product_tags($product, $site);
        
        // Add images if enabled
        if (!$sync_rule || $sync_rule['sync_images']) {
            $data['images'] = $this->prepare_product_images($product, $site);
        }
        
        // Add attributes if enabled
        if (!$sync_rule || $sync_rule['sync_attributes']) {
            $data['attributes'] = $this->prepare_product_attributes($product);
        }
        
        // Add custom meta if enabled
        if ($sync_rule && $sync_rule['sync_meta']) {
            $data['meta_data'] = $this->prepare_product_meta($product);
        }
        
        return apply_filters('wc_multi_sync_prepare_product_data', $data, $product, $site);
    }
    
    /**
     * Get sync rules for site
     */
    private function get_sync_rules_for_site($site_id) {
        global $wpdb;
        
        $rules_table = $wpdb->prefix . 'wc_multi_sync_rules';
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $rules_table WHERE site_id = %d AND is_active = 1",
            $site_id
        ), ARRAY_A);
    }
    
    /**
     * Check if product matches sync rule
     */
    private function product_matches_rule($product_id, $rule) {
        $product = wc_get_product($product_id);
        
        if (!$product) {
            return false;
        }
        
        // Check categories
        if (!empty($rule['categories'])) {
            $rule_categories = maybe_unserialize($rule['categories']);
            $product_categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'slugs'));
            
            if (!array_intersect($rule_categories, $product_categories)) {
                return false;
            }
        }
        
        // Check price range
        if (!empty($rule['price_min']) || !empty($rule['price_max'])) {
            $price = floatval($product->get_price());
            
            if (!empty($rule['price_min']) && $price < floatval($rule['price_min'])) {
                return false;
            }
            
            if (!empty($rule['price_max']) && $price > floatval($rule['price_max'])) {
                return false;
            }
        }
        
        // Check stock status
        if (!empty($rule['stock_status'])) {
            if ($product->get_stock_status() !== $rule['stock_status']) {
                return false;
            }
        }
        
        // Check product types
        if (!empty($rule['product_types'])) {
            $rule_types = maybe_unserialize($rule['product_types']);
            if (!in_array($product->get_type(), $rule_types)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Generate hash for product to detect changes
     */
    private function generate_product_hash($product) {
        $data = array(
            'name' => $product->get_name(),
            'description' => $product->get_description(),
            'price' => $product->get_price(),
            'stock_quantity' => $product->get_stock_quantity(),
            'modified' => $product->get_date_modified()->getTimestamp()
        );
        
        return md5(serialize($data));
    }
    
    /**
     * Database operations for product mapping
     */
    private function get_product_mapping($source_product_id, $target_site_id) {
        global $wpdb;
        
        $mapping_table = $wpdb->prefix . 'wc_multi_sync_product_mapping';
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $mapping_table WHERE source_product_id = %d AND target_site_id = %d",
            $source_product_id,
            $target_site_id
        ), ARRAY_A);
    }
    
    private function create_product_mapping($data) {
        global $wpdb;
        
        $mapping_table = $wpdb->prefix . 'wc_multi_sync_product_mapping';
        
        return $wpdb->insert($mapping_table, $data);
    }
    
    private function update_product_mapping($id, $data) {
        global $wpdb;
        
        $mapping_table = $wpdb->prefix . 'wc_multi_sync_product_mapping';
        
        return $wpdb->update(
            $mapping_table,
            $data,
            array('id' => $id),
            null,
            array('%d')
        );
    }
    
    /**
     * Helper methods for preparing different types of product data
     */
    private function prepare_product_categories($product, $site) {
        $categories = array();
        $product_categories = wp_get_post_terms($product->get_id(), 'product_cat');
        
        foreach ($product_categories as $category) {
            $categories[] = array(
                'id' => $this->get_or_create_remote_category($category, $site),
                'name' => $category->name,
                'slug' => $category->slug
            );
        }
        
        return $categories;
    }
    
    private function prepare_product_tags($product, $site) {
        $tags = array();
        $product_tags = wp_get_post_terms($product->get_id(), 'product_tag');
        
        foreach ($product_tags as $tag) {
            $tags[] = array(
                'id' => $this->get_or_create_remote_tag($tag, $site),
                'name' => $tag->name,
                'slug' => $tag->slug
            );
        }
        
        return $tags;
    }
    
    private function prepare_product_images($product, $site) {
        $images = array();
        
        // Featured image
        if ($product->get_image_id()) {
            $image_url = wp_get_attachment_image_url($product->get_image_id(), 'full');
            if ($image_url) {
                $images[] = array(
                    'src' => $image_url,
                    'name' => get_the_title($product->get_image_id()),
                    'alt' => get_post_meta($product->get_image_id(), '_wp_attachment_image_alt', true)
                );
            }
        }
        
        // Gallery images
        $gallery_ids = $product->get_gallery_image_ids();
        foreach ($gallery_ids as $image_id) {
            $image_url = wp_get_attachment_image_url($image_id, 'full');
            if ($image_url) {
                $images[] = array(
                    'src' => $image_url,
                    'name' => get_the_title($image_id),
                    'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true)
                );
            }
        }
        
        return $images;
    }
    
    private function prepare_product_attributes($product) {
        $attributes = array();
        $product_attributes = $product->get_attributes();
        
        foreach ($product_attributes as $attribute) {
            $attributes[] = array(
                'name' => $attribute->get_name(),
                'options' => $attribute->get_options(),
                'visible' => $attribute->get_visible(),
                'variation' => $attribute->get_variation()
            );
        }
        
        return $attributes;
    }
    
    private function prepare_product_meta($product) {
        $meta_data = array();
        $excluded_keys = array('_sku', '_price', '_regular_price', '_sale_price'); // These are handled separately
        
        $all_meta = get_post_meta($product->get_id());
        
        foreach ($all_meta as $key => $value) {
            if (!in_array($key, $excluded_keys) && strpos($key, '_') !== 0) {
                $meta_data[] = array(
                    'key' => $key,
                    'value' => is_array($value) ? $value[0] : $value
                );
            }
        }
        
        return $meta_data;
    }
    
    private function get_or_create_remote_category($category, $site) {
        // Implementation would check if category exists on remote site
        // and create it if it doesn't exist
        return $category->term_id; // Simplified for now
    }
    
    private function get_or_create_remote_tag($tag, $site) {
        // Implementation would check if tag exists on remote site
        // and create it if it doesn't exist
        return $tag->term_id; // Simplified for now
    }
}