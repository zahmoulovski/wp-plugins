<?php
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

// Get products - get all products first, then sort by stock status
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
            
            $stock_status = $product->get_stock_status();
            
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
                "stock_status" => $stock_status,
                "images" => $images,
                "permalink" => $product->get_permalink(),
            );
        }
    }
    wp_reset_postdata();
    
    // Sort products: out-of-stock last, others first (no preference between instock and backorder)
    usort($products, function($a, $b) {
        // Out-of-stock should come last (1), everything else first (0)
        $a_priority = ($a["stock_status"] === "outofstock") ? 1 : 0;
        $b_priority = ($b["stock_status"] === "outofstock") ? 1 : 0;
        
        if ($a_priority != $b_priority) {
            return $a_priority - $b_priority; // 0 before 1 (out-of-stock last)
        }
        return strcasecmp($a["name"], $b["name"]); // Then alphabetical by name (case-insensitive)
    });
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
?>