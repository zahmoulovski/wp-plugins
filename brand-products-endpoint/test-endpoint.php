<?php
/**
 * Test script for Brand Products Custom Endpoint
 * 
 * This file can be used to test the plugin functionality
 * Upload to your WordPress root and access via browser
 */

// Prevent direct access if not testing
if (!defined('ABSPATH')) {
    define('WP_USE_THEMES', false);
    require_once('./wp-load.php');
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Brand Products Endpoint Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; background: #f9f9f9; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
        .endpoint { font-family: monospace; background: #e8e8e8; padding: 5px; }
    </style>
</head>
<body>
    <h1>Brand Products Custom Endpoint Test</h1>
    
    <div class="test-section">
        <h2>Plugin Status</h2>
        <?php
        $plugin_active = class_exists('Brand_Products_Endpoint');
        echo $plugin_active ? 
            '<p class="success">✓ Plugin is active</p>' : 
            '<p class="error">✗ Plugin is NOT active</p>';
        ?>
    </div>
    
    <div class="test-section">
        <h2>Available Brands</h2>
        <?php
        $brands = get_terms(array(
            'taxonomy' => 'pa_marques',
            'hide_empty' => false,
        ));
        
        if (!is_wp_error($brands) && !empty($brands)) {
            echo '<p class="success">Found ' . count($brands) . ' brands:</p>';
            echo '<ul>';
            foreach ($brands as $brand) {
                echo '<li><strong>' . esc_html($brand->name) . '</strong> (slug: ' . esc_html($brand->slug) . ', products: ' . $brand->count . ')</li>';
            }
            echo '</ul>';
        } else {
            echo '<p class="error">No brands found or error: ' . (is_wp_error($brands) ? $brands->get_error_message() : 'No brands') . '</p>';
        }
        ?>
    </div>
    
    <div class="test-section">
        <h2>REST API Endpoints</h2>
        <p>Test these endpoints:</p>
        <ul>
            <li><span class="endpoint"><?php echo home_url('/wp-json/mobile-app/v1/brands'); ?></span> - List all brands</li>
            <li><span class="endpoint"><?php echo home_url('/wp-json/mobile-app/v1/brand-products/ARDUINO'); ?></span> - Get ARDUINO products</li>
        </ul>
        
        <?php
        // Test if REST API is working
        $rest_url = home_url('/wp-json/mobile-app/v1/brands');
        $response = wp_remote_get($rest_url);
        
        if (!is_wp_error($response)) {
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            if (isset($data['success']) && $data['success']) {
                echo '<p class="success">✓ REST API endpoint is working</p>';
                echo '<p>Available brands: ' . count($data['brands']) . '</p>';
            } else {
                echo '<p class="error">✗ REST API returned error: ' . esc_html($data['message'] ?? 'Unknown error') . '</p>';
            }
        } else {
            echo '<p class="error">✗ REST API request failed: ' . esc_html($response->get_error_message()) . '</p>';
        }
        ?>
    </div>
    
    <div class="test-section">
        <h2>Debug Information</h2>
        <?php
        // Check if WooCommerce is active
        if (class_exists('WooCommerce')) {
            echo '<p class="success">✓ WooCommerce is active</p>';
            
            // Check if pa_marques attribute exists
            $attributes = wc_get_attribute_taxonomies();
            $marques_attribute = null;
            foreach ($attributes as $attribute) {
                if ($attribute->attribute_name === 'marques') {
                    $marques_attribute = $attribute;
                    break;
                }
            }
            
            if ($marques_attribute) {
                echo '<p class="success">✓ pa_marques attribute found (ID: ' . $marques_attribute->attribute_id . ')</p>';
            } else {
                echo '<p class="error">✗ pa_marques attribute not found</p>';
            }
        } else {
            echo '<p class="error">✗ WooCommerce is NOT active</p>';
        }
        
        // Check permalinks
        $permalink_structure = get_option('permalink_structure');
        if (!empty($permalink_structure)) {
            echo '<p class="success">✓ Permalinks are enabled</p>';
        } else {
            echo '<p class="error">✗ Permalinks are disabled - this may cause 404 errors</p>';
        }
        ?>
    </div>
    
    <div class="test-section">
        <h2>Sample Test</h2>
        <?php
        // Test with a specific brand if available
        if (!empty($brands) && !is_wp_error($brands)) {
            $test_brand = $brands[0];
            echo '<p>Testing with brand: <strong>' . esc_html($test_brand->name) . '</strong></p>';
            
            $test_url = home_url('/wp-json/mobile-app/v1/brand-products/' . $test_brand->slug);
            echo '<p>Test URL: <span class="endpoint">' . esc_html($test_url) . '</span></p>';
            
            $test_response = wp_remote_get($test_url);
            
            if (!is_wp_error($test_response)) {
                $test_body = wp_remote_retrieve_body($test_response);
                $test_data = json_decode($test_body, true);
                
                if (isset($test_data['success']) && $test_data['success']) {
                    echo '<p class="success">✓ Brand products endpoint working</p>';
                    echo '<p>Found ' . $test_data['found_products'] . ' products</p>';
                    echo '<details><summary>Full Response</summary><pre>' . esc_html($test_body) . '</pre></details>';
                } else {
                    echo '<p class="error">✗ Brand products endpoint error: ' . esc_html($test_data['message'] ?? 'Unknown error') . '</p>';
                    echo '<details><summary>Error Response</summary><pre>' . esc_html($test_body) . '</pre></details>';
                }
            } else {
                echo '<p class="error">✗ Brand products test failed: ' . esc_html($test_response->get_error_message()) . '</p>';
            }
        }
        ?>
    </div>
    
    <div class="test-section">
        <h2>Next Steps</h2>
        <ol>
            <li>If all tests pass, your plugin is working correctly</li>
            <li>Update your React app to use the new endpoints</li>
            <li>Test with different brands from your store</li>
            <li>Monitor the WordPress debug log for any issues</li>
        </ol>
    </div>
    
    <div class="test-section">
        <h2>Manual Testing URLs</h2>
        <p>Open these URLs in your browser to test:</p>
        <ul>
            <li><a href="<?php echo home_url('/wp-json/mobile-app/v1/brands'); ?>" target="_blank">List All Brands</a></li>
            <?php if (!empty($brands) && !is_wp_error($brands)): ?>
                <li><a href="<?php echo home_url('/wp-json/mobile-app/v1/brand-products/' . $brands[0]->slug); ?>" target="_blank">Test <?php echo esc_html($brands[0]->name); ?> Products</a></li>
            <?php endif; ?>
        </ul>
    </div>
    
</body>
</html>