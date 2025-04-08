<?php
/*
Plugin Name: PDF Download Tracker
Description: Tracks PDF views and downloads from specific directories
Version: 1.5
Author: Med Yassine Zahmoul
*/

defined('ABSPATH') or die('No direct access!');

class PDF_Download_Tracker {

    private $table_name;
    private $tracked_folders = ['/catalogue/', '/fichtech/'];

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'pdf_tracking';

        register_activation_hook(__FILE__, [$this, 'create_table']);
        
        // Move to template_redirect to work better with 404 tracker
        add_action('template_redirect', [$this, 'track_pdf_access'], 5);
        add_action('admin_menu', [$this, 'add_admin_menu']);
    }

    public function create_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            file_path varchar(255) NOT NULL,
            file_name varchar(255) NOT NULL,
            access_type varchar(10) NOT NULL COMMENT 'view or download',
            ip_address varchar(45) DEFAULT NULL,
            user_agent text DEFAULT NULL,
            user_id bigint(20) DEFAULT 0,
            access_time datetime NOT NULL,
            PRIMARY KEY (id),
            KEY file_path (file_path(191)),
            KEY access_time (access_time),
            KEY access_type (access_type)
        ) {$charset_collate};";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    public function track_pdf_access() {
        global $wpdb;
        
        $request_uri = $_SERVER['REQUEST_URI'];
        $current_url = $this->get_current_url();
        
        error_log('PDF Tracker - Starting check for PDF access');
        error_log('PDF Tracker - Request URI: ' . $request_uri);
        error_log('PDF Tracker - Current URL: ' . $current_url);
        
        // First check if this is a PDF request
        if (!preg_match('/\.pdf$/i', $request_uri)) {
            error_log('PDF Tracker - Not a PDF request');
            return;
        }
        
        error_log('PDF Tracker - PDF request detected');
        
        // Check if it's in one of our tracked folders
        $is_tracked = false;
        $matched_folder = '';
        foreach ($this->tracked_folders as $folder) {
            if (strpos($request_uri, $folder) !== false) {
                $is_tracked = true;
                $matched_folder = $folder;
                error_log('PDF Tracker - Matched folder: ' . $folder);
                break;
            }
        }
        
        if (!$is_tracked) {
            error_log('PDF Tracker - PDF not in tracked folders');
            return;
        }

        // Check if file exists
        $file_path = ABSPATH . ltrim($request_uri, '/');
        if (!file_exists($file_path)) {
            error_log('PDF Tracker - File does not exist: ' . $file_path);
            // Let the 404 tracker handle this
            return;
        }
        
        // Get file details
        $file_path = $request_uri;
        $file_name = basename($file_path);
        
        error_log('PDF Tracker - Processing file: ' . $file_name);
        error_log('PDF Tracker - Full path: ' . $file_path);
        
        // Determine access type
        $access_type = 'view';
        if (isset($_SERVER['HTTP_RANGE']) || 
            isset($_GET['download']) || 
            strpos(strtolower($_SERVER['HTTP_USER_AGENT'] ?? ''), 'download') !== false) {
            $access_type = 'download';
        }
        
        error_log('PDF Tracker - Access type: ' . $access_type);
        
        // Prepare data for insertion
        $data = [
            'file_path' => $file_path,
            'file_name' => $file_name,
            'access_type' => $access_type,
            'ip_address' => $this->get_client_ip(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'user_id' => get_current_user_id(),
            'access_time' => current_time('mysql'),
        ];
        
        error_log('PDF Tracker - Attempting to insert data: ' . print_r($data, true));
        
        // Insert the record
        $result = $wpdb->insert($this->table_name, $data);
        
        if ($result === false) {
            error_log('PDF Tracker - ERROR: Failed to insert record: ' . $wpdb->last_error);
        } else {
            error_log('PDF Tracker - SUCCESS: Inserted record with ID: ' . $wpdb->insert_id);
        }
    }

    private function get_current_url() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $uri = $_SERVER['REQUEST_URI'];
        return $protocol . $host . $uri;
    }

    public function add_admin_menu() {
        add_menu_page(
            'PDF Tracking',
            'PDF Tracking',
            'manage_options',
            'pdf-tracking',
            [$this, 'render_admin_page'],
            'dashicons-media-document',
            81
        );
    }

    public function render_admin_page() {
        global $wpdb;
        
        // Setup filters
        $current_filter = $_GET['filter'] ?? 'all';
        $valid_filters = ['all', 'view', 'download'];
        $filter = in_array($current_filter, $valid_filters) ? $current_filter : 'all';
        
        // Setup pagination
        $per_page = 20;
        $current_page = max(1, isset($_GET['paged']) ? absint($_GET['paged']) : 1);
        $offset = ($current_page - 1) * $per_page;
        
        // Base query
        $query = "FROM {$this->table_name}";
        $where = [];
        
        if ($filter !== 'all') {
            $where[] = $wpdb->prepare("access_type = %s", $filter);
        }
        
        if (!empty($where)) {
            $query .= " WHERE " . implode(' AND ', $where);
        }
        
        // Get total count
        $total_items = $wpdb->get_var("SELECT COUNT(*) $query");
        
        // Get records
        $records = $wpdb->get_results(
            "SELECT * $query 
             ORDER BY access_time DESC 
             LIMIT $per_page OFFSET $offset"
        );
        
        // Get statistics
        $stats = $wpdb->get_results(
            "SELECT 
                file_name, 
                file_path,
                COUNT(*) as total_access,
                SUM(access_type = 'view') as views,
                SUM(access_type = 'download') as downloads
             FROM {$this->table_name}
             GROUP BY file_path
             ORDER BY total_access DESC"
        );
        ?>
        <div class="wrap">
            <h1>PDF Access Statistics</h1>
            
            <div class="postbox" style="padding: 20px; margin-bottom: 20px;">
                <h2>File Statistics</h2>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Total Access</th>
                            <th>Views</th>
                            <th>Downloads</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($stats as $stat): ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($stat->file_name); ?></strong><br>
                                    <small><?php echo esc_html($stat->file_path); ?></small>
                                </td>
                                <td><?php echo esc_html($stat->total_access); ?></td>
                                <td><?php echo esc_html($stat->views); ?></td>
                                <td><?php echo esc_html($stat->downloads); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <h2>Access Log</h2>
            
            <ul class="subsubsub">
                <li>
                    <a href="<?php echo esc_url(add_query_arg('filter', 'all')); ?>" 
                       class="<?php echo $filter === 'all' ? 'current' : ''; ?>">
                        All <span class="count">(<?php echo $total_items; ?>)</span>
                    </a> |
                </li>
                <li>
                    <a href="<?php echo esc_url(add_query_arg('filter', 'view')); ?>" 
                       class="<?php echo $filter === 'view' ? 'current' : ''; ?>">
                        Views <span class="count">(<?php echo $this->get_count_for_type('view'); ?>)</span>
                    </a> |
                </li>
                <li>
                    <a href="<?php echo esc_url(add_query_arg('filter', 'download')); ?>" 
                       class="<?php echo $filter === 'download' ? 'current' : ''; ?>">
                        Downloads <span class="count">(<?php echo $this->get_count_for_type('download'); ?>)</span>
                    </a>
                </li>
            </ul>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>File</th>
                        <th>Type</th>
                        <th>User</th>
                        <th>IP Address</th>
                        <th>User Agent</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($records)): ?>
                        <tr>
                            <td colspan="6">No access recorded yet.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($records as $record): ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($record->file_name); ?></strong><br>
                                    <small><?php echo esc_html($record->file_path); ?></small>
                                </td>
                                <td>
                                    <span class="dashicons dashicons-<?php echo $record->access_type === 'download' ? 'download' : 'visibility'; ?>"></span>
                                    <?php echo ucfirst($record->access_type); ?>
                                </td>
                                <td>
                                    <?php if ($record->user_id): ?>
                                        <?php $user = get_user_by('id', $record->user_id); ?>
                                        <?php echo $user ? esc_html($user->display_name) : 'Unknown User'; ?>
                                    <?php else: ?>
                                        Guest
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($record->ip_address); ?></td>
                                <td><?php echo esc_html(substr($record->user_agent, 0, 50)); ?>...</td>
                                <td><?php echo date_i18n('M j, Y @ H:i', strtotime($record->access_time)); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
            
            <div class="tablenav bottom">
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
        </div>
        <?php
    }

    private function get_count_for_type($type) {
        global $wpdb;
        return $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->table_name} WHERE access_type = %s",
            $type
        ));
    }

    private function get_client_ip() {
        $ip = '';
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } else {
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        }
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '';
    }
}

new PDF_Download_Tracker();