<?php
/**
 * Admin interface class
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Multi_Sync_Admin {
    
    public function __construct() {
        add_action('admin_post_wc_multi_sync_save_site', array($this, 'save_site'));
        add_action('admin_post_wc_multi_sync_delete_site', array($this, 'delete_site'));
        add_action('admin_post_wc_multi_sync_save_settings', array($this, 'save_settings'));
    }
    
    public function save_site() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'wc_multi_sync_save_site')) {
            wp_die(__('Security check failed', 'wc-multi-sync'));
        }
        
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Insufficient permissions', 'wc-multi-sync'));
        }
        
        $site_data = array(
            'id' => intval($_POST['site_id']),
            'name' => sanitize_text_field($_POST['name']),
            'url' => esc_url_raw($_POST['url']),
            'type' => sanitize_text_field($_POST['type']),
            'consumer_key' => sanitize_text_field($_POST['consumer_key']),
            'consumer_secret' => sanitize_text_field($_POST['consumer_secret']),
            'is_active' => isset($_POST['is_active']) ? 1 : 0,
            'sync_frequency' => intval($_POST['sync_frequency'])
        );
        
        // Test connection before saving
        if ($site_data['type'] === 'destination') {
            $api_client = new WC_Multi_Sync_API_Client(
                $site_data['url'],
                $site_data['consumer_key'],
                $site_data['consumer_secret']
            );
            
            $test_result = $api_client->test_connection();
            
            if (!$test_result['success']) {
                wp_redirect(add_query_arg(array(
                    'page' => 'wc-multi-sync-sites',
                    'action' => 'edit',
                    'id' => $site_data['id'],
                    'error' => urlencode($test_result['error'])
                ), admin_url('admin.php')));
                exit;
            }
        }
        
        $result = WC_Multi_Sync_Database::save_site($site_data);
        
        if ($result) {
            wp_redirect(add_query_arg(array(
                'page' => 'wc-multi-sync-sites',
                'message' => 'saved'
            ), admin_url('admin.php')));
        } else {
            wp_redirect(add_query_arg(array(
                'page' => 'wc-multi-sync-sites',
                'error' => urlencode(__('Failed to save site', 'wc-multi-sync'))
            ), admin_url('admin.php')));
        }
        
        exit;
    }
    
    public function delete_site() {
        if (!wp_verify_nonce($_GET['_wpnonce'], 'wc_multi_sync_delete_site')) {
            wp_die(__('Security check failed', 'wc-multi-sync'));
        }
        
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Insufficient permissions', 'wc-multi-sync'));
        }
        
        $site_id = intval($_GET['id']);
        $result = WC_Multi_Sync_Database::delete_site($site_id);
        
        if ($result) {
            wp_redirect(add_query_arg(array(
                'page' => 'wc-multi-sync-sites',
                'message' => 'deleted'
            ), admin_url('admin.php')));
        } else {
            wp_redirect(add_query_arg(array(
                'page' => 'wc-multi-sync-sites',
                'error' => urlencode(__('Failed to delete site', 'wc-multi-sync'))
            ), admin_url('admin.php')));
        }
        
        exit;
    }
    
    public function save_settings() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'wc_multi_sync_save_settings')) {
            wp_die(__('Security check failed', 'wc-multi-sync'));
        }
        
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Insufficient permissions', 'wc-multi-sync'));
        }
        
        $settings = array(
            'wc_multi_sync_auto_sync' => isset($_POST['auto_sync']) ? 1 : 0,
            'wc_multi_sync_batch_size' => intval($_POST['batch_size']),
            'wc_multi_sync_sync_frequency' => intval($_POST['sync_frequency']),
            'wc_multi_sync_max_retries' => intval($_POST['max_retries']),
            'wc_multi_sync_timeout' => intval($_POST['timeout']),
            'wc_multi_sync_conflict_resolution' => sanitize_text_field($_POST['conflict_resolution']),
            'wc_multi_sync_sync_images' => isset($_POST['sync_images']) ? 1 : 0,
            'wc_multi_sync_sync_categories' => isset($_POST['sync_categories']) ? 1 : 0,
            'wc_multi_sync_sync_variations' => isset($_POST['sync_variations']) ? 1 : 0,
            'wc_multi_sync_sync_attributes' => isset($_POST['sync_attributes']) ? 1 : 0,
            'wc_multi_sync_sync_meta' => isset($_POST['sync_meta']) ? 1 : 0,
            'wc_multi_sync_log_retention_days' => intval($_POST['log_retention_days']),
            'wc_multi_sync_webhook_enabled' => isset($_POST['webhook_enabled']) ? 1 : 0,
            'wc_multi_sync_email_notifications' => isset($_POST['email_notifications']) ? 1 : 0,
            'wc_multi_sync_notification_email' => sanitize_email($_POST['notification_email']),
        );
        
        foreach ($settings as $key => $value) {
            update_option($key, $value);
        }
        
        wp_redirect(add_query_arg(array(
            'page' => 'wc-multi-sync-settings',
            'message' => 'saved'
        ), admin_url('admin.php')));
        
        exit;
    }
    
    public static function get_dashboard_stats() {
        $sites = WC_Multi_Sync_Database::get_sites();
        $active_sites = WC_Multi_Sync_Database::get_sites(null, true);
        
        // Get product count
        $product_count = wp_count_posts('product');
        $published_products = $product_count->publish ?? 0;
        
        // Get recent sync jobs (last 24 hours)
        global $wpdb;
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        $recent_syncs = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $jobs_table WHERE status = 'completed' AND completed_at >= %s",
            date('Y-m-d H:i:s', strtotime('-24 hours'))
        ));
        
        // Get failed sync count
        $failed_syncs = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $jobs_table WHERE status = 'failed' AND created_at >= %s",
            date('Y-m-d H:i:s', strtotime('-7 days'))
        ));
        
        // Calculate success rate
        $total_recent_jobs = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $jobs_table WHERE status IN ('completed', 'failed') AND created_at >= %s",
            date('Y-m-d H:i:s', strtotime('-7 days'))
        ));
        
        $success_rate = $total_recent_jobs > 0 ? (($total_recent_jobs - $failed_syncs) / $total_recent_jobs) * 100 : 100;
        
        return array(
            'total_sites' => count($sites),
            'active_sites' => count($active_sites),
            'destination_sites' => count(array_filter($sites, function($s) { return $s['type'] === 'destination'; })),
            'total_products' => $published_products,
            'syncs_today' => $recent_syncs,
            'failed_syncs' => $failed_syncs,
            'success_rate' => round($success_rate, 1),
            'pending_jobs' => $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'pending'")
        );
    }
    
    public static function get_recent_activity($limit = 10) {
        return WC_Multi_Sync_Database::get_logs($limit, 0);
    }
    
    public static function get_sync_status() {
        global $wpdb;
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        
        $active_jobs = $wpdb->get_results($wpdb->prepare(
            "SELECT j.*, s1.name as source_name, s2.name as target_name 
             FROM $jobs_table j
             LEFT JOIN {$wpdb->prefix}wc_multi_sync_sites s1 ON j.source_site_id = s1.id
             LEFT JOIN {$wpdb->prefix}wc_multi_sync_sites s2 ON j.target_site_id = s2.id
             WHERE j.status = 'processing'
             ORDER BY j.started_at DESC
             LIMIT %d",
            10
        ), ARRAY_A);
        
        return $active_jobs;
    }
}