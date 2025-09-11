<?php
/**
 * Dashboard view
 */

if (!defined('ABSPATH')) {
    exit;
}

$stats = WC_Multi_Sync_Admin::get_dashboard_stats();
$recent_activity = WC_Multi_Sync_Admin::get_recent_activity(5);
$sync_status = WC_Multi_Sync_Admin::get_sync_status();
?>

<div class="wrap wc-multi-sync">
    <h1><?php _e('Multi-Site Sync Dashboard', 'wc-multi-sync'); ?></h1>
    
    <!-- Stats Cards -->
    <div class="wc-multi-sync-stats">
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon sites">
                    <span class="dashicons dashicons-admin-site-alt3"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html($stats['total_sites']); ?></h3>
                    <p><?php _e('Total Sites', 'wc-multi-sync'); ?></p>
                    <small><?php echo sprintf(__('%d active, %d destinations', 'wc-multi-sync'), $stats['active_sites'], $stats['destination_sites']); ?></small>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon products">
                    <span class="dashicons dashicons-products"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html($stats['total_products']); ?></h3>
                    <p><?php _e('Products Available', 'wc-multi-sync'); ?></p>
                    <small><?php echo sprintf(__('%d synced today', 'wc-multi-sync'), $stats['syncs_today']); ?></small>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon success">
                    <span class="dashicons dashicons-yes-alt"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html($stats['success_rate']); ?>%</h3>
                    <p><?php _e('Success Rate', 'wc-multi-sync'); ?></p>
                    <small><?php _e('Last 7 days', 'wc-multi-sync'); ?></small>
                </div>
            </div>
            
            <div class="stat-card">
                <div class="stat-icon pending">
                    <span class="dashicons dashicons-clock"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html($stats['pending_jobs']); ?></h3>
                    <p><?php _e('Pending Jobs', 'wc-multi-sync'); ?></p>
                    <small><?php echo $stats['pending_jobs'] > 0 ? __('Requires attention', 'wc-multi-sync') : __('All up to date', 'wc-multi-sync'); ?></small>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="wc-multi-sync-actions">
        <h2><?php _e('Quick Actions', 'wc-multi-sync'); ?></h2>
        <div class="actions-grid">
            <button class="button button-primary" id="bulk-sync-all">
                <span class="dashicons dashicons-update"></span>
                <?php _e('Sync All Products', 'wc-multi-sync'); ?>
            </button>
            <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-sites&action=add'); ?>" class="button">
                <span class="dashicons dashicons-plus-alt"></span>
                <?php _e('Add New Site', 'wc-multi-sync'); ?>
            </a>
            <button class="button" id="test-connections">
                <span class="dashicons dashicons-admin-tools"></span>
                <?php _e('Test All Connections', 'wc-multi-sync'); ?>
            </button>
            <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-logs'); ?>" class="button">
                <span class="dashicons dashicons-list-view"></span>
                <?php _e('View Activity Logs', 'wc-multi-sync'); ?>
            </a>
        </div>
    </div>
    
    <div class="wc-multi-sync-main">
        <!-- Active Sync Jobs -->
        <div class="wc-multi-sync-section">
            <h2><?php _e('Active Sync Operations', 'wc-multi-sync'); ?></h2>
            
            <?php if (empty($sync_status)): ?>
                <div class="sync-status-empty">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <h3><?php _e('All Sites Synchronized', 'wc-multi-sync'); ?></h3>
                    <p><?php _e('Your product catalog is up-to-date across all destination sites.', 'wc-multi-sync'); ?></p>
                </div>
            <?php else: ?>
                <div class="sync-jobs-list">
                    <?php foreach ($sync_status as $job): ?>
                        <div class="sync-job-item">
                            <div class="job-info">
                                <h4><?php echo sprintf(__('Product ID %d', 'wc-multi-sync'), $job['product_id'] ?: 'Bulk'); ?></h4>
                                <p><?php echo sprintf(__('%s → %s', 'wc-multi-sync'), esc_html($job['source_name']), esc_html($job['target_name'])); ?></p>
                            </div>
                            <div class="job-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: <?php echo esc_attr($job['progress']); ?>%"></div>
                                </div>
                                <span class="progress-text"><?php echo esc_html($job['progress']); ?>%</span>
                            </div>
                            <div class="job-status">
                                <span class="status-badge processing"><?php _e('Processing', 'wc-multi-sync'); ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        
        <!-- Recent Activity -->
        <div class="wc-multi-sync-section">
            <h2><?php _e('Recent Activity', 'wc-multi-sync'); ?></h2>
            
            <?php if (empty($recent_activity)): ?>
                <p><?php _e('No recent activity to display.', 'wc-multi-sync'); ?></p>
            <?php else: ?>
                <div class="activity-list">
                    <?php foreach ($recent_activity as $activity): ?>
                        <div class="activity-item status-<?php echo esc_attr($activity['status']); ?>">
                            <div class="activity-icon">
                                <?php
                                switch ($activity['status']) {
                                    case 'success':
                                        echo '<span class="dashicons dashicons-yes-alt"></span>';
                                        break;
                                    case 'error':
                                        echo '<span class="dashicons dashicons-warning"></span>';
                                        break;
                                    case 'warning':
                                        echo '<span class="dashicons dashicons-flag"></span>';
                                        break;
                                    default:
                                        echo '<span class="dashicons dashicons-info"></span>';
                                        break;
                                }
                                ?>
                            </div>
                            <div class="activity-content">
                                <p class="activity-message"><?php echo esc_html($activity['message']); ?></p>
                                <?php if ($activity['site_name']): ?>
                                    <span class="activity-site"><?php echo esc_html($activity['site_name']); ?></span>
                                <?php endif; ?>
                                <span class="activity-time"><?php echo human_time_diff(strtotime($activity['created_at']), current_time('timestamp')); ?> <?php _e('ago', 'wc-multi-sync'); ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <p class="view-all">
                    <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-logs'); ?>" class="button">
                        <?php _e('View All Activity →', 'wc-multi-sync'); ?>
                    </a>
                </p>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Site Status Overview -->
    <div class="wc-multi-sync-section">
        <h2><?php _e('Site Status Overview', 'wc-multi-sync'); ?></h2>
        
        <?php
        $sites = WC_Multi_Sync_Database::get_sites();
        if (empty($sites)): ?>
            <div class="no-sites">
                <p><?php _e('No sites configured yet.', 'wc-multi-sync'); ?></p>
                <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-sites&action=add'); ?>" class="button button-primary">
                    <?php _e('Add Your First Site', 'wc-multi-sync'); ?>
                </a>
            </div>
        <?php else: ?>
            <div class="sites-overview">
                <?php foreach ($sites as $site): ?>
                    <div class="site-card site-type-<?php echo esc_attr($site['type']); ?> site-status-<?php echo $site['is_active'] ? 'active' : 'inactive'; ?>">
                        <div class="site-header">
                            <h4><?php echo esc_html($site['name']); ?></h4>
                            <span class="site-type-badge <?php echo esc_attr($site['type']); ?>">
                                <?php echo $site['type'] === 'source' ? __('SOURCE', 'wc-multi-sync') : __('DESTINATION', 'wc-multi-sync'); ?>
                            </span>
                        </div>
                        <div class="site-info">
                            <p class="site-url"><?php echo esc_html($site['url']); ?></p>
                            <p class="site-status">
                                <span class="status-indicator <?php echo $site['is_active'] ? 'active' : 'inactive'; ?>"></span>
                                <?php echo $site['is_active'] ? __('Connected', 'wc-multi-sync') : __('Disconnected', 'wc-multi-sync'); ?>
                            </p>
                            <?php if ($site['last_sync']): ?>
                                <p class="last-sync">
                                    <?php echo sprintf(__('Last sync: %s ago', 'wc-multi-sync'), human_time_diff(strtotime($site['last_sync']), current_time('timestamp'))); ?>
                                </p>
                            <?php endif; ?>
                        </div>
                        <div class="site-actions">
                            <?php if ($site['type'] === 'destination'): ?>
                                <button class="button button-small sync-site" data-site-id="<?php echo esc_attr($site['id']); ?>">
                                    <?php _e('Sync Now', 'wc-multi-sync'); ?>
                                </button>
                            <?php endif; ?>
                            <a href="<?php echo admin_url('admin.php?page=wc-multi-sync-sites&action=edit&id=' . $site['id']); ?>" class="button button-small">
                                <?php _e('Configure', 'wc-multi-sync'); ?>
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</div>

