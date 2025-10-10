<?php
/**
 * Plugin Name: Brand Products Custom Endpoint
 * Plugin URI: https://klarrion.com
 * Description: Custom REST API endpoint for brand products with better filtering than WooCommerce's attribute system
 * Version: 1.1.0
 * Author: Klarrion
 * Author URI: https://klarrion.com
 * License: GPL v2 or later
 * Text Domain: brand-products-endpoint
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BPE_VERSION', '1.0.0');
define('BPE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BPE_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main plugin class
 */
class Brand_Products_Endpoint {
    
    /**
     * Initialize the plugin
     */
    public function __construct() {
        // Add CORS headers BEFORE anything else
        add_action('init', array($this, 'add_cors_headers_early'), 1);
        add_action('rest_api_init', array($this, 'register_routes'), 10);
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        
        // Force CORS headers on all requests
        add_action('send_headers', array($this, 'force_cors_headers'));
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers_filter'), 0, 4);
    }
    
    /**
     * Add CORS headers very early in the request
     */
    public function add_cors_headers_early() {
        // Remove default WordPress CORS headers
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        
        // Set our custom CORS headers
        $this->set_cors_headers();
    }
    
    /**
     * Force CORS headers on all requests
     */
    public function force_cors_headers() {
        if (strpos($_SERVER['REQUEST_URI'], '/wp-json/mobile-app/v1/') !== false) {
            $this->set_cors_headers();
        }
    }
    
