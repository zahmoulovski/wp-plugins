<?php
/**
 * API Handler - Manages WooCommerce REST API communications
 */
class WC_Multi_Sync_API {
    
    /**
     * Test connection to destination site
     */
    public function test_connection($site_url, $consumer_key, $consumer_secret) {
        $endpoint = rtrim($site_url, '/') . '/wp-json/wc/v3/products';
        
        $args = array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($consumer_key . ':' . $consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_get($endpoint . '?per_page=1', $args);
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => sprintf(__('Connection failed: %s', 'wc-multi-sync'), $response->get_error_message())
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        
        if ($status_code === 200) {
            return array(
                'success' => true,
                'message' => __('Connection successful', 'wc-multi-sync')
            );
        } elseif ($status_code === 401) {
            return array(
                'success' => false,
                'message' => __('Authentication failed. Please check your API credentials.', 'wc-multi-sync')
            );
        } elseif ($status_code === 404) {
            return array(
                'success' => false,
                'message' => __('WooCommerce REST API not found. Please ensure WooCommerce is installed and API is enabled.', 'wc-multi-sync')
            );
        } else {
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            $error_message = isset($data['message']) ? $data['message'] : sprintf(__('HTTP %d error', 'wc-multi-sync'), $status_code);
            
            return array(
                'success' => false,
                'message' => $error_message
            );
        }
    }
    
    /**
     * Create product on destination site
     */
    public function create_product($site, $product_data) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products';
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($product_data),
            'timeout' => 60,
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        return $this->handle_api_response($response, 'create');
    }
    
    /**
     * Update product on destination site
     */
    public function update_product($site, $product_id, $product_data) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products/' . $product_id;
        
        $args = array(
            'method' => 'PUT',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($product_data),
            'timeout' => 60,
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        return $this->handle_api_response($response, 'update');
    }
    
    /**
     * Delete product from destination site
     */
    public function delete_product($site, $product_id) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products/' . $product_id;
        
        $args = array(
            'method' => 'DELETE',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        return $this->handle_api_response($response, 'delete');
    }
    
    /**
     * Get product from destination site
     */
    public function get_product($site, $product_id) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products/' . $product_id;
        
        $args = array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_get($endpoint, $args);
        
