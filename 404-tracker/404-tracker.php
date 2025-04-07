<?php
/*
Plugin Name: Custom 404 Tracker
Description: Tracks all 404 page visits with detailed logging
Version: 1.1
Author: Zahmoul Med Yassine
*/

// Security check
defined('ABSPATH') or die('No direct access!');

class Custom404Tracker {
    
    private $table_name;
    
    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . '404_tracker';
        
        register_activation_hook(__FILE__, [$this, 'create_table']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);
        
        add_action('template_redirect', [$this, 'log_404']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('wp_dashboard_setup', [$this, 'add_dashboard_widget']);
        add_action('admin_init', [$this, 'export_csv']);
    }
    
    // Create the database table
    public function create_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            url varchar(255) NOT NULL,
            referrer varchar(255) DEFAULT NULL,
            ip_address varchar(45) DEFAULT NULL,
            user_agent text DEFAULT NULL,
            user_id bigint(20) DEFAULT 0,
            timestamp datetime NOT NULL,
            count int(11) DEFAULT 1,
            PRIMARY KEY (id),
            KEY url (url(191)),
            KEY timestamp (timestamp)
        ) {$charset_collate};";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Schedule daily cleanup
        if (!wp_next_scheduled('custom_404_tracker_cleanup')) {
            wp_schedule_event(time(), 'daily', 'custom_404_tracker_cleanup');
        }
        
        add_option('custom_404_tracker_db_version', '1.1');
    }
    
    // Deactivation cleanup
    public function deactivate() {
        wp_clear_scheduled_hook('custom_404_tracker_cleanup');
    }
    
    // Log 404 visits
    public function log_404() {
        if (!is_404() || is_admin() || defined('DOING_CRON') || defined('DOING_AJAX')) {
            return;
        }
        
        global $wpdb;
        
        $url = $this->get_current_url();
        $ip = $this->get_client_ip();
        
        // Skip wishlist requests
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        $query_string = $_SERVER['QUERY_STRING'] ?? '';
        
        if (strpos($request_uri, 'add_to_wishlist') !== false || 
            strpos($query_string, 'add_to_wishlist') !== false ||
            isset($_GET['add_to_wishlist'])) {
            return;
        }
        
        // Check if this URL+IP combo exists in last 24 hours
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, count FROM {$this->table_name} 
             WHERE url = %s AND ip_address = %s 
             AND timestamp > DATE_SUB(NOW(), INTERVAL 1 DAY) 
             ORDER BY timestamp DESC LIMIT 1",
            $url, $ip
        ));
        
        if ($existing) {
            $wpdb->update(
                $this->table_name,
                ['count' => $existing->count + 1],
                ['id' => $existing->id],
                ['%d'],
                ['%d']
            );
        } else {
            $wpdb->insert($this->table_name, [
                'url' => $url,
                'referrer' => isset($_SERVER['HTTP_REFERER']) ? esc_url_raw($_SERVER['HTTP_REFERER']) : null,
                'ip_address' => $ip,
                'user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? sanitize_text_field($_SERVER['HTTP_USER_AGENT']) : null,
                'user_id' => get_current_user_id(),
                'timestamp' => current_time('mysql'),
            ]);
        }
    }
    
    // Add admin menu
    public function add_admin_menu() {
        add_menu_page(
            '404 Tracker',
            '404 Tracker',
            'manage_options',
            '404-tracker',
            [$this, 'render_admin_page'],
            'dashicons-warning',
            80
        );
    }
    
    // Render admin page
    public function render_admin_page() {
        global $wpdb;
        
        // Handle bulk actions
        if (isset($_POST['action']) && current_user_can('manage_options')) {
            $this->handle_bulk_actions();
        }
        
        // Setup pagination
        $per_page = 100;
        $current_page = max(1, isset($_GET['paged']) ? absint($_GET['paged']) : 1);
        $offset = ($current_page - 1) * $per_page;
        
        // Get total count
        $total_items = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
        
        // Get records
        $logs = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->table_name} 
             ORDER BY timestamp DESC 
             LIMIT %d OFFSET %d",
            $per_page, $offset
        ));
        
        ?>
        <div class="wrap">
            <h1>404 Error Logs</h1>
            
            <div class="tablenav top">
                <div class="alignleft actions">
                    <a href="<?php echo esc_url(add_query_arg('export', 'csv')); ?>" class="button">
                        Export to CSV
                    </a>
                </div>
                
                <form method="post" action="" style="display: inline;">
                    <?php wp_nonce_field('bulk-404-actions'); ?>
                    <div class="alignleft actions bulkactions">
                        <select name="action">
                            <option value="-1">Bulk Actions</option>
                            <option value="delete">Delete</option>
                            <option value="delete_all">Delete All</option>
                        </select>
                        <input type="submit" class="button action" value="Apply">
                    </div>
                </form>
                
                <div class="tablenav-pages">
                    <?php
                    $total_pages = ceil($total_items / $per_page);
                    echo paginate_links([
                        'base' => add_query_arg('paged', '%#%'),
                        'format' => '',
                        'prev_text' => '&laquo;',
                        'next_text' => '&raquo;',
                        'total' => $total_pages,
                        'current' => $current_page
                    ]);
                    ?>
                </div>
            </div>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th class="check-column"><input type="checkbox" id="cb-select-all-1"></th>
                        <th>URL</th>
                        <th>Referrer</th>
                        <th>IP Address</th>
                        <th>User</th>
                        <th>Hits</th>
                        <th>Last Occurred</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($logs)) : ?>
                        <tr>
                            <td colspan="7">No 404 errors logged yet.</td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($logs as $log) : ?>
                            <tr>
                                <th scope="row" class="check-column">
                                    <input type="checkbox" name="log_ids[]" value="<?php echo $log->id; ?>">
                                </th>
                                <td>
                                    <a href="<?php echo esc_url($log->url); ?>" target="_blank">
                                        <?php echo esc_html($this->truncate($log->url, 50)); ?>
                                    </a>
                                </td>
                                <td>
                                    <?php if ($log->referrer) : ?>
                                        <a href="<?php echo esc_url($log->referrer); ?>" target="_blank">
                                            <?php echo esc_html($this->truncate($log->referrer, 30)); ?>
                                        </a>
                                    <?php else : ?>
                                        <em>Direct</em>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($log->ip_address); ?></td>
                                <td>
                                    <?php if ($log->user_id) : ?>
                                        <?php $user = get_user_by('id', $log->user_id); ?>
                                        <?php echo esc_html($user->display_name); ?>
                                    <?php else : ?>
                                        Guest
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($log->count); ?></td>
                                <td>
                                    <?php echo date_i18n('M j, Y @ H:i', strtotime($log->timestamp)); ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <?php
    }
    
    // Export to CSV
    public function export_csv() {
        if (!isset($_GET['export']) || $_GET['export'] !== 'csv' || !current_user_can('manage_options')) {
            return;
        }
        
        global $wpdb;
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="404_logs_' . date('Y-m-d') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        // CSV headers
        fputcsv($output, ['URL', 'Referrer', 'IP Address', 'User', 'Hits', 'Last Occurred']);
        
        // Get all logs
        $logs = $wpdb->get_results("SELECT * FROM {$this->table_name} ORDER BY timestamp DESC");
        
        foreach ($logs as $log) {
            $user = $log->user_id ? get_user_by('id', $log->user_id)->display_name : 'Guest';
            fputcsv($output, [
                $log->url,
                $log->referrer,
                $log->ip_address,
                $user,
                $log->count,
                $log->timestamp
            ]);
        }
        
        fclose($output);
        exit;
    }
    
    // Add dashboard widget
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'custom_404_tracker_widget',
            'Recent 404 Errors',
            [$this, 'render_dashboard_widget']
        );
    }
    
    // Render dashboard widget
    public function render_dashboard_widget() {
        global $wpdb;
        
        $logs = $wpdb->get_results(
            "SELECT url, COUNT(*) as hits 
             FROM {$this->table_name} 
             GROUP BY url 
             ORDER BY MAX(timestamp) DESC 
             LIMIT 5"
        );
        
        if (empty($logs)) {
            echo '<p>No 404 errors logged yet.</p>';
            return;
        }
        
        echo '<ul style="margin-left: 20px; list-style-type: disc;">';
        foreach ($logs as $log) {
            echo '<li style="margin-bottom: 5px;">';
            echo '<a href="' . esc_url($log->url) . '" target="_blank">';
            echo esc_html($this->truncate($log->url, 40));
            echo '</a> (' . $log->hits . ' hits)';
            echo '</li>';
        }
        echo '</ul>';
        
        echo '<p><a href="' . admin_url('admin.php?page=404-tracker') . '">View All 404 Logs</a></p>';
    }
    
    // Handle bulk actions
    private function handle_bulk_actions() {
        check_admin_referer('bulk-404-actions');
        
        global $wpdb;
        
        switch ($_POST['action']) {
            case 'delete':
                if (!empty($_POST['log_ids'])) {
                    $ids = array_map('intval', $_POST['log_ids']);
                    $ids = implode(',', $ids);
                    $wpdb->query("DELETE FROM {$this->table_name} WHERE id IN ($ids)");
                    add_settings_error('404_tracker_messages', '404_tracker_message', 'Selected logs deleted.', 'updated');
                }
                break;
                
            case 'delete_all':
                $wpdb->query("TRUNCATE TABLE {$this->table_name}");
                add_settings_error('404_tracker_messages', '404_tracker_message', 'All logs deleted.', 'updated');
                break;
        }
    }
    
    // Helper: Get current URL
    private function get_current_url() {
        $protocol = is_ssl() ? 'https://' : 'http://';
        return $protocol . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    }
    
    // Helper: Get client IP
    private function get_client_ip() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        }
        return $_SERVER['REMOTE_ADDR'];
    }
    
    // Helper: Truncate long strings
    private function truncate($string, $length) {
        if (strlen($string) > $length) {
            return substr($string, 0, $length) . '...';
        }
        return $string;
    }
}

// Initialize the plugin
new Custom404Tracker();

// Cleanup old logs
add_action('custom_404_tracker_cleanup', function() {
    global $wpdb;
    $table_name = $wpdb->prefix . '404_tracker';
    $wpdb->query(
        "DELETE FROM {$table_name} 
         WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
});