    /**
     * Set CORS headers
     */
    private function set_cors_headers() {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
        
        // Allow all origins for now (you can restrict this later)
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, X-WP-Nonce');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
        
        // Handle preflight requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            header('Access-Control-Max-Age: 86400');
            header('Content-Length: 0');
            header('HTTP/1.1 200 OK');
            exit(0);
        }
    }
    
    /**
     * Load plugin text domain for translations
     */
    public function load_textdomain() {
        load_plugin_textdomain('brand-products-endpoint', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Add CORS headers for cross-origin requests
     */
    public function add_cors_headers() {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers_filter'), 0, 4);
    }
    
    /**
     * CORS headers filter
     */
    public function add_cors_headers_filter($value, $result, $request, $server) {
        $this->set_cors_headers();
        return $value;
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Register the main route with public access
        register_rest_route('mobile-app/v1', '/brand-products/(?P<brand_name>[a-zA-Z0-9-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_brand_products'),
            'permission_callback' => '__return_true', // Public access - no authentication required
            'args' => array(
                'brand_name' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Brand name (slug)',
                    'sanitize_callback' => 'sanitize_text_field',
                ),
                'per_page' => array(
                    'default' => 100,
                    'type' => 'integer',
                    'description' => 'Number of products per page',
                    'sanitize_callback' => 'absint',
                    'validate_callback' => function($param) {
                        return $param > 0 && $param <= 200;
                    }
                ),
                'page' => array(
                    'default' => 1,
                    'type' => 'integer',
                    'description' => 'Page number',
                    'sanitize_callback' => 'absint',
                    'validate_callback' => function($param) {
                        return $param > 0;
                    }
                ),
            ),
        ));
        
        // Additional route for testing/debugging
        register_rest_route('mobile-app/v1', '/brands', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_all_brands'),
            'permission_callback' => '__return_true',
            'args' => array(
                'per_page' => array(
                    'default' => 50,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
    }
    
    /**
     * Get all available brands (for debugging)
     */
    public function get_all_brands($request) {
        $per_page = $request->get_param('per_page');
        
        $attribute_taxonomy = 'pa_marques';
        $terms = get_terms(array(
            'taxonomy' => $attribute_taxonomy,
            'hide_empty' => false,
            'number' => $per_page,
        ));
        
        if (is_wp_error($terms)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => $terms->get_error_message(),
            ), 500);
        }
        
        return new WP_REST_Response(array(
            'success' => true,
            'total_brands' => count($terms),
            'brands' => array_map(function($term) {
                return array(
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                    'count' => $term->count,
                );
            }, $terms),
        ), 200);
    }
    
    /**
     * Get brand products
     */
    public function get_brand_products($request) {
        $brand_name = $request->get_param('brand_name');
        $per_page = $request->get_param('per_page');
        $page = $request->get_param('page');
        
        // Log the request for debugging
        error_log("Brand products request for: " . $brand_name);
        
        // First, get the pa_marques attribute
        $attribute_taxonomy = 'pa_marques';
        
        // Try to get the brand term by slug first
        $brand_term = get_term_by('slug', $brand_name, $attribute_taxonomy);
        
        // If not found by slug, try to find by name (case-insensitive)
        if (!$brand_term) {
            $all_terms = get_terms(array(
                'taxonomy' => $attribute_taxonomy,
                'hide_empty' => false,
            ));
            
            foreach ($all_terms as $term) {
                if (strcasecmp($term->name, $brand_name) === 0) {
                    $brand_term = $term;
                    break;
                }
            }
        }
        
        // If still not found, try to create a more flexible search
        if (!$brand_term) {
            $all_terms = get_terms(array(
                'taxonomy' => $attribute_taxonomy,
                'hide_empty' => false,
                'search' => $brand_name,
            ));
            
            if (!empty($all_terms) && !is_wp_error($all_terms)) {
                $brand_term = $all_terms[0]; // Take the first match
            }
        }
        
        if (!$brand_term || is_wp_error($brand_term)) {
            error_log("Brand term not found: " . $brand_name);
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Brand not found: ' . $brand_name,
                'searched_brand' => $brand_name,
                'available_brands' => $this->get_available_brands_list(),
            ), 404);
        }
        
        error_log("Found brand term: " . $brand_term->name . " (ID: " . $brand_term->term_id . ")");
        
        // Get products with this brand - order by stock status (in stock first), then by title
        $args = array(
            'post_type' => 'product',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'post_status' => 'publish',
            'tax_query' => array(
                array(
                    'taxonomy' => $attribute_taxonomy,
                    'field' => 'term_id',
                    'terms' => $brand_term->term_id,
                    'operator' => 'IN',
                ),
            ),
            'meta_key' => '_stock_status',
            'orderby' => 'meta_value',
            'order' => 'DESC',
        );
        
        // Add filter to allow other plugins to modify the query
        $args = apply_filters('bpe_product_query_args', $args, $brand_term);
        
        $query = new WP_Query($args);
        
        error_log("SQL Query: " . $query->request);
        error_log("Found " . $query->found_posts . " total products");
        error_log("Current page has " . count($query->posts) . " products");
        
        $products = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $product_id = get_the_ID();
                $product = wc_get_product($product_id);
                
                if ($product) {
                    // Get product images
                    $images = array();
                    $main_image_id = $product->get_image_id();
                    if ($main_image_id) {
                        $main_image = wp_get_attachment_image_src($main_image_id, 'full');
                        if ($main_image) {
                            $images[] = array(
                                'id' => $main_image_id,
                                'src' => $main_image[0],
                                'alt' => get_post_meta($main_image_id, '_wp_attachment_image_alt', true),
                                'name' => get_the_title($main_image_id),
                            );
                        }
                    }
                    
                    // Get gallery images
                    $gallery_image_ids = $product->get_gallery_image_ids();
                    foreach ($gallery_image_ids as $image_id) {
                        $image = wp_get_attachment_image_src($image_id, 'full');
                        if ($image) {
                            $images[] = array(
                                'id' => $image_id,
                                'src' => $image[0],
                                'alt' => get_post_meta($image_id, '_wp_attachment_image_alt', true),
                                'name' => get_the_title($image_id),
                            );
                        }
                    }
                    
                    // Get categories
                    $categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'names'));
                    if (is_wp_error($categories)) {
                        $categories = array();
                    }
                    
                    // Get attributes
                    $attributes = array();
                    foreach ($product->get_attributes() as $attribute) {
                        if ($attribute->get_name() === 'pa_marques') {
                            continue; // Skip the brand attribute since we're filtering by it
                        }
                        
                        $attributes[] = array(
                            'name' => $attribute->get_name(),
                            'options' => $attribute->get_options(),
                        );
                    }
                    
                    $products[] = array(
                        'id' => $product->get_id(),
                        'name' => $product->get_name(),
                        'slug' => $product->get_slug(),
                        'price' => $product->get_price(),
                        'regular_price' => $product->get_regular_price(),
                        'sale_price' => $product->get_sale_price(),
                        'description' => $product->get_description(),
                        'short_description' => $product->get_short_description(),
                        'sku' => $product->get_sku(),
                        'stock_quantity' => $product->get_stock_quantity(),
                        'stock_status' => $product->get_stock_status(),
                        'images' => $images,
                        'categories' => $categories,
                        'attributes' => $attributes,
                        'permalink' => $product->get_permalink(),
                    );
                }
            }
            wp_reset_postdata();
        }
        
        // Sort products: out-of-stock last, others first (no preference between instock and backorder)
        usort($products, function($a, $b) {
            // Out-of-stock should come last (1), everything else first (0)
            $a_priority = ($a['stock_status'] === 'outofstock') ? 1 : 0;
            $b_priority = ($b['stock_status'] === 'outofstock') ? 1 : 0;
            
            if ($a_priority != $b_priority) {
                return $a_priority - $b_priority; // 0 before 1 (out-of-stock last)
            }
            return strcasecmp($a['name'], $b['name']); // Then alphabetical by name (case-insensitive)
        });
        
        error_log("Returning " . count($products) . " products for brand: " . $brand_name);
        
        return new WP_REST_Response(array(
            'success' => true,
            'brand' => array(
                'name' => $brand_term->name,
                'slug' => $brand_term->slug,
                'id' => $brand_term->term_id,
            ),
            'found_products' => $query->found_posts,
            'current_page' => $page,
            'per_page' => $per_page,
            'products' => $products,
        ), 200);
    }
    
    /**
     * Get list of available brands for debugging
     */
    private function get_available_brands_list() {
        $attribute_taxonomy = 'pa_marques';
        $terms = get_terms(array(
            'taxonomy' => $attribute_taxonomy,
            'hide_empty' => false,
        ));
        
        if (is_wp_error($terms)) {
            return array();
        }
        
        return array_map(function($term) {
            return array(
                'name' => $term->name,
                'slug' => $term->slug,
                'count' => $term->count,
            );
        }, $terms);
    }
}

