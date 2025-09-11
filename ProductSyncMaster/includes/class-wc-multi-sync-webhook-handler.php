<?php
/**
 * Webhook Handler - Handles incoming webhooks from destination sites
 */
class WC_Multi_Sync_Webhook_Handler {
    
    public function __construct() {
        add_action('init', array($this, 'add_webhook_endpoints'));
        add_action('parse_request', array($this, 'handle_webhook_request'));
    }
    
    /**
     * Add webhook endpoints
     */
    public function add_webhook_endpoints() {
        add_rewrite_rule(
            '^wc-multi-sync/webhook/([^/]+)/?',
            'index.php?wc_multi_sync_webhook=1&site_key=$matches[1]',
            'top'
        );
        
        add_filter('query_vars', function($vars) {
            $vars[] = 'wc_multi_sync_webhook';
            $vars[] = 'site_key';
            return $vars;
        });
    }
    
    /**
     * Handle webhook requests
     */
    public function handle_webhook_request($wp) {
        if (!isset($wp->query_vars['wc_multi_sync_webhook'])) {
            return;
        }
        
        $site_key = isset($wp->query_vars['site_key']) ? $wp->query_vars['site_key'] : '';
        
        if (empty($site_key)) {
            wp_die('Invalid webhook URL', 'Webhook Error', array('response' => 400));
        }
        
        // Verify site key
        $site = $this->get_site_by_key($site_key);
        if (!$site) {
            wp_die('Invalid site key', 'Webhook Error', array('response' => 403));
        }
        
        // Get webhook payload
        $payload = file_get_contents('php://input');
        $data = json_decode($payload, true);
        
        if (!$data) {
            wp_die('Invalid JSON payload', 'Webhook Error', array('response' => 400));
        }
        
        // Process webhook
        $this->process_webhook($site, $data);
        
        // Send success response
        status_header(200);
        echo json_encode(array('status' => 'success'));
        exit;
    }
    
    /**
     * Process webhook data
     */
    private function process_webhook($site, $data) {
        $action = isset($data['action']) ? $data['action'] : '';
        $product_data = isset($data['product']) ? $data['product'] : array();
        
        switch ($action) {
            case 'product.created':
                $this->handle_product_created($site, $product_data);
                break;
                
            case 'product.updated':
                $this->handle_product_updated($site, $product_data);
                break;
                
            case 'product.deleted':
                $this->handle_product_deleted($site, $product_data);
                break;
                
            case 'order.created':
                $this->handle_order_created($site, $data);
                break;
                
            default:
                WC_Multi_Sync_Database::add_log(
                    'webhook_unknown',
                    sprintf(__('Unknown webhook action: %s from site %s', 'wc-multi-sync'), $action, $site->name),
                    null,
                    $site->id,
                    $data
                );
        }
    }
    
    /**
     * Handle product created webhook
     */
    private function handle_product_created($site, $product_data) {
        if (!isset($product_data['id'])) {
            return;
        }
        
        WC_Multi_Sync_Database::add_log(
            'webhook_product_created',
            sprintf(__('Product created on %s: %s', 'wc-multi-sync'), $site->name, $product_data['name'] ?? 'Unknown'),
            null,
            $site->id,
            $product_data
        );
    }
    
    /**
     * Handle product updated webhook
     */
    private function handle_product_updated($site, $product_data) {
        if (!isset($product_data['id'])) {
            return;
        }
        
        // Check if this is a product we're managing
        $mapping = $this->get_local_product_by_remote_id($product_data['id'], $site->id);
        
        if ($mapping) {
            WC_Multi_Sync_Database::add_log(
                'webhook_product_updated',
                sprintf(__('Managed product updated on %s: %s', 'wc-multi-sync'), $site->name, $product_data['name'] ?? 'Unknown'),
                $mapping->local_product_id,
                $site->id,
                $product_data
            );
        } else {
            WC_Multi_Sync_Database::add_log(
                'webhook_product_updated',
                sprintf(__('External product updated on %s: %s', 'wc-multi-sync'), $site->name, $product_data['name'] ?? 'Unknown'),
                null,
                $site->id,
                $product_data
            );
        }
    }
    
    /**
     * Handle product deleted webhook
     */
    private function handle_product_deleted($site, $product_data) {
        if (!isset($product_data['id'])) {
            return;
        }
        
        // Check if this was a product we were managing
        $mapping = $this->get_local_product_by_remote_id($product_data['id'], $site->id);
        
        if ($mapping) {
            // Remove the mapping since the remote product is gone
            global $wpdb;
            $table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
            $wpdb->delete($table, array('id' => $mapping->id), array('%d'));
            
            WC_Multi_Sync_Database::add_log(
                'webhook_product_deleted',
                sprintf(__('Managed product deleted on %s, mapping removed', 'wc-multi-sync'), $site->name),
                $mapping->local_product_id,
                $site->id,
                $product_data
            );
        }
    }
    
