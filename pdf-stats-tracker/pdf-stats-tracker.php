<?php
/**
 * Plugin Name: PDF Stats Tracker
 * Description: Track PDF views and downloads from specific folders (enhanced version)
 * Version: 2.0
 * Author: Med Yassine Zahmoul
 * Text Domain: pdf-stats-tracker
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class PDF_Stats_Tracker {
    
    // Plugin version
    const VERSION = '2.0.0';
    
    // Debug mode
    private $debug = false;
    
    // Tracked folders configuration
    private $folders = array(
        'catalogue' => 'https://klarrion.com/catalogue/',
        'fichtech' => 'https://klarrion.com/fichtech/'
    );

    /**
     * Constructor
     */
    public function __construct() {
        // Plugin activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // AJAX handlers for tracking
        add_action('wp_ajax_track_pdf_view', array($this, 'track_pdf_view'));
        add_action('wp_ajax_nopriv_track_pdf_view', array($this, 'track_pdf_view'));
        add_action('wp_ajax_track_pdf_download', array($this, 'track_pdf_download'));
        add_action('wp_ajax_nopriv_track_pdf_download', array($this, 'track_pdf_download'));
        
        // Footer tracking code
        add_action('wp_footer', array($this, 'add_tracking_code'));
        
        // ***NEW: Server-side detection and tracking***
        add_action('template_redirect', array($this, 'check_for_pdf_request'));
        
        // Handle export requests
        add_action('admin_init', array($this, 'handle_export'));
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        
        // Table name
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        // SQL to create tracking table
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            pdf_url varchar(255) NOT NULL,
            folder varchar(50) NOT NULL,
            action varchar(20) NOT NULL,
            user_ip varchar(100) NOT NULL,
            user_agent text NOT NULL,
            referer text,
            timestamp datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        add_option('pdf_stats_tracker_version', self::VERSION);
        
        if ($this->debug) {
            error_log('PDF Stats Tracker v2 activated and database table created');
        }
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Nothing to do here for now
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('PDF Stats Tracker', 'pdf-stats-tracker'),
            __('PDF Stats', 'pdf-stats-tracker'),
            'manage_options',
            'pdf-stats-tracker',
            array($this, 'display_admin_page'),
            'dashicons-analytics',
            30
        );
        
        // Add submenu pages
        add_submenu_page(
            'pdf-stats-tracker',
            __('Dashboard', 'pdf-stats-tracker'),
            __('Dashboard', 'pdf-stats-tracker'),
            'manage_options',
            'pdf-stats-tracker',
            array($this, 'display_admin_page')
        );
        
        add_submenu_page(
            'pdf-stats-tracker',
            __('Catalogue Stats', 'pdf-stats-tracker'),
            __('Catalogue Stats', 'pdf-stats-tracker'),
            'manage_options',
            'pdf-stats-tracker-catalogue',
            array($this, 'display_catalogue_stats')
        );
        
        add_submenu_page(
            'pdf-stats-tracker',
            __('Fichtech Stats', 'pdf-stats-tracker'),
            __('Fichtech Stats', 'pdf-stats-tracker'),
            'manage_options',
            'pdf-stats-tracker-fichtech',
            array($this, 'display_fichtech_stats')
        );
    }
    
    /**
     * Enqueue frontend scripts
     */
    public function enqueue_scripts() {
        // Enqueue both tracking scripts for maximum compatibility
        wp_enqueue_script(
            'pdf-stats-tracker',
            plugin_dir_url(__FILE__) . 'js/pdf-tracker.js',
            array('jquery'),
            self::VERSION,
            true
        );
        
        wp_enqueue_script(
            'pdf-stats-tracker-direct',
            plugin_dir_url(__FILE__) . 'js/pdf-tracker-direct.js',
            array('jquery'),
            self::VERSION,
            true
        );
        
        wp_localize_script(
            'pdf-stats-tracker',
            'pdfStatsTracker',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('pdf-stats-tracker-nonce'),
                'folders' => array_values($this->folders)
            )
        );
        
        // Also localize the direct tracker
        wp_localize_script(
            'pdf-stats-tracker-direct',
            'pdfStatsTracker',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('pdf-stats-tracker-nonce'),
                'folders' => array_values($this->folders)
            )
        );
    }
    
    /**
     * Add tracking code in footer
     */
    public function add_tracking_code() {
        ?>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                if (typeof jQuery !== 'undefined') {
                    
                    
                    // Scan page for any PDF links that weren't caught by our scripts
                    var allLinks = document.getElementsByTagName('a');
                    for (var i = 0; i < allLinks.length; i++) {
                        var link = allLinks[i];
                        var href = link.getAttribute('href');
                        
                        if (href && href.toLowerCase().endsWith('.pdf')) {
                            
                            
                            // Check if in tracked folders
                            if (href.indexOf('/catalogue/') !== -1 || 
                                href.indexOf('/fichtech/') !== -1) {
                                
                                // Only track if not already tracked
                                if (!link.classList.contains('pdf-tracked')) {
                                    
                                    
                                    // Add tracking manually
                                    link.classList.add('pdf-tracked');
                                    
                                    // Track view on hover
                                    link.addEventListener('mouseenter', function(event) {
                                        var url = this.getAttribute('href');
                                        
                                        
                                        // Manual AJAX call to track view
                                        var xhr = new XMLHttpRequest();
                                        xhr.open('POST', '<?php echo admin_url('admin-ajax.php'); ?>', true);
                                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                                        xhr.send('action=track_pdf_view&nonce=<?php echo wp_create_nonce('pdf-stats-tracker-nonce'); ?>&pdf_url=' + encodeURIComponent(url));
                                    });
                                    
                                    // Track download on click
                                    link.addEventListener('click', function(event) {
                                        var url = this.getAttribute('href');
                                        
                                        
                                        // Manual AJAX call to track download
                                        var xhr = new XMLHttpRequest();
                                        xhr.open('POST', '<?php echo admin_url('admin-ajax.php'); ?>', true);
                                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                                        xhr.send('action=track_pdf_download&nonce=<?php echo wp_create_nonce('pdf-stats-tracker-nonce'); ?>&pdf_url=' + encodeURIComponent(url));
                                    });
                                }
                            }
                        }
                    }
                }
            });
        </script>
        <?php
    }
    
    /**
     * NEW: Check for PDF requests server-side
     * This is a more reliable method to catch PDF accesses
     */
    public function check_for_pdf_request() {
        // Get current URL
        $current_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
        
        // Check if this is a PDF request
        if (stripos($current_url, '.pdf') !== false) {
            if ($this->debug) {
                error_log('PDF Stats Tracker: Detected PDF request: ' . $current_url);
            }
            
            // Check if PDF is in tracked folders
            $folder = '';
            
            foreach ($this->folders as $key => $folder_url) {
                if (strpos($current_url, $folder_url) !== false) {
                    $folder = $key;
                    break;
                }
            }
            
            // Also try with relative paths
            if (empty($folder)) {
                if (strpos($current_url, '/catalogue/') !== false) {
                    $folder = 'catalogue';
                } elseif (strpos($current_url, '/fichtech/') !== false) {
                    $folder = 'fichtech';
                }
            }
            
            if (!empty($folder)) {
                if ($this->debug) {
                    error_log('PDF Stats Tracker: Tracked folder detected: ' . $folder);
                }
                
                // This is a direct PDF access, track as both view and download
                $this->log_server_side_tracking($current_url, 'view', $folder);
                $this->log_server_side_tracking($current_url, 'download', $folder);
            }
        }
    }
    
    /**
     * Server-side tracking for PDF requests
     */
    private function log_server_side_tracking($url, $action, $folder) {
        global $wpdb;
        
        if ($this->debug) {
            error_log("PDF Stats Tracker: Server-side tracking - URL: $url, Action: $action, Folder: $folder");
        }
        
        // Get user info
        $user_ip = $this->get_client_ip();
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        
        // Insert into database
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        $result = $wpdb->insert(
            $table_name,
            array(
                'pdf_url' => $url,
                'folder' => $folder,
                'action' => $action,
                'user_ip' => $user_ip,
                'user_agent' => $user_agent,
                'referer' => $referer,
                'timestamp' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s')
        );
        
        if ($this->debug) {
            if ($result) {
                error_log("PDF Stats Tracker: Server-side tracking saved successfully");
            } else {
                error_log("PDF Stats Tracker: Error saving server-side tracking: " . $wpdb->last_error);
            }
        }
        
        return $result;
    }
    
    /**
     * Track PDF view via AJAX
     */
    public function track_pdf_view() {
        // Check nonce
        check_ajax_referer('pdf-stats-tracker-nonce', 'nonce');
        
        $url = isset($_POST['pdf_url']) ? sanitize_text_field($_POST['pdf_url']) : '';
        
        if (!empty($url)) {
            $result = $this->save_stats($url, 'view');
            
            if ($result) {
                wp_send_json_success(array('status' => 'success', 'message' => 'View tracked'));
            } else {
                wp_send_json_error(array('status' => 'error', 'message' => 'Failed to track view'));
            }
        } else {
            wp_send_json_error(array('status' => 'error', 'message' => 'Invalid PDF URL'));
        }
        
        wp_die();
    }
    
    /**
     * Track PDF download via AJAX
     */
    public function track_pdf_download() {
        // Check nonce
        check_ajax_referer('pdf-stats-tracker-nonce', 'nonce');
        
        $url = isset($_POST['pdf_url']) ? sanitize_text_field($_POST['pdf_url']) : '';
        
        if (!empty($url)) {
            $result = $this->save_stats($url, 'download');
            
            if ($result) {
                wp_send_json_success(array('status' => 'success', 'message' => 'Download tracked'));
            } else {
                wp_send_json_error(array('status' => 'error', 'message' => 'Failed to track download'));
            }
        } else {
            wp_send_json_error(array('status' => 'error', 'message' => 'Invalid PDF URL'));
        }
        
        wp_die();
    }
    
    /**
     * Save stats to database
     */
    private function save_stats($url, $action) {
        global $wpdb;
        
        // Normalize URL for more reliable matching
        $url = trim($url);
        
        if ($this->debug) {
            error_log("PDF Stats Tracker: Processing URL for stats: $url");
        }
        
        // Determine which folder the PDF belongs to
        $folder = '';
        
        // First, check for standard matches
        foreach ($this->folders as $key => $folder_url) {
            if (strpos($url, $folder_url) !== false) {
                $folder = $key;
                if ($this->debug) {
                    error_log("PDF Stats Tracker: Matched folder via direct URL: $folder");
                }
                break;
            }
        }
        
        // If no folder detected yet, try relative paths
        if (empty($folder)) {
            if (strpos($url, '/catalogue/') !== false) {
                $folder = 'catalogue';
                if ($this->debug) {
                    error_log("PDF Stats Tracker: Matched folder via relative path: catalogue");
                }
            } elseif (strpos($url, '/fichtech/') !== false) {
                $folder = 'fichtech';
                if ($this->debug) {
                    error_log("PDF Stats Tracker: Matched folder via relative path: fichtech");
                }
            }
        }
        
        // If still no folder, try to extract from filename pattern
        if (empty($folder)) {
            $url_parts = parse_url($url);
            $path = isset($url_parts['path']) ? $url_parts['path'] : '';
            
            if (preg_match('#/(catalogue|fichtech)/[^/]+\.pdf$#i', $path, $matches)) {
                $folder = strtolower($matches[1]);
                if ($this->debug) {
                    error_log("PDF Stats Tracker: Matched folder via regex: $folder");
                }
            }
        }
        
        // Try an even more permissive check if still no match
        if (empty($folder)) {
            if (stripos($url, 'catalogue') !== false) {
                $folder = 'catalogue';
                if ($this->debug) {
                    error_log("PDF Stats Tracker: Matched folder via string search: catalogue");
                }
            } elseif (stripos($url, 'fichtech') !== false) {
                $folder = 'fichtech';
                if ($this->debug) {
                    error_log("PDF Stats Tracker: Matched folder via string search: fichtech");
                }
            }
        }
        
        // If we still can't determine the folder, log and exit
        if (empty($folder)) {
            if ($this->debug) {
                error_log("PDF Stats Tracker: Could not determine folder for URL: $url");
            }
            return false;
        }
        
        // Get user info
        $user_ip = $this->get_client_ip();
        $user_agent = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        $referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '';
        
        // Insert into database
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        $result = $wpdb->insert(
            $table_name,
            array(
                'pdf_url' => $url,
                'folder' => $folder,
                'action' => $action,
                'user_ip' => $user_ip,
                'user_agent' => $user_agent,
                'referer' => $referer,
                'timestamp' => current_time('mysql')
            ),
            array('%s', '%s', '%s', '%s', '%s', '%s', '%s')
        );
        
        if ($this->debug) {
            if ($result) {
                error_log("PDF Stats Tracker: Stats saved successfully - URL: $url, Action: $action, Folder: $folder");
            } else {
                error_log("PDF Stats Tracker: Error saving stats: " . $wpdb->last_error);
            }
        }
        
        return $result;
    }
    
    /**
     * Get client IP address
     */
    private function get_client_ip() {
        $ip = '';
        
        if (isset($_SERVER['HTTP_CF_CONNECTING_IP'])) { // CloudFlare
            $ip = $_SERVER['HTTP_CF_CONNECTING_IP'];
        } elseif (isset($_SERVER['HTTP_X_FORWARDED_FOR'])) { // Proxy
            $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
        } elseif (isset($_SERVER['REMOTE_ADDR'])) { // Direct
            $ip = $_SERVER['REMOTE_ADDR'];
        }
        
        return sanitize_text_field($ip);
    }
    
    /**
     * Display main admin page
     */
    public function display_admin_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        // Get download counts for today, this week, this month, and all time
        $today_start = date('Y-m-d 00:00:00');
        $week_start = date('Y-m-d 00:00:00', strtotime('this week'));
        $month_start = date('Y-m-01 00:00:00');
        
        $total_views = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE action = 'view'");
        $total_downloads = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE action = 'download'");
        
        $today_views = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE action = 'view' AND timestamp >= %s",
                $today_start
            )
        );
        
        $today_downloads = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE action = 'download' AND timestamp >= %s",
                $today_start
            )
        );
        
        $week_views = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE action = 'view' AND timestamp >= %s",
                $week_start
            )
        );
        
        $week_downloads = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE action = 'download' AND timestamp >= %s",
                $week_start
            )
        );
        
        $month_views = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE action = 'view' AND timestamp >= %s",
                $month_start
            )
        );
        
        $month_downloads = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE action = 'download' AND timestamp >= %s",
                $month_start
            )
        );
        
        // Get top 10 PDFs by views
        $top_pdfs_views = $wpdb->get_results(
            "SELECT pdf_url, COUNT(*) as count FROM $table_name 
            WHERE action = 'view' 
            GROUP BY pdf_url 
            ORDER BY count DESC 
            LIMIT 10"
        );
        
        // Get top 10 PDFs by downloads
        $top_pdfs_downloads = $wpdb->get_results(
            "SELECT pdf_url, COUNT(*) as count FROM $table_name 
            WHERE action = 'download' 
            GROUP BY pdf_url 
            ORDER BY count DESC 
            LIMIT 10"
        );
        
        // Include the admin view
        include plugin_dir_path(__FILE__) . 'views/admin-dashboard.php';
    }
    
    /**
     * Display catalogue stats
     */
    public function display_catalogue_stats() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        // Get all PDFs from catalogue folder with view and download counts
        $catalogue_stats = $wpdb->get_results(
            "SELECT 
                pdf_url, 
                SUM(CASE WHEN action = 'view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN action = 'download' THEN 1 ELSE 0 END) as downloads,
                MIN(timestamp) as first_access,
                MAX(timestamp) as last_access
            FROM $table_name 
            WHERE folder = 'catalogue'
            GROUP BY pdf_url 
            ORDER BY views DESC"
        );
        
        // Include the admin view
        include plugin_dir_path(__FILE__) . 'views/catalogue-stats.php';
    }
    
    /**
     * Display fichtech stats
     */
    public function display_fichtech_stats() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        // Get all PDFs from fichtech folder with view and download counts
        $fichtech_stats = $wpdb->get_results(
            "SELECT 
                pdf_url, 
                SUM(CASE WHEN action = 'view' THEN 1 ELSE 0 END) as views,
                SUM(CASE WHEN action = 'download' THEN 1 ELSE 0 END) as downloads,
                MIN(timestamp) as first_access,
                MAX(timestamp) as last_access
            FROM $table_name 
            WHERE folder = 'fichtech'
            GROUP BY pdf_url 
            ORDER BY views DESC"
        );
        
        // Include the admin view
        include plugin_dir_path(__FILE__) . 'views/fichtech-stats.php';
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function admin_enqueue_scripts($hook) {
        // Only load on our plugin pages
        if (strpos($hook, 'pdf-stats-tracker') === false) {
            return;
        }
        
        // Add admin styles
        wp_enqueue_style(
            'pdf-stats-tracker-admin',
            plugin_dir_url(__FILE__) . 'css/admin-style.css',
            array(),
            self::VERSION
        );
        
        // Add Chart.js for future visualization
        wp_enqueue_script(
            'chart-js',
            'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js',
            array(),
            '3.7.1',
            true
        );
        
        // Admin scripts
        wp_enqueue_script(
            'pdf-stats-tracker-admin',
            plugin_dir_url(__FILE__) . 'js/admin-scripts.js',
            array('jquery', 'chart-js'),
            self::VERSION,
            true
        );
        
        // Pass data to admin script
        wp_localize_script(
            'pdf-stats-tracker-admin',
            'pdfStatsAdmin',
            array(
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('pdf-stats-admin-nonce')
            )
        );
    }
    
    /**
     * Handle export requests
     */
    public function handle_export() {
        if (!isset($_POST['pdf_stats_export']) || !isset($_POST['pdf_stats_export_nonce'])) {
            return;
        }
        
        // Verify nonce
        if (!wp_verify_nonce($_POST['pdf_stats_export_nonce'], 'pdf_stats_export')) {
            wp_die(__('Security check failed', 'pdf-stats-tracker'));
        }
        
        // Check user capability
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have permission to export data', 'pdf-stats-tracker'));
        }
        
        // Get export parameters
        $folder = isset($_POST['export_folder']) ? sanitize_text_field($_POST['export_folder']) : '';
        $format = isset($_POST['export_format']) ? sanitize_text_field($_POST['export_format']) : 'csv';
        
        // Validate folder
        if (!in_array($folder, array('catalogue', 'fichtech'))) {
            wp_die(__('Invalid folder specified', 'pdf-stats-tracker'));
        }
        
        // Get data to export
        global $wpdb;
        $table_name = $wpdb->prefix . 'pdf_stats';
        
        $stats = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT 
                    pdf_url, 
                    SUM(CASE WHEN action = 'view' THEN 1 ELSE 0 END) as views,
                    SUM(CASE WHEN action = 'download' THEN 1 ELSE 0 END) as downloads,
                    MIN(timestamp) as first_access,
                    MAX(timestamp) as last_access
                FROM $table_name 
                WHERE folder = %s
                GROUP BY pdf_url 
                ORDER BY views DESC",
                $folder
            ),
            ARRAY_A
        );
        
        if (empty($stats)) {
            wp_die(__('No data available for export', 'pdf-stats-tracker'));
        }
        
        // Set filename
        $filename = 'pdf-stats-' . $folder . '-' . date('Y-m-d') . ($format === 'csv' ? '.csv' : '.xlsx');
        
        // Export as CSV
        if ($format === 'csv') {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            
            $output = fopen('php://output', 'w');
            
            // Add CSV headers
            fputcsv($output, array(
                __('PDF File', 'pdf-stats-tracker'),
                __('Views', 'pdf-stats-tracker'),
                __('Downloads', 'pdf-stats-tracker'),
                __('First Access', 'pdf-stats-tracker'),
                __('Last Access', 'pdf-stats-tracker')
            ));
            
            // Add data rows
            foreach ($stats as $row) {
                fputcsv($output, array(
                    basename($row['pdf_url']),
                    $row['views'],
                    $row['downloads'],
                    $row['first_access'],
                    $row['last_access']
                ));
            }
            
            fclose($output);
            exit;
        }
        // Export as Excel (requires PHPExcel or similar library)
        elseif ($format === 'excel') {
            // This requires PHPExcel or a similar library
            // For now, we'll just export as CSV
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="' . $filename . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // Add CSV headers
            fputcsv($output, array(
                __('PDF File', 'pdf-stats-tracker'),
                __('Views', 'pdf-stats-tracker'),
                __('Downloads', 'pdf-stats-tracker'),
                __('First Access', 'pdf-stats-tracker'),
                __('Last Access', 'pdf-stats-tracker')
            ));
            
            // Add data rows
            foreach ($stats as $row) {
                fputcsv($output, array(
                    basename($row['pdf_url']),
                    $row['views'],
                    $row['downloads'],
                    $row['first_access'],
                    $row['last_access']
                ));
            }
            
            fclose($output);
            exit;
        }
    }
}

// Initialize the plugin
$pdf_stats_tracker = new PDF_Stats_Tracker();