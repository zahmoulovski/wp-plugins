<?php
/*
Plugin Name: PDF Download Tracker
Description: Tracks PDF downloads from specific directories
Version: 1.0
Author: Med Yassine Zahmoul
*/

defined('ABSPATH') or die('No direct access!');

class PDF_Download_Tracker {

    private $table_name;
    private $tracked_folders = ['/catalogue/', '/fichtech/'];

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'pdf_downloads';

        register_activation_hook(__FILE__, [$this, 'create_table']);
        add_action('init', [$this, 'track_downloads']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
    }

    public function create_table() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE {$this->table_name} (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            file_path varchar(255) NOT NULL,
            file_name varchar(255) NOT NULL,
            file_size bigint(20) DEFAULT 0,
            ip_address varchar(45) DEFAULT NULL,
            user_agent text DEFAULT NULL,
            user_id bigint(20) DEFAULT 0,
            download_date datetime NOT NULL,
            download_count int(11) DEFAULT 1,
            PRIMARY KEY (id),
            KEY file_path (file_path(191)),
            KEY download_date (download_date)
        ) {$charset_collate};";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }

    public function track_downloads() {
        if (!isset($_SERVER['REQUEST_URI'])) {
            return;
        }

        $request_uri = $_SERVER['REQUEST_URI'];
        $is_pdf = pathinfo($request_uri, PATHINFO_EXTENSION) === 'pdf';
        
        // Check if request is for a PDF in our tracked folders
        $should_track = false;
        foreach ($this->tracked_folders as $folder) {
            if (strpos($request_uri, $folder) !== false && $is_pdf) {
                $should_track = true;
                break;
            }
        }

        if (!$should_track) {
            return;
        }

        global $wpdb;
        
        $file_path = ABSPATH . ltrim($request_uri, '/');
        $file_name = basename($request_uri);
        $file_size = file_exists($file_path) ? filesize($file_path) : 0;
        $ip = $this->get_client_ip();
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $user_id = get_current_user_id();
        $current_time = current_time('mysql');

        // Check if this file+IP combo exists in last 24 hours
        $existing = $wpdb->get_row($wpdb->prepare(
            "SELECT id, download_count FROM {$this->table_name} 
             WHERE file_path = %s AND ip_address = %s 
             AND download_date > DATE_SUB(NOW(), INTERVAL 1 DAY) 
             ORDER BY download_date DESC LIMIT 1",
            $request_uri, $ip
        ));

        if ($existing) {
            // Update count for existing record
            $wpdb->update(
                $this->table_name,
                ['download_count' => $existing->download_count + 1],
                ['id' => $existing->id],
                ['%d'],
                ['%d']
            );
        } else {
            // Insert new record
            $wpdb->insert($this->table_name, [
                'file_path' => $request_uri,
                'file_name' => $file_name,
                'file_size' => $file_size,
                'ip_address' => $ip,
                'user_agent' => $user_agent,
                'user_id' => $user_id,
                'download_date' => $current_time,
            ]);
        }
    }

    public function add_admin_menu() {
        add_menu_page(
            'PDF Downloads',
            'PDF Downloads',
            'manage_options',
            'pdf-downloads',
            [$this, 'render_admin_page'],
            'dashicons-media-document',
            81
        );
    }

    public function render_admin_page() {
        global $wpdb;
        
        // Setup pagination
        $per_page = 20;
        $current_page = max(1, isset($_GET['paged']) ? absint($_GET['paged']) : 1);
        $offset = ($current_page - 1) * $per_page;
        
        // Get total count
        $total_items = $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
        
        // Get records
        $downloads = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$this->table_name} 
             ORDER BY download_date DESC 
             LIMIT %d OFFSET %d",
            $per_page, $offset
        ));
        
        // Get summary stats
        $popular_files = $wpdb->get_results(
            "SELECT file_path, file_name, SUM(download_count) as total_downloads
             FROM {$this->table_name}
             GROUP BY file_path
             ORDER BY total_downloads DESC
             LIMIT 5"
        );
        ?>
        <div class="wrap">
            <h1>PDF Download Statistics</h1>
            
            <div class="postbox" style="padding: 20px; margin-bottom: 20px;">
                <h2>Most Popular Files</h2>
                <ul>
                    <?php foreach ($popular_files as $file): ?>
                        <li>
                            <strong><?php echo esc_html($file->file_name); ?></strong> - 
                            <?php echo esc_html($file->total_downloads); ?> downloads
                            <small>(<?php echo esc_html($file->file_path); ?>)</small>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>File Path</th>
                        <th>Size</th>
                        <th>User</th>
                        <th>IP Address</th>
                        <th>Downloads</th>
                        <th>Last Downloaded</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($downloads)): ?>
                        <tr>
                            <td colspan="7">No downloads recorded yet.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($downloads as $download): ?>
                            <tr>
                                <td><?php echo esc_html($download->file_name); ?></td>
                                <td><?php echo esc_html($download->file_path); ?></td>
                                <td><?php echo size_format($download->file_size); ?></td>
                                <td>
                                    <?php if ($download->user_id): ?>
                                        <?php $user = get_user_by('id', $download->user_id); ?>
                                        <?php echo esc_html($user->display_name); ?>
                                    <?php else: ?>
                                        Guest
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($download->ip_address); ?></td>
                                <td><?php echo esc_html($download->download_count); ?></td>
                                <td><?php echo date_i18n('M j, Y @ H:i', strtotime($download->download_date)); ?></td>
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

    private function get_client_ip() {
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        }
        return $_SERVER['REMOTE_ADDR'];
    }
}

new PDF_Download_Tracker();