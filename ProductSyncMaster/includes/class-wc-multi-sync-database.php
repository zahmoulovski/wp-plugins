<?php
/**
 * Database management class
 */
class WC_Multi_Sync_Database {
    
    /**
     * Create plugin database tables
     */
    public static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Destination sites table
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        $sites_sql = "CREATE TABLE $sites_table (
            id int(11) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            url varchar(500) NOT NULL,
            consumer_key varchar(255) NOT NULL,
            consumer_secret varchar(255) NOT NULL,
            is_active tinyint(1) DEFAULT 1,
            last_sync datetime DEFAULT NULL,
            sync_rules longtext DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        // Sync rules table  
        $sync_rules_table = $wpdb->prefix . 'wc_multi_sync_sync_rules';
        $sync_rules_sql = "CREATE TABLE $sync_rules_table (
            id int(11) NOT NULL AUTO_INCREMENT,
            site_id int(11) NOT NULL,
            categories text DEFAULT NULL,
            price_min varchar(50) DEFAULT NULL,
            price_max varchar(50) DEFAULT NULL,
            auto_sync tinyint(1) DEFAULT 1,
            sync_products tinyint(1) DEFAULT 1,
            sync_images tinyint(1) DEFAULT 1,
            sync_categories tinyint(1) DEFAULT 1,
            sync_inventory tinyint(1) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY site_id (site_id)
        ) $charset_collate;";

        // Sync jobs table
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        $jobs_sql = "CREATE TABLE $jobs_table (
            id int(11) NOT NULL AUTO_INCREMENT,
            product_id int(11) NOT NULL,
            site_id int(11) NOT NULL,
            action varchar(50) NOT NULL,
            status varchar(50) DEFAULT 'pending',
            progress int(3) DEFAULT 0,
            error_message text DEFAULT NULL,
            started_at datetime DEFAULT NULL,
            completed_at datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY product_id (product_id),
            KEY site_id (site_id),
            KEY status (status)
        ) $charset_collate;";
        
        // Activity logs table
        $logs_table = $wpdb->prefix . 'wc_multi_sync_logs';
        $logs_sql = "CREATE TABLE $logs_table (
            id int(11) NOT NULL AUTO_INCREMENT,
            type varchar(50) NOT NULL,
            product_id int(11) DEFAULT NULL,
            site_id int(11) DEFAULT NULL,
            message text NOT NULL,
            details longtext DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY type (type),
            KEY product_id (product_id),
            KEY site_id (site_id)
        ) $charset_collate;";
        
        // Product mappings table
        $mappings_table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
        $mappings_sql = "CREATE TABLE $mappings_table (
            id int(11) NOT NULL AUTO_INCREMENT,
            local_product_id int(11) NOT NULL,
            remote_product_id int(11) NOT NULL,
            site_id int(11) NOT NULL,
            last_synced datetime DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_mapping (local_product_id, site_id),
            KEY site_id (site_id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sites_sql);
        dbDelta($sync_rules_sql);
        dbDelta($jobs_sql);
        dbDelta($logs_sql);
        dbDelta($mappings_sql);
    }
    
    /**
     * Get all destination sites
     */
    public static function get_sites() {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sites';
        return $wpdb->get_results("SELECT * FROM $table ORDER BY name ASC");
    }
    
    /**
     * Get site by ID
     */
    public static function get_site($site_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sites';
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id = %d", $site_id));
    }
    
    /**
     * Add destination site
     */
    public static function add_site($data) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        $result = $wpdb->insert(
            $table,
            array(
                'name' => sanitize_text_field($data['name']),
                'url' => esc_url_raw($data['url']),
                'consumer_key' => sanitize_text_field($data['consumer_key']),
                'consumer_secret' => sanitize_text_field($data['consumer_secret']),
                'sync_rules' => maybe_serialize($data['sync_rules'] ?? array()),
                'is_active' => isset($data['is_active']) ? 1 : 0
            ),
            array('%s', '%s', '%s', '%s', '%s', '%d')
        );
        
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Update site
     */
    public static function update_site($site_id, $data) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        $update_data = array();
        $formats = array();
        
        if (isset($data['name'])) {
            $update_data['name'] = sanitize_text_field($data['name']);
            $formats[] = '%s';
        }
        
        if (isset($data['url'])) {
            $update_data['url'] = esc_url_raw($data['url']);
            $formats[] = '%s';
        }
        
        if (isset($data['consumer_key'])) {
            $update_data['consumer_key'] = sanitize_text_field($data['consumer_key']);
            $formats[] = '%s';
        }
        
        if (isset($data['consumer_secret'])) {
            $update_data['consumer_secret'] = sanitize_text_field($data['consumer_secret']);
            $formats[] = '%s';
        }
        
        if (isset($data['sync_rules'])) {
            $update_data['sync_rules'] = maybe_serialize($data['sync_rules']);
            $formats[] = '%s';
        }
        
        if (isset($data['is_active'])) {
            $update_data['is_active'] = $data['is_active'] ? 1 : 0;
            $formats[] = '%d';
        }
        
        if (isset($data['last_sync'])) {
            $update_data['last_sync'] = $data['last_sync'];
            $formats[] = '%s';
        }
        
        return $wpdb->update(
            $table,
            $update_data,
            array('id' => $site_id),
            $formats,
            array('%d')
        );
    }
    
    /**
     * Delete site
     */
    public static function delete_site($site_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sites';
        
        // Also delete related jobs and mappings
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        $mappings_table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
        
        $wpdb->delete($jobs_table, array('site_id' => $site_id), array('%d'));
        $wpdb->delete($mappings_table, array('site_id' => $site_id), array('%d'));
        
        return $wpdb->delete($table, array('id' => $site_id), array('%d'));
    }
    
    /**
     * Add sync job
     */
    public static function add_sync_job($product_id, $site_id, $action = 'sync') {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_jobs';
        
        // Check if job already exists
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table WHERE product_id = %d AND site_id = %d AND status IN ('pending', 'processing')",
            $product_id, $site_id
        ));
        
        if ($existing) {
            return $existing;
        }
        
        $result = $wpdb->insert(
            $table,
            array(
                'product_id' => $product_id,
                'site_id' => $site_id,
                'action' => $action,
                'status' => 'pending'
            ),
            array('%d', '%d', '%s', '%s')
        );
        
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Get pending sync jobs
     */
    public static function get_pending_jobs($limit = 10) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_jobs';
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE status = 'pending' ORDER BY created_at ASC LIMIT %d",
            $limit
        ));
    }
    
    /**
     * Update job status
     */
    public static function update_job_status($job_id, $status, $progress = null, $error_message = null) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_jobs';
        
        $update_data = array('status' => $status);
        $formats = array('%s');
        
        if ($progress !== null) {
            $update_data['progress'] = $progress;
            $formats[] = '%d';
        }
        
        if ($error_message !== null) {
            $update_data['error_message'] = $error_message;
            $formats[] = '%s';
        }
        
        if ($status === 'processing' && $progress === null) {
            $update_data['started_at'] = current_time('mysql');
            $formats[] = '%s';
        }
        
        if (in_array($status, array('completed', 'failed'))) {
            $update_data['completed_at'] = current_time('mysql');
            $formats[] = '%s';
        }
        
        return $wpdb->update(
            $table,
            $update_data,
            array('id' => $job_id),
            $formats,
            array('%d')
        );
    }
    
    /**
     * Add activity log
     */
    public static function add_log($type, $message, $product_id = null, $site_id = null, $details = null) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_logs';
        
        return $wpdb->insert(
            $table,
            array(
                'type' => $type,
                'message' => $message,
                'product_id' => $product_id,
                'site_id' => $site_id,
                'details' => maybe_serialize($details)
            ),
            array('%s', '%s', '%d', '%d', '%s')
        );
    }
    
    /**
     * Get activity logs
     */
    public static function get_logs($limit = 50, $offset = 0) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_logs';
        
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table ORDER BY created_at DESC LIMIT %d OFFSET %d",
            $limit, $offset
        ));
    }
    
    /**
     * Get all sync rules
     */
    public static function get_sync_rules() {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sync_rules';
        return $wpdb->get_results("SELECT * FROM $table ORDER BY created_at DESC");
    }
    
    /**
     * Add sync rule
     */
    public static function add_sync_rule($data) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sync_rules';
        
        $result = $wpdb->insert(
            $table,
            array(
                'site_id' => intval($data['siteId']),
                'categories' => maybe_serialize($data['categories']),
                'price_min' => $data['priceMin'],
                'price_max' => $data['priceMax'],
                'auto_sync' => $data['autoSync'] ? 1 : 0,
                'sync_products' => $data['syncProducts'] ? 1 : 0,
                'sync_images' => $data['syncImages'] ? 1 : 0,
                'sync_categories' => $data['syncCategories'] ? 1 : 0,
                'sync_inventory' => $data['syncInventory'] ? 1 : 0
            ),
            array('%d', '%s', '%s', '%s', '%d', '%d', '%d', '%d', '%d')
        );
        
        return $result ? $wpdb->insert_id : false;
    }
    
    /**
     * Delete sync rule
     */
    public static function delete_sync_rule($rule_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_sync_rules';
        
        return $wpdb->delete($table, array('id' => $rule_id), array('%d'));
    }
    
    /**
     * Save product mapping
     */
    public static function save_product_mapping($local_product_id, $remote_product_id, $site_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
        
        return $wpdb->replace(
            $table,
            array(
                'local_product_id' => $local_product_id,
                'remote_product_id' => $remote_product_id,
                'site_id' => $site_id,
                'last_synced' => current_time('mysql')
            ),
            array('%d', '%d', '%d', '%s')
        );
    }
    
    /**
     * Get product mapping
     */
    public static function get_product_mapping($local_product_id, $site_id) {
        global $wpdb;
        $table = $wpdb->prefix . 'wc_multi_sync_product_mappings';
        
        return $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table WHERE local_product_id = %d AND site_id = %d",
            $local_product_id, $site_id
        ));
    }
    
    /**
     * Get dashboard statistics
     */
    public static function get_dashboard_stats() {
        global $wpdb;
        
        $sites_table = $wpdb->prefix . 'wc_multi_sync_sites';
        $jobs_table = $wpdb->prefix . 'wc_multi_sync_jobs';
        $logs_table = $wpdb->prefix . 'wc_multi_sync_logs';
        
        $total_sites = $wpdb->get_var("SELECT COUNT(*) FROM $sites_table");
        $active_sites = $wpdb->get_var("SELECT COUNT(*) FROM $sites_table WHERE is_active = 1");
        $pending_jobs = $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'pending'");
        $failed_jobs = $wpdb->get_var("SELECT COUNT(*) FROM $jobs_table WHERE status = 'failed'");
        $completed_today = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $jobs_table WHERE status = 'completed' AND DATE(completed_at) = %s",
            current_time('Y-m-d')
        ));
        
        return array(
            'total_sites' => $total_sites,
            'active_sites' => $active_sites,
            'pending_jobs' => $pending_jobs,
            'failed_jobs' => $failed_jobs,
            'completed_today' => $completed_today
        );
    }
}