        return $this->handle_api_response($response, 'get');
    }
    
    /**
     * Get products from destination site
     */
    public function get_products($site, $params = array()) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products';
        
        if (!empty($params)) {
            $endpoint .= '?' . http_build_query($params);
        }
        
        $args = array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_get($endpoint, $args);
        
        return $this->handle_api_response($response, 'get_products');
    }
    
    /**
     * Find product by SKU on destination site
     */
    public function find_product_by_sku($site, $sku) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products';
        $params = array(
            'sku' => $sku,
            'per_page' => 1
        );
        $endpoint .= '?' . http_build_query($params);
        
        $args = array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_get($endpoint, $args);
        $result = $this->handle_api_response($response, 'find_by_sku');
        
        // Return the first product if found
        if ($result['success'] && isset($result['data'][0])) {
            return array(
                'success' => true,
                'data' => $result['data'][0]
            );
        }
        
        return array(
            'success' => false,
            'message' => __('Product not found by SKU', 'wc-multi-sync')
        );
    }
    
    /**
     * Create category on destination site
     */
    public function create_category($site, $category_data) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products/categories';
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($category_data),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        return $this->handle_api_response($response, 'create_category');
    }
    
    /**
     * Get categories from destination site
     */
    public function get_categories($site, $params = array()) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products/categories';
        
        if (!empty($params)) {
            $endpoint .= '?' . http_build_query($params);
        }
        
        $args = array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_get($endpoint, $args);
        
        return $this->handle_api_response($response, 'get_categories');
    }
    
    /**
     * Handle API response
     */
    private function handle_api_response($response, $action) {
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => sprintf(__('API request failed: %s', 'wc-multi-sync'), $response->get_error_message()),
                'data' => null
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        // Success status codes
        $success_codes = array(200, 201);
        
        if (in_array($status_code, $success_codes)) {
            return array(
                'success' => true,
                'message' => $this->get_success_message($action),
                'data' => $data
            );
        }
        
        // Handle specific error codes
        switch ($status_code) {
            case 400:
                $error_message = isset($data['message']) ? $data['message'] : __('Bad request', 'wc-multi-sync');
                break;
                
            case 401:
                $error_message = __('Authentication failed', 'wc-multi-sync');
                break;
                
            case 403:
                $error_message = __('Access forbidden', 'wc-multi-sync');
                break;
                
            case 404:
                $error_message = __('Resource not found', 'wc-multi-sync');
                break;
                
            case 500:
                $error_message = __('Internal server error on destination site', 'wc-multi-sync');
                break;
                
            default:
                $error_message = isset($data['message']) ? $data['message'] : sprintf(__('HTTP %d error', 'wc-multi-sync'), $status_code);
        }
        
        return array(
            'success' => false,
            'message' => $error_message,
            'data' => $data,
            'status_code' => $status_code
        );
    }
    
    /**
     * Get success message for action
     */
    private function get_success_message($action) {
        switch ($action) {
            case 'create':
                return __('Product created successfully', 'wc-multi-sync');
            case 'update':
                return __('Product updated successfully', 'wc-multi-sync');
            case 'delete':
                return __('Product deleted successfully', 'wc-multi-sync');
            case 'get':
                return __('Product retrieved successfully', 'wc-multi-sync');
            case 'get_products':
                return __('Products retrieved successfully', 'wc-multi-sync');
            case 'create_category':
                return __('Category created successfully', 'wc-multi-sync');
            case 'get_categories':
                return __('Categories retrieved successfully', 'wc-multi-sync');
            default:
                return __('Operation completed successfully', 'wc-multi-sync');
        }
    }
    
    /**
     * Batch create/update products
     */
    public function batch_products($site, $products_data) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/products/batch';
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'body' => json_encode($products_data),
            'timeout' => 120, // Longer timeout for batch operations
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        return $this->handle_api_response($response, 'batch');
    }
    
    /**
     * Upload image to destination site
     */
    public function upload_image($site, $image_url, $image_name = '') {
        // First, download the image
        $image_response = wp_remote_get($image_url, array('timeout' => 30));
        
        if (is_wp_error($image_response)) {
            return array(
                'success' => false,
                'message' => sprintf(__('Failed to download image: %s', 'wc-multi-sync'), $image_response->get_error_message())
            );
        }
        
        $image_data = wp_remote_retrieve_body($image_response);
        $content_type = wp_remote_retrieve_header($image_response, 'content-type');
        
        // Determine file extension
        $extension = '';
        if (strpos($content_type, 'image/jpeg') !== false) {
            $extension = '.jpg';
        } elseif (strpos($content_type, 'image/png') !== false) {
            $extension = '.png';
        } elseif (strpos($content_type, 'image/gif') !== false) {
            $extension = '.gif';
        }
        
        if (empty($image_name)) {
            $image_name = 'product-image-' . time() . $extension;
        } elseif (!pathinfo($image_name, PATHINFO_EXTENSION)) {
            $image_name .= $extension;
        }
        
        // Upload to destination site
        $endpoint = rtrim($site->url, '/') . '/wp-json/wp/v2/media';
        
        $boundary = wp_generate_password(24);
        $body = '';
        $body .= '--' . $boundary . "\r\n";
        $body .= 'Content-Disposition: form-data; name="file"; filename="' . $image_name . '"' . "\r\n";
        $body .= 'Content-Type: ' . $content_type . "\r\n\r\n";
        $body .= $image_data . "\r\n";
        $body .= '--' . $boundary . '--';
        
        $args = array(
            'method' => 'POST',
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'multipart/form-data; boundary=' . $boundary
            ),
            'body' => $body,
            'timeout' => 60,
            'sslverify' => false
        );
        
        $response = wp_remote_request($endpoint, $args);
        
        return $this->handle_api_response($response, 'upload_image');
    }
    
    /**
     * Get site system status
     */
    public function get_system_status($site) {
        $endpoint = rtrim($site->url, '/') . '/wp-json/wc/v3/system_status';
        
        $args = array(
            'headers' => array(
                'Authorization' => 'Basic ' . base64_encode($site->consumer_key . ':' . $site->consumer_secret),
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30,
            'sslverify' => false
        );
        
        $response = wp_remote_get($endpoint, $args);
        
        return $this->handle_api_response($response, 'system_status');
    }
}