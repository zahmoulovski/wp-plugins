<?php
/**
 * Plugin Name: Klarrion Portfolio REST API
 * Description: Registers portfolio post type and categories with REST API support for Woodmart theme integration
 * Version: 1.0.0
 * Author: Klarrion
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register Portfolio Custom Post Type with REST API support
 */
function klarrion_register_portfolio_post_type() {
    $labels = array(
        'name'                  => _x('Portfolio', 'Post type general name', 'klarrion'),
        'singular_name'         => _x('Portfolio Item', 'Post type singular name', 'klarrion'),
        'menu_name'             => _x('Portfolio', 'Admin Menu text', 'klarrion'),
        'name_admin_bar'        => _x('Portfolio Item', 'Add New on Toolbar', 'klarrion'),
        'add_new'               => __('Add New', 'klarrion'),
        'add_new_item'          => __('Add New Portfolio Item', 'klarrion'),
        'new_item'              => __('New Portfolio Item', 'klarrion'),
        'edit_item'             => __('Edit Portfolio Item', 'klarrion'),
        'view_item'             => __('View Portfolio Item', 'klarrion'),
        'all_items'             => __('All Portfolio Items', 'klarrion'),
        'search_items'          => __('Search Portfolio Items', 'klarrion'),
        'parent_item_colon'     => __('Parent Portfolio Items:', 'klarrion'),
        'not_found'             => __('No portfolio items found.', 'klarrion'),
        'not_found_in_trash'    => __('No portfolio items found in Trash.', 'klarrion'),
        'featured_image'        => _x('Portfolio Cover Image', 'Overrides the "Featured Image" phrase for this post type. Added in 4.3', 'klarrion'),
        'set_featured_image'    => _x('Set cover image', 'Overrides the "Set featured image" phrase for this post type. Added in 4.3', 'klarrion'),
        'remove_featured_image' => _x('Remove cover image', 'Overrides the "Remove featured image" phrase for this post type. Added in 4.3', 'klarrion'),
        'use_featured_image'    => _x('Use as cover image', 'Overrides the "Use as featured image" phrase for this post type. Added in 4.3', 'klarrion'),
        'archives'              => _x('Portfolio archives', 'The post type archive label used in nav menus. Default "Post Archives". Added in 4.4', 'klarrion'),
        'insert_into_item'      => _x('Insert into portfolio item', 'Overrides the "Insert into post"/"Insert into page" phrase (used when inserting media into a post). Added in 4.4', 'klarrion'),
        'uploaded_to_this_item' => _x('Uploaded to this portfolio item', 'Overrides the "Uploaded to this post"/"Uploaded to this page" phrase (used when viewing media attached to a post). Added in 4.4', 'klarrion'),
        'filter_items_list'     => _x('Filter portfolio items list', 'Screen reader text for the filter links heading on the post type listing screen. Default "Filter posts list"/"Filter pages list". Added in 4.4', 'klarrion'),
        'items_list_navigation' => _x('Portfolio items list navigation', 'Screen reader text for the pagination heading on the post type listing screen. Default "Posts list navigation"/"Pages list navigation". Added in 4.4', 'klarrion'),
        'items_list'            => _x('Portfolio items list', 'Screen reader text for the items list heading on the post type listing screen. Default "Posts list"/"Pages list". Added in 4.4', 'klarrion'),
    );

    $args = array(
        'labels'             => $labels,
        'public'             => true,
        'publicly_queryable'   => true,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'rewrite'            => array('slug' => 'portfolio', 'with_front' => false),
        'capability_type'    => 'post',
        'has_archive'        => true,
        'hierarchical'       => false,
        'menu_position'      => 20,
        'menu_icon'          => 'dashicons-portfolio',
        'supports'           => array('title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments'),
        'show_in_rest'       => true, // Enable REST API support
        'rest_base'          => 'portfolio',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'taxonomies'         => array('portfolio_category'), // Link to custom taxonomy
    );

    register_post_type('portfolio', $args);
}
add_action('init', 'klarrion_register_portfolio_post_type');

/**
 * Register Portfolio Categories Taxonomy with REST API support
 */