    /**
     * Handle order created webhook (for inventory sync)
     */
    private function handle_order_created($site, $data) {
        $settings = get_option('wc_multi_sync_settings', array());
        
        // Only process if inventory sync is enabled
        if (($settings['sync_inventory'] ?? 'no') !== 'yes') {
            return;
        }
        
        $order_data = isset($data['order']) ? $data['order'] : array();
        $line_items = isset($order_data['line_items']) ? $order_data['line_items'] : array();
        
        foreach ($line_items as $item) {
            if (!isset($item['product_id'])) {
                continue;
            }
            
            // Find local product mapping
            $mapping = $this->get_local_product_by_remote_id($item['product_id'], $site->id);
            
            if ($mapping) {
                // Queue inventory sync for this product
                WC_Multi_Sync_Database::add_sync_job($mapping->local_product_id, $site->id, 'stock_changed');
                
                WC_Multi_Sync_Database::add_log(
                    'webhook_inventory_sync',
                    sprintf(__('Inventory sync queued for product after order on %s', 'wc-multi-sync'), $site->name),
                    $mapping->local_product_id,
                    $site->id
                );
            }
        }
    }
    
    /**
     * Get site by webhook key
     */
    private function get_site_by_key($key) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        // For security, we'll hash the site ID to create the key
        $sites = $wpdb->get_results("SELECT * FROM $table WHERE is_active = 1");
        
        foreach ($sites as $site) {
            $site_key = $this->generate_site_key($site->id);
            if ($site_key === $key) {
                return $site;
            }
        }
        
        return null;
    }
    
    /**
     * Generate webhook key for site
     */
    public function generate_site_key($site_id) {
        return hash('sha256', $site_id . get_option('nonce_salt', 'wc-multi-sync'));
    }
    
    /**
     * Get webhook URL for site
     */
    public function get_webhook_url($site_id) {
        $site_key = $this->generate_site_key($site_id);
        return home_url('/wc-multi-sync/webhook/' . $site_key);
    }
    
    /**
     * Get local product by remote product ID
     */
    private function get_local_product_by_remote_id($remote_product_id, $site_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE remote_product_id = %d AND site_id = %d",
            $remote_product_id,
            $site_id
        ));
    }
    
    /**
     * Register webhooks on destination sites
     */
    public function register_webhooks_on_site($site_id) {
        $site = WC_Multi_Sync_Database::get_site($site_id);
        if (!$site) {
            return false;
        }
        
        $webhook_url = $this->get_webhook_url($site_id);
        $api = new WC_Multi_Sync_API();
        
        $webhooks = array(
            array(
                'name' => 'WC Multi-Sync Product Created',
                'topic' => 'product.created',
                'delivery_url' => $webhook_url,
                'status' => 'active'
            ),
            array(
                'name' => 'WC Multi-Sync Product Updated',
                'topic' => 'product.updated',
                'delivery_url' => $webhook_url,
                'status' => 'active'
            ),
            array(
                'name' => 'WC Multi-Sync Product Deleted',
                'topic' => 'product.deleted',
                'delivery_url' => $webhook_url,
                'status' => 'active'
            )
        );
        
        // Add order webhook if inventory sync is enabled
        $settings = get_option('wc_multi_sync_settings', array());
        if (($settings['sync_inventory'] ?? 'no') === 'yes') {
            $webhooks[] = array(
                'name' => 'WC Multi-Sync Order Created',
                'topic' => 'order.created',
                'delivery_url' => $webhook_url,
                'status' => 'active'
            );
        }
        
        $results = array();
        foreach ($webhooks as $webhook_data) {
            $result = $this->create_webhook_on_site($site, $webhook_data);
            $results[] = $result;
        }
        
        return $results;
    }
    
    /**
     * Create webhook on destination site
     */
    private function create_webhook_on_site($site, $webhook_data) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/webhooks';
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($webhook_data),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($status_code === 201) {
            WC_Multi_Sync_Database::add_log(
                'webhook_created',
                sprintf(__('Webhook created on %s: %s', 'wc-multi-sync'), $site->name, $webhook_data['name']),
                null,
                $site->id,
                $data
            );
            
            return array(
                'success' => true,
                'webhook_id' => $data['id'] ?? null,
                'data' => $data
            );
        } else {
            $error_message = isset($data['message']) ? $data['message'] : sprintf(__('HTTP %d error', 'wc-multi-sync'), $status_code);
            
            WC_Multi_Sync_Database::add_log(
                'webhook_error',
                sprintf(__('Failed to create webhook on %s: %s', 'wc-multi-sync'), $site->name, $error_message),
                null,
                $site->id
            );
            
            return array(
                'success' => false,
                'message' => $error_message
            );
        }
    }
}