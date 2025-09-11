<?php
/**
 * WooCommerce API Client for remote site communication
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Multi_Sync_API_Client {
    
    private $site_url;
    private $consumer_key;
    private $consumer_secret;
    private $timeout;
    
    public function __construct($site_url, $consumer_key, $consumer_secret, $timeout = 30) {
        $this->site_url = rtrim($site_url, '/');
        $this->consumer_key = $consumer_key;
        $this->consumer_secret = $consumer_secret;
        $this->timeout = $timeout;
    }
    
    /**
     * Test connection to remote WooCommerce site
     */
    public function test_connection() {
        try {
            $response = $this->request('GET', '/products', array('per_page' => 1));
            
            if (is_wp_error($response)) {
                return array(
                    'success' => false,
                    'error' => $response->get_error_message()
                );
            }
            
            return array('success' => true);
            
        } catch (Exception $e) {
            return array(
                'success' => false,
                'error' => $e->getMessage()
            );
        }
    }
    
    /**
     * Get products from remote site
     */
    public function get_products($args = array()) {
        $defaults = array(
            'per_page' => 100,
            'page' => 1,
            'status' => 'publish'
        );
        
        $args = wp_parse_args($args, $defaults);
        
        return $this->request('GET', '/products', $args);
    }
    
    /**
     * Get single product from remote site
     */
    public function get_product($product_id) {
        return $this->request('GET', "/products/{$product_id}");
    }
    
    /**
     * Create product on remote site
     */
    public function create_product($product_data) {
        return $this->request('POST', '/products', $product_data);
    }
    
    /**
     * Update product on remote site
     */
    public function update_product($product_id, $product_data) {
        return $this->request('PUT', "/products/{$product_id}", $product_data);
    }
    
    /**
     * Delete product on remote site
     */
    public function delete_product($product_id, $force = false) {
        $args = array();
        if ($force) {
            $args['force'] = true;
        }
        
        return $this->request('DELETE', "/products/{$product_id}", $args);
    }
    
    /**
     * Get product variations
     */
    public function get_product_variations($product_id, $args = array()) {
        $defaults = array('per_page' => 100);
        $args = wp_parse_args($args, $defaults);
        
        return $this->request('GET', "/products/{$product_id}/variations", $args);
    }
    
    /**
     * Create product variation
     */
    public function create_product_variation($product_id, $variation_data) {
        return $this->request('POST', "/products/{$product_id}/variations", $variation_data);
    }
    
    /**
     * Update product variation
     */
    public function update_product_variation($product_id, $variation_id, $variation_data) {
        return $this->request('PUT', "/products/{$product_id}/variations/{$variation_id}", $variation_data);
    }
    
    /**
     * Get categories from remote site
     */
    public function get_categories($args = array()) {
        $defaults = array('per_page' => 100);
        $args = wp_parse_args($args, $defaults);
        
        return $this->request('GET', '/products/categories', $args);
    }
    
    /**
     * Create category on remote site
     */
    public function create_category($category_data) {
        return $this->request('POST', '/products/categories', $category_data);
    }
    
    /**
     * Get tags from remote site
     */
    public function get_tags($args = array()) {
        $defaults = array('per_page' => 100);
        $args = wp_parse_args($args, $defaults);
        
        return $this->request('GET', '/products/tags', $args);
    }
    
    /**
     * Create tag on remote site
     */
    public function create_tag($tag_data) {
        return $this->request('POST', '/products/tags', $tag_data);
    }
    
    /**
     * Get attributes from remote site
     */
    public function get_attributes($args = array()) {
        return $this->request('GET', '/products/attributes', $args);
    }
    
    /**
     * Upload media to remote site
     */
    public function upload_media($file_path, $filename = null) {
        if (!file_exists($file_path)) {
            return new WP_Error('file_not_found', 'File not found: ' . $file_path);
        }
        
        $filename = $filename ?: basename($file_path);
        $file_data = file_get_contents($file_path);
        
        $boundary = wp_generate_password(24);
        $body = '';
        
        // Add file data
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$filename}\"\r\n";
        $body .= "Content-Type: " . wp_get_image_mime($file_path) . "\r\n\r\n";
        $body .= $file_data . "\r\n";
        $body .= "--{$boundary}--\r\n";
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($this->consumer_key . ':' . $this->consumer_secret),
                'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
            ),
            'body' => $body,
            'timeout' => $this->timeout * 2, // Double timeout for uploads
        );
        
        $url = $this->site_url . '/wp-json/wp/v2/media';
        
        return wp_remote_request($url, $args);
    }
    
    /**
     * Make API request to remote site
     */
    private function request($method, $endpoint, $data = array()) {
        $url = $this->build_url($endpoint, $method === 'GET' ? $data : array());
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($this->consumer_key . ':' . $this->consumer_secret),
                'Content-Type' => 'application/json',
                'User-Agent' => 'WC Multi-Site Sync/' . WC_MULTI_SYNC_VERSION,
            ),
            'timeout' => $this->timeout,
            'sslverify' => false, // Allow self-signed certificates in development
        );
        
        if ($method !== 'GET' && !empty($data)) {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            WC_Multi_Sync_Database::log_activity(array(
                'action' => 'api_request_failed',
                'status' => 'error',
                'message' => sprintf('API request failed: %s %s', $method, $endpoint),
                'details' => json_encode(array(
                    'url' => $url,
                    'error' => $response->get_error_message()
                ))
            ));
            
            return $response;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        
        // Log failed requests
        if ($response_code >= 400) {
            WC_Multi_Sync_Database::log_activity(array(
                'action' => 'api_request_failed',
                'status' => 'error',
                'message' => sprintf('API request failed with code %d: %s %s', $response_code, $method, $endpoint),
                'details' => json_encode(array(
                    'url' => $url,
                    'response_code' => $response_code,
                    'response_body' => $response_body
                ))
            ));
            
            return new WP_Error('api_error', sprintf('API request failed with code %d', $response_code), array(
                'response_code' => $response_code,
                'response_body' => $response_body
            ));
        }
        
        $decoded_response = json_decode($response_body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_decode_error', 'Failed to decode JSON response: ' . json_last_error_msg());
        }
        
        return $decoded_response;
    }
    
    /**
     * Build API URL with query parameters
     */
    private function build_url($endpoint, $query_params = array()) {
        $url = $this->site_url . '/wp-json/wc/v3' . $endpoint;
        
        if (!empty($query_params)) {
            $url .= '?' . http_build_query($query_params);
        }
        
        return $url;
    }
    
    /**
     * Get API rate limit info from response headers
     */
    public function get_rate_limit_info($response) {
        if (is_wp_error($response)) {
            return null;
        }
        
        $headers = wp_remote_retrieve_headers($response);
        
        return array(
            'limit' => isset($headers['x-wc-api-rate-limit']) ? $headers['x-wc-api-rate-limit'] : null,
            'remaining' => isset($headers['x-wc-api-rate-limit-remaining']) ? $headers['x-wc-api-rate-limit-remaining'] : null,
            'reset' => isset($headers['x-wc-api-rate-limit-reset']) ? $headers['x-wc-api-rate-limit-reset'] : null,
        );
    }
}