function klarrion_register_portfolio_taxonomy() {
    $labels = array(
        'name'              => _x('Portfolio Categories', 'taxonomy general name', 'klarrion'),
        'singular_name'     => _x('Portfolio Category', 'taxonomy singular name', 'klarrion'),
        'search_items'      => __('Search Portfolio Categories', 'klarrion'),
        'all_items'         => __('All Portfolio Categories', 'klarrion'),
        'parent_item'       => __('Parent Portfolio Category', 'klarrion'),
        'parent_item_colon' => __('Parent Portfolio Category:', 'klarrion'),
        'edit_item'         => __('Edit Portfolio Category', 'klarrion'),
        'update_item'       => __('Update Portfolio Category', 'klarrion'),
        'add_new_item'      => __('Add New Portfolio Category', 'klarrion'),
        'new_item_name'     => __('New Portfolio Category Name', 'klarrion'),
        'menu_name'         => __('Portfolio Categories', 'klarrion'),
    );

    $args = array(
        'hierarchical'      => true,
        'labels'            => $labels,
        'show_ui'           => true,
        'show_admin_column' => true,
        'query_var'         => true,
        'rewrite'           => array('slug' => 'portfolio-category'),
        'show_in_rest'      => true, // Enable REST API support
        'rest_base'         => 'portfolio-categories',
        'rest_controller_class' => 'WP_REST_Terms_Controller',
    );

    register_taxonomy('portfolio_category', array('portfolio'), $args);
}
add_action('init', 'klarrion_register_portfolio_taxonomy');

/**
 * Add custom REST API fields for portfolio items
 */
function klarrion_add_portfolio_rest_fields() {
    // Add featured image URL
    register_rest_field('portfolio', 'featured_image_url', array(
        'get_callback' => function($post) {
            $image_id = get_post_thumbnail_id($post['id']);
            if ($image_id) {
                $image_sizes = array('full', 'large', 'medium', 'thumbnail');
                $image_urls = array();
                foreach ($image_sizes as $size) {
                    $image_data = wp_get_attachment_image_src($image_id, $size);
                    if ($image_data) {
                        $image_urls[$size] = $image_data[0];
                    }
                }
                return $image_urls;
            }
            return null;
        },
        'update_callback' => null,
        'schema' => null,
    ));

    // Add portfolio categories
    register_rest_field('portfolio', 'portfolio_categories', array(
        'get_callback' => function($post) {
            $terms = wp_get_post_terms($post['id'], 'portfolio_category');
            if (!is_wp_error($terms)) {
                return array_map(function($term) {
                    return array(
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                        'description' => $term->description,
                        'count' => $term->count,
                    );
                }, $terms);
            }
            return array();
        },
        'update_callback' => null,
        'schema' => null,
    ));

    // Add custom fields if ACF is active
    if (function_exists('get_field')) {
        register_rest_field('portfolio', 'custom_fields', array(
            'get_callback' => function($post) {
                $custom_fields = array();
                
                // Add common ACF fields
                $common_fields = array('project_url', 'client_name', 'project_date', 'skills');
                foreach ($common_fields as $field) {
                    $value = get_field($field, $post['id']);
                    if ($value) {
                        $custom_fields[$field] = $value;
                    }
                }
                
                return $custom_fields;
            },
            'update_callback' => null,
            'schema' => null,
        ));
    }
}
add_action('rest_api_init', 'klarrion_add_portfolio_rest_fields');

/**
 * Add custom REST API fields for portfolio categories
 */
function klarrion_add_portfolio_category_rest_fields() {
    register_rest_field('portfolio_category', 'category_data', array(
        'get_callback' => function($term) {
            return array(
                'id' => $term['id'],
                'name' => $term['name'],
                'slug' => $term['slug'],
                'description' => $term['description'],
                'count' => $term['count'],
                'link' => get_term_link($term['id']),
                'image' => get_term_meta($term['id'], 'thumbnail_id', true) ? 
                    wp_get_attachment_url(get_term_meta($term['id'], 'thumbnail_id', true)) : null,
            );
        },
        'update_callback' => null,
        'schema' => null,
    ));
}
add_action('rest_api_init', 'klarrion_add_portfolio_category_rest_fields');

/**
 * Modify REST API response to include portfolio data
 */
function klarrion_modify_portfolio_rest_response($response, $post, $request) {
    // Add permalink
    $response->data['permalink'] = get_permalink($post->ID);
    
    // Add excerpt if not already included
    if (empty($response->data['excerpt']['rendered'])) {
        $response->data['excerpt']['rendered'] = wp_trim_words($post->post_content, 55);
    }
    
    return $response;
}
add_filter('rest_prepare_portfolio', 'klarrion_modify_portfolio_rest_response', 10, 3);

