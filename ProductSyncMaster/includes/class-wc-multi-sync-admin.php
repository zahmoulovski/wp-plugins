<?php
/**
 * Admin interface class
 */
class WC_Multi_Sync_Admin {
    
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('wp_ajax_wc_multi_sync_test_connection', array($this, 'ajax_test_connection'));
        add_action('wp_ajax_wc_multi_sync_manual_sync', array($this, 'ajax_manual_sync'));
        add_action('wp_ajax_wc_multi_sync_bulk_sync', array($this, 'ajax_bulk_sync'));
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('WC Multi-Sync', 'wc-multi-sync'),
            __('WC Multi-Sync', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync',
            array($this, 'dashboard_page'),
            'dashicons-update',
            56
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Dashboard', 'wc-multi-sync'),
            __('Dashboard', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync',
            array($this, 'dashboard_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Destination Sites', 'wc-multi-sync'),
            __('Sites', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-sites',
            array($this, 'sites_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Sync Rules', 'wc-multi-sync'),
            __('Sync Rules', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-rules',
            array($this, 'rules_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Activity Logs', 'wc-multi-sync'),
            __('Logs', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-logs',
            array($this, 'logs_page')
        );
        
        add_submenu_page(
            'wc-multi-sync',
            __('Settings', 'wc-multi-sync'),
            __('Settings', 'wc-multi-sync'),
            'manage_woocommerce',
            'wc-multi-sync-settings',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        if (strpos($hook, 'wc-multi-sync') === false) {
            return;
        }
        
        wp_enqueue_style(
            'wc-multi-sync-admin',
            WC_MULTI_SYNC_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            WC_MULTI_SYNC_VERSION
        );
        
        wp_enqueue_script(
            'wc-multi-sync-admin',
            WC_MULTI_SYNC_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            WC_MULTI_SYNC_VERSION,
            true
        );
        
        wp_localize_script('wc-multi-sync-admin', 'wcMultiSync', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('wc_multi_sync_nonce'),
            'strings' => array(
                'testing_connection' => __('Testing connection...', 'wc-multi-sync'),
                'connection_successful' => __('Connection successful!', 'wc-multi-sync'),
                'connection_failed' => __('Connection failed!', 'wc-multi-sync'),
                'sync_started' => __('Sync started successfully!', 'wc-multi-sync'),
                'sync_failed' => __('Sync failed!', 'wc-multi-sync'),
                'confirm_delete' => __('Are you sure you want to delete this site?', 'wc-multi-sync')
            )
        ));
    }
    
    /**
     * Dashboard page
     */
    public function dashboard_page() {
        $stats = WC_Multi_Sync_Database::get_dashboard_stats();
        $recent_logs = WC_Multi_Sync_Database::get_logs(10);
        ?>
        <div class="wrap wc-multi-sync-dashboard">
            <h1><?php _e('WooCommerce Multi-Site Sync Dashboard', 'wc-multi-sync'); ?></h1>
            
            <!-- Statistics Cards -->
            <div class="wc-multi-sync-stats-grid">
                <div class="stats-card">
                    <div class="stats-icon">📊</div>
                    <div class="stats-content">
                        <h3><?php echo esc_html($stats['total_sites']); ?></h3>
                        <p><?php _e('Total Sites', 'wc-multi-sync'); ?></p>
                        <small><?php echo esc_html($stats['active_sites']); ?> <?php _e('active', 'wc-multi-sync'); ?></small>
                    </div>
                </div>
                
                <div class="stats-card">
                    <div class="stats-icon">⏳</div>
                    <div class="stats-content">
                        <h3><?php echo esc_html($stats['pending_jobs']); ?></h3>
                        <p><?php _e('Pending Jobs', 'wc-multi-sync'); ?></p>
                        <small><?php _e('awaiting sync', 'wc-multi-sync'); ?></small>
                    </div>
                </div>
                
                <div class="stats-card">
                    <div class="stats-icon">✅</div>
                    <div class="stats-content">
                        <h3><?php echo esc_html($stats['completed_today']); ?></h3>
                        <p><?php _e('Synced Today', 'wc-multi-sync'); ?></p>
                        <small><?php _e('products synced', 'wc-multi-sync'); ?></small>
                    </div>
                </div>
                
                <div class="stats-card <?php echo $stats['failed_jobs'] > 0 ? 'error' : ''; ?>">
                    <div class="stats-icon"><?php echo $stats['failed_jobs'] > 0 ? '❌' : '✅'; ?></div>
                    <div class="stats-content">
                        <h3><?php echo esc_html($stats['failed_jobs']); ?></h3>
                        <p><?php _e('Failed Jobs', 'wc-multi-sync'); ?></p>
                        <small><?php _e('need attention', 'wc-multi-sync'); ?></small>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="wc-multi-sync-quick-actions">
                <h2><?php _e('Quick Actions', 'wc-multi-sync'); ?></h2>
                <div class="action-buttons">
                    <button class="button button-primary" id="bulk-sync-all">
                        <?php _e('Sync All Products', 'wc-multi-sync'); ?>
                    </button>
                    <button class="button" id="test-all-connections">
                        <?php _e('Test All Connections', 'wc-multi-sync'); ?>
                    </button>
                    <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-sites'); ?>" class="button">
                        <?php _e('Manage Sites', 'wc-multi-sync'); ?>
                    </a>
                </div>
            </div>
            
            <!-- Recent Activity -->
            <div class="wc-multi-sync-recent-activity">
                <h2><?php _e('Recent Activity', 'wc-multi-sync'); ?></h2>
                <div class="activity-log">
                    <?php if ($recent_logs): ?>
                        <?php foreach ($recent_logs as $log): ?>
                            <div class="log-entry log-<?php echo esc_attr($log->type); ?>">
                                <div class="log-time"><?php echo esc_html(human_time_diff(strtotime($log->created_at))); ?> <?php _e('ago', 'wc-multi-sync'); ?></div>
                                <div class="log-message"><?php echo esc_html($log->message); ?></div>
                                <?php if ($log->product_id): ?>
                                    <div class="log-product">
                                        <?php $product = wc_get_product($log->product_id); ?>
                                        <?php if ($product): ?>
                                            <small><?php printf(__('Product: %s', 'wc-multi-sync'), $product->get_name()); ?></small>
                                        <?php endif; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <p><?php _e('No recent activity.', 'wc-multi-sync'); ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Sites management page
     */
    public function sites_page() {
        // Handle form submissions
        if (isset($_POST['submit'])) {
            $this->handle_site_form();
        }
        
        if (isset($_GET['action']) && $_GET['action'] === 'delete' && isset($_GET['site_id'])) {
            $this->handle_site_delete();
        }
        
        $sites = WC_Multi_Sync_Database::get_sites();
        $edit_site = null;
        
        if (isset($_GET['action']) && $_GET['action'] === 'edit' && isset($_GET['site_id'])) {
            $edit_site = WC_Multi_Sync_Database::get_site($_GET['site_id']);
        }
        ?>
        <div class="wrap">
            <h1><?php _e('Destination Sites', 'wc-multi-sync'); ?></h1>
            
            <!-- Add/Edit Site Form -->
            <div class="wc-multi-sync-site-form">
                <h2><?php echo $edit_site ? __('Edit Site', 'wc-multi-sync') : __('Add New Site', 'wc-multi-sync'); ?></h2>
                <form method="post" action="">
                    <?php wp_nonce_field('wc_multi_sync_site_form'); ?>
                    <?php if ($edit_site): ?>
                        <input type="hidden" name="site_id" value="<?php echo esc_attr($edit_site->id); ?>">
                        <input type="hidden" name="action" value="edit">
                    <?php endif; ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Site Name', 'wc-multi-sync'); ?></th>
                            <td>
                                <input type="text" name="site_name" value="<?php echo $edit_site ? esc_attr($edit_site->name) : ''; ?>" class="regular-text" required>
                                <p class="description"><?php _e('A friendly name for this destination site.', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Site URL', 'wc-multi-sync'); ?></th>
                            <td>
                                <input type="url" name="site_url" value="<?php echo $edit_site ? esc_url($edit_site->url) : ''; ?>" class="regular-text" required>
                                <p class="description"><?php _e('The full URL of the destination WooCommerce site (e.g., https://example.com).', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Consumer Key', 'wc-multi-sync'); ?></th>
                            <td>
                                <input type="text" name="consumer_key" value="<?php echo $edit_site ? esc_attr($edit_site->consumer_key) : ''; ?>" class="regular-text" required>
                                <p class="description"><?php _e('WooCommerce REST API Consumer Key from the destination site.', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Consumer Secret', 'wc-multi-sync'); ?></th>
                            <td>
                                <input type="password" name="consumer_secret" value="<?php echo $edit_site ? esc_attr($edit_site->consumer_secret) : ''; ?>" class="regular-text" required>
                                <p class="description"><?php _e('WooCommerce REST API Consumer Secret from the destination site.', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Active', 'wc-multi-sync'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" name="is_active" value="1" <?php checked($edit_site ? $edit_site->is_active : true); ?>>
                                    <?php _e('Enable synchronization to this site', 'wc-multi-sync'); ?>
                                </label>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <input type="submit" name="submit" class="button-primary" value="<?php echo $edit_site ? __('Update Site', 'wc-multi-sync') : __('Add Site', 'wc-multi-sync'); ?>">
                        <button type="button" class="button test-connection-btn" data-site-form="true"><?php _e('Test Connection', 'wc-multi-sync'); ?></button>
                        <?php if ($edit_site): ?>
                            <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-sites'); ?>" class="button"><?php _e('Cancel', 'wc-multi-sync'); ?></a>
                        <?php endif; ?>
                    </p>
                </form>
            </div>
            
            <!-- Sites List -->
            <div class="wc-multi-sync-sites-list">
                <h2><?php _e('Configured Sites', 'wc-multi-sync'); ?></h2>
                <?php if ($sites): ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th><?php _e('Name', 'wc-multi-sync'); ?></th>
                                <th><?php _e('URL', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Status', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Last Sync', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Actions', 'wc-multi-sync'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($sites as $site): ?>
                                <tr>
                                    <td><strong><?php echo esc_html($site->name); ?></strong></td>
                                    <td><a href="<?php echo esc_url($site->url); ?>" target="_blank"><?php echo esc_html($site->url); ?></a></td>
                                    <td>
                                        <span class="status-indicator <?php echo $site->is_active ? 'active' : 'inactive'; ?>">
                                            <?php echo $site->is_active ? __('Active', 'wc-multi-sync') : __('Inactive', 'wc-multi-sync'); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php 
                                        if ($site->last_sync) {
                                            echo esc_html(human_time_diff(strtotime($site->last_sync))) . ' ' . __('ago', 'wc-multi-sync');
                                        } else {
                                            echo __('Never', 'wc-multi-sync');
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-sites&action=edit&site_id=' . $site->id); ?>" class="button button-small"><?php _e('Edit', 'wc-multi-sync'); ?></a>
                                        <button class="button button-small test-connection-btn" data-site-id="<?php echo esc_attr($site->id); ?>"><?php _e('Test', 'wc-multi-sync'); ?></button>
                                        <button class="button button-small sync-site-btn" data-site-id="<?php echo esc_attr($site->id); ?>"><?php _e('Sync Now', 'wc-multi-sync'); ?></button>
                                        <a href="<?php echo wp_nonce_url(admin_url('admin.php?page=wc-multi-sync-sites&action=delete&site_id=' . $site->id), 'delete_site_' . $site->id); ?>" class="button button-small delete-site" onclick="return confirm('<?php esc_attr_e('Are you sure you want to delete this site?', 'wc-multi-sync'); ?>')"><?php _e('Delete', 'wc-multi-sync'); ?></a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <p><?php _e('No destination sites configured yet.', 'wc-multi-sync'); ?></p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Handle site form submission
     */
    private function handle_site_form() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'wc_multi_sync_site_form')) {
            wp_die(__('Security check failed.', 'wc-multi-sync'));
        }
        
        $site_data = array(
            'name' => sanitize_text_field($_POST['site_name']),
            'url' => esc_url_raw($_POST['site_url']),
            'consumer_key' => sanitize_text_field($_POST['consumer_key']),
            'consumer_secret' => sanitize_text_field($_POST['consumer_secret']),
            'is_active' => isset($_POST['is_active'])
        );
        
        if (isset($_POST['action']) && $_POST['action'] === 'edit' && isset($_POST['site_id'])) {
            // Update existing site
            $result = WC_Multi_Sync_Database::update_site($_POST['site_id'], $site_data);
            if ($result !== false) {
                echo '<div class="notice notice-success"><p>' . __('Site updated successfully.', 'wc-multi-sync') . '</p></div>';
            } else {
                echo '<div class="notice notice-error"><p>' . __('Failed to update site.', 'wc-multi-sync') . '</p></div>';
            }
        } else {
            // Add new site
            $result = WC_Multi_Sync_Database::add_site($site_data);
            if ($result) {
                echo '<div class="notice notice-success"><p>' . __('Site added successfully.', 'wc-multi-sync') . '</p></div>';
            } else {
                echo '<div class="notice notice-error"><p>' . __('Failed to add site.', 'wc-multi-sync') . '</p></div>';
            }
        }
    }
    
    /**
     * Handle site deletion
     */
    private function handle_site_delete() {
        $site_id = intval($_GET['site_id']);
        
        if (!wp_verify_nonce($_GET['_wpnonce'], 'delete_site_' . $site_id)) {
            wp_die(__('Security check failed.', 'wc-multi-sync'));
        }
        
        $result = WC_Multi_Sync_Database::delete_site($site_id);
        if ($result) {
            echo '<div class="notice notice-success"><p>' . __('Site deleted successfully.', 'wc-multi-sync') . '</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>' . __('Failed to delete site.', 'wc-multi-sync') . '</p></div>';
        }
    }
    
    /**
     * Rules page
     */
    public function rules_page() {
        // Handle form submissions
        if (isset($_POST['submit_rule'])) {
            $this->handle_sync_rule_form();
        }
        
        if (isset($_GET['action']) && $_GET['action'] === 'delete_rule' && isset($_GET['rule_id'])) {
            $this->handle_sync_rule_delete();
        }
        
        $sites = WC_Multi_Sync_Database::get_sites();
        $rules = WC_Multi_Sync_Database::get_sync_rules();
        
        // Get WooCommerce categories hierarchically
        $categories = get_terms(array(
            'taxonomy' => 'product_cat',
            'hide_empty' => false,
            'hierarchical' => true,
            'parent' => 0
        ));
        ?>
        <div class="wrap">
            <h1><?php _e('Sync Rules', 'wc-multi-sync'); ?></h1>
            
            <!-- Add New Rule Form -->
            <div class="wc-multi-sync-rule-form">
                <h2><?php _e('Add New Sync Rule', 'wc-multi-sync'); ?></h2>
                <form method="post" action="">
                    <?php wp_nonce_field('wc_multi_sync_rule_form'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Target Site', 'wc-multi-sync'); ?></th>
                            <td>
                                <select name="site_id" required>
                                    <option value=""><?php _e('Select a site...', 'wc-multi-sync'); ?></option>
                                    <?php foreach ($sites as $site): ?>
                                        <option value="<?php echo esc_attr($site->id); ?>"><?php echo esc_html($site->name); ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description"><?php _e('Which destination site should this rule apply to.', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Product Categories', 'wc-multi-sync'); ?></th>
                            <td>
                                <select name="categories[]" multiple size="6" style="width: 300px;height:350px;">
                                    <option value=""><?php _e('All Categories (no filter)', 'wc-multi-sync'); ?></option>
                                    <?php
                                    function display_category_option($category, $depth = 0) {
                                        $indent = str_repeat('— ', $depth);
                                        ?>
                                        <option value="<?php echo esc_attr($category->slug); ?>">
                                            <?php echo esc_html($indent . $category->name); ?>
                                        </option>
                                        <?php
                                        $child_categories = get_terms(array(
                                            'taxonomy' => 'product_cat',
                                            'hide_empty' => false,
                                            'hierarchical' => true,
                                            'parent' => $category->term_id
                                        ));
                                        
                                        foreach ($child_categories as $child_category) {
                                            display_category_option($child_category, $depth + 1);
                                        }
                                    }
                                    
                                    foreach ($categories as $category) {
                                        display_category_option($category);
                                    }
                                    ?>
                                </select>
                                <p class="description"><?php _e('Hold Ctrl/Cmd to select multiple categories. Leave empty to sync all categories.', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Price Range', 'wc-multi-sync'); ?></th>
                            <td>
                                <input type="number" name="price_min" placeholder="0" step="0.01" style="width: 100px;"> 
                                <?php _e('to', 'wc-multi-sync'); ?>
                                <input type="number" name="price_max" placeholder="1000" step="0.01" style="width: 100px;">
                                <p class="description"><?php _e('Only sync products within this price range. Leave empty for no price restrictions.', 'wc-multi-sync'); ?></p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Sync Options', 'wc-multi-sync'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="checkbox" name="auto_sync" value="1" checked>
                                        <?php _e('Enable automatic sync for this rule', 'wc-multi-sync'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="sync_products" value="1" checked>
                                        <?php _e('Sync product information', 'wc-multi-sync'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="sync_images" value="1" checked>
                                        <?php _e('Sync product images', 'wc-multi-sync'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="sync_categories" value="1" checked>
                                        <?php _e('Sync categories and tags', 'wc-multi-sync'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="sync_inventory" value="1">
                                        <?php _e('Sync inventory levels', 'wc-multi-sync'); ?>
                                    </label>
                                </fieldset>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <input type="submit" name="submit_rule" class="button-primary" value="<?php _e('Add Sync Rule', 'wc-multi-sync'); ?>">
                    </p>
                </form>
            </div>
            
            <!-- Existing Rules -->
            <div class="wc-multi-sync-rules-list">
                <h2><?php _e('Current Sync Rules', 'wc-multi-sync'); ?></h2>
                <?php if ($rules): ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th><?php _e('Site', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Categories', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Price Range', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Options', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Status', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Actions', 'wc-multi-sync'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($rules as $rule): ?>
                                <?php 
                                $site = WC_Multi_Sync_Database::get_site($rule->siteId);
                                $rule_categories = maybe_unserialize($rule->categories);
                                ?>
                                <tr>
                                    <td><strong><?php echo $site ? esc_html($site->name) : __('Unknown Site', 'wc-multi-sync'); ?></strong></td>
                                    <td>
                                        <?php 
                                        if ($rule_categories && is_array($rule_categories)) {
                                            echo esc_html(implode(', ', array_slice($rule_categories, 0, 3)));
                                            if (count($rule_categories) > 3) {
                                                echo ' <small>(' . sprintf(__('and %d more', 'wc-multi-sync'), count($rule_categories) - 3) . ')</small>';
                                            }
                                        } else {
                                            echo __('All Categories', 'wc-multi-sync');
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <?php 
                                        if ($rule->priceMin || $rule->priceMax) {
                                            echo ($rule->priceMin ?: '0') . ' - ' . ($rule->priceMax ?: '∞');
                                        } else {
                                            echo __('No Limit', 'wc-multi-sync');
                                        }
                                        ?>
                                    </td>
                                    <td>
                                        <small>
                                            <?php if ($rule->syncProducts): ?><?php _e('Products', 'wc-multi-sync'); ?> <?php endif; ?>
                                            <?php if ($rule->syncImages): ?><?php _e('Images', 'wc-multi-sync'); ?> <?php endif; ?>
                                            <?php if ($rule->syncCategories): ?><?php _e('Categories', 'wc-multi-sync'); ?> <?php endif; ?>
                                            <?php if ($rule->syncInventory): ?><?php _e('Inventory', 'wc-multi-sync'); ?> <?php endif; ?>
                                        </small>
                                    </td>
                                    <td>
                                        <span class="status-indicator <?php echo $rule->autoSync ? 'active' : 'inactive'; ?>">
                                            <?php echo $rule->autoSync ? __('Active', 'wc-multi-sync') : __('Inactive', 'wc-multi-sync'); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <a href="<?php echo wp_nonce_url(admin_url('admin.php?page=wc-multi-sync-rules&action=delete_rule&rule_id=' . $rule->id), 'delete_rule_' . $rule->id); ?>" 
                                           class="button button-small delete-rule" 
                                           onclick="return confirm('<?php esc_attr_e('Are you sure you want to delete this sync rule?', 'wc-multi-sync'); ?>')">
                                            <?php _e('Delete', 'wc-multi-sync'); ?>
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <p><?php _e('No sync rules configured yet. Add a rule above to get started.', 'wc-multi-sync'); ?></p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Logs page
     */
    public function logs_page() {
        $logs = WC_Multi_Sync_Database::get_logs(100);
        ?>
        <div class="wrap">
            <h1><?php _e('Activity Logs', 'wc-multi-sync'); ?></h1>
            
            <div class="wc-multi-sync-logs">
                <?php if ($logs): ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th><?php _e('Time', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Type', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Message', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Product', 'wc-multi-sync'); ?></th>
                                <th><?php _e('Site', 'wc-multi-sync'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($logs as $log): ?>
                                <tr>
                                    <td><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($log->created_at))); ?></td>
                                    <td><span class="log-type log-<?php echo esc_attr($log->type); ?>"><?php echo esc_html(ucfirst(str_replace('_', ' ', $log->type))); ?></span></td>
                                    <td><?php echo esc_html($log->message); ?></td>
                                    <td>
                                        <?php if ($log->product_id): ?>
                                            <?php $product = wc_get_product($log->product_id); ?>
                                            <?php if ($product): ?>
                                                <a href="<?php echo get_edit_post_link($log->product_id); ?>"><?php echo esc_html($product->get_name()); ?></a>
                                            <?php else: ?>
                                                <?php printf(__('Product #%d', 'wc-multi-sync'), $log->product_id); ?>
                                            <?php endif; ?>
                                        <?php else: ?>
                                            —
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?php if ($log->site_id): ?>
                                            <?php $site = WC_Multi_Sync_Database::get_site($log->site_id); ?>
                                            <?php echo $site ? esc_html($site->name) : sprintf(__('Site #%d', 'wc-multi-sync'), $log->site_id); ?>
                                        <?php else: ?>
                                            —
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <p><?php _e('No activity logs found.', 'wc-multi-sync'); ?></p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        if (isset($_POST['submit'])) {
            $this->handle_settings_save();
        }
        
        $settings = get_option('wc_multi_sync_settings', array());
        ?>
        <div class="wrap">
            <h1><?php _e('WC Multi-Sync Settings', 'wc-multi-sync'); ?></h1>
            
            <form method="post" action="">
                <?php wp_nonce_field('wc_multi_sync_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Real-time Sync', 'wc-multi-sync'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox" name="real_time_sync" value="yes" <?php checked($settings['real_time_sync'] ?? 'yes', 'yes'); ?>>
                                <?php _e('Enable real-time synchronization when products are created, updated, or deleted', 'wc-multi-sync'); ?>
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Sync Frequency', 'wc-multi-sync'); ?></th>
                        <td>
                            <select name="sync_frequency">
                                <option value="300" <?php selected($settings['sync_frequency'] ?? '300', '300'); ?>><?php _e('Every 5 minutes', 'wc-multi-sync'); ?></option>
                                <option value="600" <?php selected($settings['sync_frequency'] ?? '300', '600'); ?>><?php _e('Every 10 minutes', 'wc-multi-sync'); ?></option>
                                <option value="1800" <?php selected($settings['sync_frequency'] ?? '300', '1800'); ?>><?php _e('Every 30 minutes', 'wc-multi-sync'); ?></option>
                                <option value="3600" <?php selected($settings['sync_frequency'] ?? '300', '3600'); ?>><?php _e('Every hour', 'wc-multi-sync'); ?></option>
                            </select>
                            <p class="description"><?php _e('How often to check for and process pending sync jobs.', 'wc-multi-sync'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Batch Size', 'wc-multi-sync'); ?></th>
                        <td>
                            <input type="number" name="batch_size" value="<?php echo esc_attr($settings['batch_size'] ?? '1000'); ?>" min="1" max="10000" class="small-text">
                            <p class="description"><?php _e('Number of products to sync in each batch.', 'wc-multi-sync'); ?></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Sync Content', 'wc-multi-sync'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="checkbox" name="sync_images" value="yes" <?php checked($settings['sync_images'] ?? 'yes', 'yes'); ?>>
                                    <?php _e('Sync product images', 'wc-multi-sync'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="sync_categories" value="yes" <?php checked($settings['sync_categories'] ?? 'yes', 'yes'); ?>>
                                    <?php _e('Sync categories and tags', 'wc-multi-sync'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="sync_variations" value="yes" <?php checked($settings['sync_variations'] ?? 'yes', 'yes'); ?>>
                                    <?php _e('Sync product variations', 'wc-multi-sync'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="sync_inventory" value="yes" <?php checked($settings['sync_inventory'] ?? 'no', 'yes'); ?>>
                                    <?php _e('Sync inventory levels', 'wc-multi-sync'); ?>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row"><?php _e('Notifications', 'wc-multi-sync'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="checkbox" name="email_notifications" value="yes" <?php checked($settings['email_notifications'] ?? 'yes', 'yes'); ?>>
                                    <?php _e('Send email notifications for sync failures', 'wc-multi-sync'); ?>
                                </label><br>
                                
                                <label>
                                    <input type="checkbox" name="webhook_notifications" value="yes" <?php checked($settings['webhook_notifications'] ?? 'no', 'yes'); ?>>
                                    <?php _e('Send webhook notifications', 'wc-multi-sync'); ?>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="submit" class="button-primary" value="<?php _e('Save Settings', 'wc-multi-sync'); ?>">
                </p>
            </form>
        </div>
        <?php
    }
    
    /**
     * Handle settings save
     */
    private function handle_settings_save() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'wc_multi_sync_settings')) {
            wp_die(__('Security check failed.', 'wc-multi-sync'));
        }
        
        $settings = array(
            'real_time_sync' => isset($_POST['real_time_sync']) ? 'yes' : 'no',
            'sync_frequency' => sanitize_text_field($_POST['sync_frequency']),
            'batch_size' => intval($_POST['batch_size']),
            'sync_images' => isset($_POST['sync_images']) ? 'yes' : 'no',
            'sync_categories' => isset($_POST['sync_categories']) ? 'yes' : 'no',
            'sync_variations' => isset($_POST['sync_variations']) ? 'yes' : 'no',
            'sync_inventory' => isset($_POST['sync_inventory']) ? 'yes' : 'no',
            'email_notifications' => isset($_POST['email_notifications']) ? 'yes' : 'no',
            'webhook_notifications' => isset($_POST['webhook_notifications']) ? 'yes' : 'no'
        );
        
        update_option('wc_multi_sync_settings', $settings);
        echo '<div class="notice notice-success"><p>' . __('Settings saved successfully.', 'wc-multi-sync') . '</p></div>';
    }
    
    /**
     * AJAX: Test connection
     */
    public function ajax_test_connection() {
        check_ajax_referer('wc_multi_sync_nonce', 'nonce');
        
        if (isset($_POST['site_id'])) {
            $site = WC_Multi_Sync_Database::get_site($_POST['site_id']);
            if (!$site) {
                wp_send_json_error(__('Site not found.', 'wc-multi-sync'));
            }
        } else {
            // Test connection for form data
            $site = (object) array(
                'url' => esc_url_raw($_POST['site_url']),
                'consumer_key' => sanitize_text_field($_POST['consumer_key']),
                'consumer_secret' => sanitize_text_field($_POST['consumer_secret'])
            );
        }
        
        $api = new WC_Multi_Sync_API();
        $result = $api->test_connection($site->url, $site->consumer_key, $site->consumer_secret);
        
        if ($result['success']) {
            wp_send_json_success(__('Connection successful!', 'wc-multi-sync'));
        } else {
            wp_send_json_error($result['message']);
        }
    }
    
    /**
     * AJAX: Manual sync
     */
    public function ajax_manual_sync() {
        check_ajax_referer('wc_multi_sync_nonce', 'nonce');
        
        $site_id = intval($_POST['site_id']);
        $products = get_posts(array(
            'post_type' => 'product',
            'numberposts' => 50,
            'post_status' => 'publish'
        ));
        
        $jobs_created = 0;
        foreach ($products as $product) {
            if (WC_Multi_Sync_Database::add_sync_job($product->ID, $site_id)) {
                $jobs_created++;
            }
        }
        
        wp_send_json_success(sprintf(__('%d sync jobs created.', 'wc-multi-sync'), $jobs_created));
    }
    
    /**
     * AJAX: Bulk sync
     */
    public function ajax_bulk_sync() {
        check_ajax_referer('wc_multi_sync_nonce', 'nonce');
        
        $sites = WC_Multi_Sync_Database::get_sites();
        $products = get_posts(array(
            'post_type' => 'product',
            'numberposts' => -1,
            'post_status' => 'publish'
        ));
        
        $jobs_created = 0;
        foreach ($sites as $site) {
            if (!$site->is_active) continue;
            
            foreach ($products as $product) {
                if (WC_Multi_Sync_Database::add_sync_job($product->ID, $site->id)) {
                    $jobs_created++;
                }
            }
        }
        
        wp_send_json_success(sprintf(__('%d sync jobs created for all sites.', 'wc-multi-sync'), $jobs_created));
    }
    
    /**
     * Handle sync rule form submission
     */
    private function handle_sync_rule_form() {
        if (!wp_verify_nonce($_POST['_wpnonce'], 'wc_multi_sync_rule_form')) {
            wp_die(__('Security check failed.', 'wc-multi-sync'));
        }
        
        $categories = isset($_POST['categories']) ? array_filter($_POST['categories']) : array();
        
        $rule_data = array(
            'siteId' => intval($_POST['site_id']),
            'categories' => !empty($categories) ? $categories : null,
            'priceMin' => !empty($_POST['price_min']) ? sanitize_text_field($_POST['price_min']) : null,
            'priceMax' => !empty($_POST['price_max']) ? sanitize_text_field($_POST['price_max']) : null,
            'autoSync' => isset($_POST['auto_sync']),
            'syncProducts' => isset($_POST['sync_products']),
            'syncImages' => isset($_POST['sync_images']),
            'syncCategories' => isset($_POST['sync_categories']),
            'syncInventory' => isset($_POST['sync_inventory'])
        );
        
        $result = WC_Multi_Sync_Database::add_sync_rule($rule_data);
        if ($result) {
            echo '<div class="notice notice-success"><p>' . __('Sync rule added successfully.', 'wc-multi-sync') . '</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>' . __('Failed to add sync rule.', 'wc-multi-sync') . '</p></div>';
        }
    }
    
    /**
     * Handle sync rule deletion
     */
    private function handle_sync_rule_delete() {
        $rule_id = intval($_GET['rule_id']);
        
        if (!wp_verify_nonce($_GET['_wpnonce'], 'delete_rule_' . $rule_id)) {
            wp_die(__('Security check failed.', 'wc-multi-sync'));
        }
        
        $result = WC_Multi_Sync_Database::delete_sync_rule($rule_id);
        if ($result) {
            echo '<div class="notice notice-success"><p>' . __('Sync rule deleted successfully.', 'wc-multi-sync') . '</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>' . __('Failed to delete sync rule.', 'wc-multi-sync') . '</p></div>';
        }
    }
}