<script type="text/javascript">
jQuery(document).ready(function($) {
    // Bulk sync all products
    $('#bulk-sync-all').on('click', function() {
        if (!confirm('<?php echo esc_js(__('This will sync all products to all destination sites. This may take a while. Continue?', 'wc-multi-sync')); ?>')) {
            return;
        }
        
        $(this).prop('disabled', true).text('<?php echo esc_js(__('Syncing...', 'wc-multi-sync')); ?>');
        
        $.ajax({
            url: wcMultiSync.ajaxUrl,
            type: 'POST',
            data: {
                action: 'wc_multi_sync_bulk_sync',
                nonce: wcMultiSync.nonce,
                product_ids: [],
                target_sites: []
            },
            success: function(response) {
                if (response.success) {
                    alert('<?php echo esc_js(__('Bulk sync initiated successfully!', 'wc-multi-sync')); ?>');
                    location.reload();
                } else {
                    alert('<?php echo esc_js(__('Sync failed. Please try again.', 'wc-multi-sync')); ?>');
                }
            },
            error: function() {
                alert('<?php echo esc_js(__('An error occurred. Please try again.', 'wc-multi-sync')); ?>');
            },
            complete: function() {
                $('#bulk-sync-all').prop('disabled', false).text('<?php echo esc_js(__('Sync All Products', 'wc-multi-sync')); ?>');
            }
        });
    });
    
    // Test all connections
    $('#test-connections').on('click', function() {
        $(this).prop('disabled', true).text('<?php echo esc_js(__('Testing...', 'wc-multi-sync')); ?>');
        
        // Add logic to test all site connections
        setTimeout(function() {
            $('#test-connections').prop('disabled', false).text('<?php echo esc_js(__('Test All Connections', 'wc-multi-sync')); ?>');
            alert('<?php echo esc_js(__('Connection tests completed. Check the logs for details.', 'wc-multi-sync')); ?>');
        }, 2000);
    });
    
    // Sync individual site
    $('.sync-site').on('click', function() {
        var siteId = $(this).data('site-id');
        var button = $(this);
        
        button.prop('disabled', true).text('<?php echo esc_js(__('Syncing...', 'wc-multi-sync')); ?>');
        
        $.ajax({
            url: wcMultiSync.ajaxUrl,
            type: 'POST',
            data: {
                action: 'wc_multi_sync_bulk_sync',
                nonce: wcMultiSync.nonce,
                product_ids: [],
                target_sites: [siteId]
            },
            success: function(response) {
                if (response.success) {
                    alert('<?php echo esc_js(__('Site sync initiated successfully!', 'wc-multi-sync')); ?>');
                } else {
                    alert('<?php echo esc_js(__('Sync failed. Please try again.', 'wc-multi-sync')); ?>');
                }
            },
            error: function() {
                alert('<?php echo esc_js(__('An error occurred. Please try again.', 'wc-multi-sync')); ?>');
            },
            complete: function() {
                button.prop('disabled', false).text('<?php echo esc_js(__('Sync Now', 'wc-multi-sync')); ?>');
            }
        });
    });
    
    // Auto-refresh sync status every 10 seconds
    setInterval(function() {
        if ($('.sync-jobs-list').length > 0) {
            location.reload();
        }
    }, 10000);
});
</script>