// Initialize the plugin
new Brand_Products_Endpoint();

/**
 * Direct PHP endpoint that bypasses WordPress authentication
 * This creates a standalone PHP file that can be accessed directly
 */
function bpe_create_direct_endpoint() {
    $direct_endpoint_content = '<?php
/**
 * Direct Brand Products Endpoint
 * This file bypasses WordPress authentication for public brand product access
 */

// Allow CORS from any origin
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

// Handle preflight requests
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Get brand name from URL
$brand_name = isset($_GET["brand"]) ? sanitize_text_field($_GET["brand"]) : "";
$per_page = isset($_GET["per_page"]) ? intval($_GET["per_page"]) : 100;
$page = isset($_GET["page"]) ? intval($_GET["page"]) : 1;

if (empty($brand_name)) {
    http_response_code(400);
    echo json_encode(array("success" => false, "message" => "Brand name is required"));
    exit();
}

// Load WordPress environment
$wordpress_path = dirname(__FILE__) . "/../../../../wp-load.php";
if (!file_exists($wordpress_path)) {
    http_response_code(500);
    echo json_encode(array("success" => false, "message" => "WordPress not found"));
    exit();
}

require_once($wordpress_path);

// Check if WooCommerce is active
if (!function_exists("wc_get_product")) {
    http_response_code(500);
    echo json_encode(array("success" => false, "message" => "WooCommerce not found"));
    exit();
}

// Get brand term
$attribute_taxonomy = "pa_marques";
$brand_term = get_term_by("slug", $brand_name, $attribute_taxonomy);

if (!$brand_term) {
    // Try case-insensitive search
    $all_terms = get_terms(array(
        "taxonomy" => $attribute_taxonomy,
        "hide_empty" => false,
    ));
    
    foreach ($all_terms as $term) {
        if (strcasecmp($term->name, $brand_name) === 0) {
            $brand_term = $term;
            break;
        }
    }
}

if (!$brand_term || is_wp_error($brand_term)) {
    http_response_code(404);
    echo json_encode(array(
        "success" => false, 
        "message" => "Brand not found: " . $brand_name,
        "searched_brand" => $brand_name
    ));
    exit();
}

// Get products
$args = array(
    "post_type" => "product",
    "posts_per_page" => $per_page,
    "paged" => $page,
    "post_status" => "publish",
    "tax_query" => array(
        array(
            "taxonomy" => $attribute_taxonomy,
            "field" => "term_id",
            "terms" => $brand_term->term_id,
            "operator" => "IN",
        ),
    ),
    "orderby" => "title",
    "order" => "ASC",
);

$query = new WP_Query($args);
$products = array();

if ($query->have_posts()) {
    while ($query->have_posts()) {
        $query->the_post();
        $product_id = get_the_ID();
        $product = wc_get_product($product_id);
        
        if ($product) {
            // Get product images
            $images = array();
            $main_image_id = $product->get_image_id();
            if ($main_image_id) {
                $main_image = wp_get_attachment_image_src($main_image_id, "full");
                if ($main_image) {
                    $images[] = array(
                        "id" => $main_image_id,
                        "src" => $main_image[0],
                        "alt" => get_post_meta($main_image_id, "_wp_attachment_image_alt", true),
                        "name" => get_the_title($main_image_id),
                    );
                }
            }
            
            $products[] = array(
                "id" => $product->get_id(),
                "name" => $product->get_name(),
                "slug" => $product->get_slug(),
                "price" => $product->get_price(),
                "regular_price" => $product->get_regular_price(),
                "sale_price" => $product->get_sale_price(),
                "description" => $product->get_description(),
                "short_description" => $product->get_short_description(),
                "sku" => $product->get_sku(),
                "stock_quantity" => $product->get_stock_quantity(),
                "stock_status" => $product->get_stock_status(),
                "images" => $images,
                "permalink" => $product->get_permalink(),
            );
        }
    }
    wp_reset_postdata();
}

// Return JSON response
echo json_encode(array(
    "success" => true,
    "brand" => array(
        "name" => $brand_term->name,
        "slug" => $brand_term->slug,
        "id" => $brand_term->term_id,
    ),
    "found_products" => $query->found_posts,
    "current_page" => $page,
    "per_page" => $per_page,
    "products" => $products,
));
exit();
?>';
    
    $direct_endpoint_path = plugin_dir_path(__FILE__) . 'direct-brand-products.php';
    file_put_contents($direct_endpoint_path, $direct_endpoint_content);
}

// Create the direct endpoint on activation
register_activation_hook(__FILE__, 'bpe_create_direct_endpoint');

// Activation hook
register_activation_hook(__FILE__, function() {
    // Flush rewrite rules to ensure our endpoints work
    flush_rewrite_rules();
    
    // Log activation
    error_log('Brand Products Endpoint plugin activated');
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Flush rewrite rules on deactivation
    flush_rewrite_rules();
    
    // Log deactivation
    error_log('Brand Products Endpoint plugin deactivated');
});