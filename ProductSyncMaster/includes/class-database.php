<?php
/**
 * Database management class
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Multi_Sync_Database {
    
    public static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Sites table
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        $sites_sql = "CREATE TABLE $sites_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            url varchar(255) NOT NULL,
            type enum('source','destination') NOT NULL DEFAULT 'destination',
            consumer_key varchar(255) NOT NULL,
            consumer_secret varchar(255) NOT NULL,
            is_active tinyint(1) NOT NULL DEFAULT 1,
            last_sync datetime NULL,
            sync_frequency int(11) NOT NULL DEFAULT 300,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY type (type),
            KEY is_active (is_active)
        ) $charset_collate;";
        
        // Sync rules table
        $rules_table = $wpdb->prefix . 'wc_multi_sync_rules';
        $rules_sql = "CREATE TABLE $rules_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            site_id mediumint(9) NOT NULL,
            name varchar(255) NOT NULL,
            categories text NULL,
            product_types text NULL,
            price_min decimal(10,2) NULL,
            price_max decimal(10,2) NULL,
            stock_status varchar(50) NULL,
            auto_sync tinyint(1) NOT NULL DEFAULT 1,
            sync_images tinyint(1) NOT NULL DEFAULT 1,
            sync_categories tinyint(1) NOT NULL DEFAULT 1,
            sync_variations tinyint(1) NOT NULL DEFAULT 1,
            sync_attributes tinyint(1) NOT NULL DEFAULT 1,
            sync_meta tinyint(1) NOT NULL DEFAULT 0,
            exclude_fields text NULL,
            is_active tinyint(1) NOT NULL DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY site_id (site_id),
            KEY is_active (is_active)
        ) $charset_collate;";
        
        // Sync jobs table
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        $jobs_sql = "CREATE TABLE $jobs_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            source_site_id mediumint(9) NOT NULL,
            target_site_id mediumint(9) NOT NULL,
            product_id bigint(20) NULL,
            source_product_id bigint(20) NULL,
            target_product_id bigint(20) NULL,
            job_type enum('single','bulk','auto') NOT NULL DEFAULT 'single',
            status enum('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
            progress tinyint(3) NOT NULL DEFAULT 0,
            priority tinyint(3) NOT NULL DEFAULT 5,
            attempts tinyint(3) NOT NULL DEFAULT 0,
            max_attempts tinyint(3) NOT NULL DEFAULT 3,
            error_message text NULL,
            sync_data longtext NULL,
            started_at datetime NULL,
            completed_at datetime NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY status (status),
            KEY source_site_id (source_site_id),
            KEY target_site_id (target_site_id),
            KEY product_id (product_id),
            KEY priority (priority),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Activity logs table
        $logs_table = $wpdb->prefix . 'wc_multi_sync_logs';
        $logs_sql = "CREATE TABLE $logs_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            site_id mediumint(9) NULL,
            product_id bigint(20) NULL,
            job_id mediumint(9) NULL,
            action varchar(50) NOT NULL,
            status enum('success','error','warning','info') NOT NULL,
            message text NOT NULL,
            details longtext NULL,
            ip_address varchar(45) NULL,
            user_id bigint(20) NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY site_id (site_id),
            KEY product_id (product_id),
            KEY job_id (job_id),
            KEY action (action),
            KEY status (status),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Product mapping table
        $mapping_table = $wpdb->prefix . 'wc_multi_sync_product_mapping';
        $mapping_sql = "CREATE TABLE $mapping_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            source_site_id mediumint(9) NOT NULL,
            target_site_id mediumint(9) NOT NULL,
            source_product_id bigint(20) NOT NULL,
            target_product_id bigint(20) NOT NULL,
            last_sync datetime DEFAULT CURRENT_TIMESTAMP,
            sync_hash varchar(32) NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_mapping (source_site_id, target_site_id, source_product_id),
            KEY target_product (target_site_id, target_product_id),
            KEY last_sync (last_sync)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        dbDelta($sites_sql);
        dbDelta($rules_sql);
        dbDelta($jobs_sql);
        dbDelta($logs_sql);
        dbDelta($mapping_sql);
        
        // Insert default source site (current site)
        self::create_default_source_site();
    }
    
    private static function create_default_source_site() {
        global $wpdb;
        
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        // Check if source site already exists
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $sites_table WHERE type = %s",
            'source'
        ));
        
        if (!$existing) {
            $wpdb->insert(
                $sites_table,
                array(
                    'name' => get_bloginfo('name') . ' (Source)',
                    'url' => home_url(),
                    'type' => 'source',
                    'consumer_key' => '',
                    'consumer_secret' => '',
                    'is_active' => 1
                ),
                array('%s', '%s', '%s', '%s', '%s', '%d')
            );
        }
    }
    
    public static function get_sites($type = null, $active_only = false) {
        global $wpdb;
        
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        $where = array('1=1');
        $values = array();
        
        if ($type) {
            $where[] = 'type = %s';
            $values[] = $type;
        }
        
        if ($active_only) {
            $where[] = 'is_active = %d';
            $values[] = 1;
        }
        
        $sql = "SELECT * FROM $sites_table WHERE " . implode(' AND ', $where) . " ORDER BY type DESC, name ASC";
        
        if (!empty($values)) {
            return $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);
        } else {
            return $wpdb->get_results($sql, ARRAY_A);
        }
    }
    
    public static function get_site($id) {
        global $wpdb;
        
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $sites_table WHERE id = %d",
            $id
        ), ARRAY_A);
    }
    
    public static function save_site($data) {
        global $wpdb;
        
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        if (isset($data['id']) && $data['id']) {
            // Update existing site
            unset($data['created_at']);
            $result = $wpdb->update(
                $sites_table,
                $data,
                array('id' => $data['id']),
                null,
                array('%d')
            );
            
            return $result !== false ? $data['id'] : false;
        } else {
            // Insert new site
            unset($data['id']);
            $result = $wpdb->insert($sites_table, $data);
            
            return $result ? $wpdb->insert_id : false;
        }
    }
    
    public static function delete_site($id) {
        global $wpdb;
        
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        return $wpdb->delete(
            $sites_table,
            array('id' => $id),
            array('%d')
        );
    }
    
    public static function log_activity($data) {
        global $wpdb;
        
        $logs_table = $wpdb->prefix . 'wc_multi_sync_logs';
        
        $defaults = array(
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_id' => get_current_user_id() ?: null,
        );
        
        $data = wp_parse_args($data, $defaults);
        
        return $wpdb->insert($logs_table, $data);
    }
    
    public static function get_logs($limit = 50, $offset = 0, $filters = array()) {
        global $wpdb;
        
        $logs_table = $wpdb->prefix . 'wc_multi_sync_logs';
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        $where = array('1=1');
        $values = array();
        
        if (!empty($filters['site_id'])) {
            $where[] = 'l.site_id = %d';
            $values[] = $filters['site_id'];
        }
        
        if (!empty($filters['status'])) {
            $where[] = 'l.status = %s';
            $values[] = $filters['status'];
        }
        
        if (!empty($filters['action'])) {
            $where[] = 'l.action = %s';
            $values[] = $filters['action'];
        }
        
        if (!empty($filters['date_from'])) {
            $where[] = 'l.created_at >= %s';
            $values[] = $filters['date_from'];
        }
        
        if (!empty($filters['date_to'])) {
            $where[] = 'l.created_at <= %s';
            $values[] = $filters['date_to'];
        }
        
        $values[] = $limit;
        $values[] = $offset;
        
        $sql = "SELECT l.*, s.name as site_name 
                FROM $logs_table l 
                LEFT JOIN $sites_table s ON l.site_id = s.id 
                WHERE " . implode(' AND ', $where) . " 
                ORDER BY l.created_at DESC 
                LIMIT %d OFFSET %d";
        
        return $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);
    }
}