/**
 * Enable CORS for REST API requests
 */
function klarrion_enable_portfolio_cors() {
    // Handle CORS for the portfolio endpoints
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $origin = $_SERVER['HTTP_ORIGIN'];
        
        // Allow requests from your mobile app domain
        $allowed_origins = array(
            'http://localhost:2403',
            'http://localhost:2404',
            'http://localhost:2405',
            'http://localhost:2406',
            'http://localhost:2407',
            'http://localhost:3000',
            'http://localhost:5173',
            'https://klarrion.com',
            'https://www.klarrion.com',
            'http://192.168.0.199:2403',
            'http://192.168.0.199:2404',
            'http://192.168.0.199:2405',
            'http://192.168.0.199:2406',
            'http://192.168.0.199:2407'
        );
        
        if (in_array($origin, $allowed_origins)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
        }
    } else {
        // Fallback to wildcard for non-browser requests
        header("Access-Control-Allow-Origin: *");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce");
    }
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
}
add_action('rest_api_init', 'klarrion_enable_portfolio_cors', 15);

/**
 * Add custom rewrite rules for portfolio
 */
function klarrion_portfolio_rewrite_rules() {
    add_rewrite_rule('^portfolio/([^/]+)/?$', 'index.php?portfolio=$matches[1]', 'top');
    add_rewrite_rule('^portfolio-category/([^/]+)/?$', 'index.php?portfolio_category=$matches[1]', 'top');
    add_rewrite_rule('^portfolio-category/([^/]+)/page/([0-9]+)/?$', 'index.php?portfolio_category=$matches[1]&paged=$matches[2]', 'top');
}
add_action('init', 'klarrion_portfolio_rewrite_rules');

/**
 * Flush rewrite rules on plugin activation
 */
function klarrion_portfolio_activate() {
    klarrion_register_portfolio_post_type();
    klarrion_register_portfolio_taxonomy();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'klarrion_portfolio_activate');

/**
 * Flush rewrite rules on plugin deactivation
 */
function klarrion_portfolio_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'klarrion_portfolio_deactivate');

/**
 * Add portfolio support to Woodmart theme if active
 */
function klarrion_add_woodmart_portfolio_support() {
    if (function_exists('woodmart_setup')) {
        add_theme_support('woodmart-portfolio');
        
        // Add Woodmart-specific portfolio features
        add_filter('woodmart_portfolio_args', function($args) {
            $args['post_type'] = 'portfolio';
            $args['taxonomy'] = 'portfolio_category';
            return $args;
        });
    }
}
add_action('after_setup_theme', 'klarrion_add_woodmart_portfolio_support');

/**
 * Create sample portfolio categories on plugin activation
 */
function klarrion_create_sample_portfolio_categories() {
    $categories = array(
        array(
            'name' => 'Interactive Solutions',
            'slug' => 'interactive-solutions',
            'description' => 'Interactive displays and smart boards for education and business'
        ),
        array(
            'name' => 'Projection Systems',
            'slug' => 'projection-systems',
            'description' => 'Professional projectors and projection solutions'
        ),
        array(
            'name' => 'Educational Technology',
            'slug' => 'educational-technology',
            'description' => 'Technology solutions for modern classrooms'
        ),
        array(
            'name' => 'Corporate Solutions',
            'slug' => 'corporate-solutions',
            'description' => 'Technology solutions for corporate environments'
        ),
        array(
            'name' => 'Digital Signage',
            'slug' => 'digital-signage',
            'description' => 'Digital display and signage solutions'
        )
    );
    
    foreach ($categories as $category) {
        if (!term_exists($category['slug'], 'portfolio_category')) {
            wp_insert_term($category['name'], 'portfolio_category', array(
                'slug' => $category['slug'],
                'description' => $category['description']
            ));
        }
    }
}

// Create sample categories on activation
add_action('init', function() {
    if (get_option('klarrion_portfolio_sample_categories_created') !== 'yes') {
        klarrion_create_sample_portfolio_categories();
        update_option('klarrion_portfolio_sample_categories_created', 'yes');
    }
});

// Add the function to the activation hook
add_action('klarrion_portfolio_activate', 'klarrion_create_sample_portfolio_categories');