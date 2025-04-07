<?php
/*
Plugin Name: WooCommerce API Product Sync with Multiple Stores
Description: WooCommerce API Product Sync with Multiple Stores plugin can sync automatically product from one WooCommerce web store (shop) to the other WooCommerce web stores (shops) when product add/update.
Version: 2.8.0
Author: Zahmoul Med Yassine
Author URI: https://klarrion.com/
License: GPL2
Text Domain: wc_api_mps
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit( 'restricted access' );
}
update_site_option( 'wc_api_mps_purchase_code', '***********' );
update_site_option( 'wc_api_mps_licence', 1 );
/*
 * This is a constant variable for plugin path.
 */
define( 'WC_API_MPS_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );

/*
 * This is a file for includes core functionality.
 */
include_once WC_API_MPS_PLUGIN_PATH . 'includes/includes.php';

/*
 * This is a function that run during active plugin
 */
if ( ! function_exists( 'wc_api_mps_activation' ) ) {
    register_activation_hook( __FILE__, 'wc_api_mps_activation' );
    function wc_api_mps_activation() {
        
        $sync_type = get_option( 'wc_api_mps_sync_type' );
        if ( ! $sync_type ) {
            update_option( 'wc_api_mps_sync_type', 'auto' );
        }
        
        $authorization = get_option( 'wc_api_mps_authorization' );
        if ( ! $authorization ) {
            update_option( 'wc_api_mps_authorization', 'query' );
        }
        
        $old_products_sync_by = get_option( 'wc_api_mps_old_products_sync_by' );
        if ( ! $old_products_sync_by ) {
            update_option( 'wc_api_mps_old_products_sync_by', 'slug' );
        }
        
        $product_sync_type = get_option( 'wc_api_mps_product_sync_type' );
        if ( ! $product_sync_type ) {
            update_option( 'wc_api_mps_product_sync_type', 'full_product' );
        }
        
        $stock_sync = get_option( 'wc_api_mps_stock_sync' );
        if ( ! $stock_sync ) {
            update_option( 'wc_api_mps_stock_sync', 1 );
        }
    }
}