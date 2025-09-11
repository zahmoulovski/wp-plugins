jQuery(document).ready(function($) {
    'use strict';
    
    // Test Connection functionality
    $('.test-connection-btn').on('click', function(e) {
        e.preventDefault();
        
        var $btn = $(this);
        var siteId = $btn.data('site-id');
        var isFormTest = $btn.data('site-form');
        
        $btn.addClass('testing').prop('disabled', true);
        $btn.text(wcMultiSync.strings.testing_connection);
        
        var data = {
            action: 'wc_multi_sync_test_connection',
            nonce: wcMultiSync.nonce
        };
        
        if (siteId) {
            data.site_id = siteId;
        } else if (isFormTest) {
            // Get form data
            var $form = $btn.closest('form');
            data.site_url = $form.find('input[name="site_url"]').val();
            data.consumer_key = $form.find('input[name="consumer_key"]').val();
            data.consumer_secret = $form.find('input[name="consumer_secret"]').val();
        }
        
        $.ajax({
            url: wcMultiSync.ajaxurl,
            type: 'POST',
            data: data,
            success: function(response) {
                if (response.success) {
                    showMessage(wcMultiSync.strings.connection_successful, 'success');
                } else {
                    showMessage(wcMultiSync.strings.connection_failed + ' ' + response.data, 'error');
                }
            },
            error: function() {
                showMessage(wcMultiSync.strings.connection_failed, 'error');
            },
            complete: function() {
                $btn.removeClass('testing').prop('disabled', false);
                $btn.text('Test Connection');
            }
        });
    });
    
    // Manual Sync functionality
    $('.sync-site-btn').on('click', function(e) {
        e.preventDefault();
        
        var $btn = $(this);
        var siteId = $btn.data('site-id');
        
        $btn.addClass('loading').prop('disabled', true);
        
        $.ajax({
            url: wcMultiSync.ajaxurl,
            type: 'POST',
            data: {
                action: 'wc_multi_sync_manual_sync',
                nonce: wcMultiSync.nonce,
                site_id: siteId
            },
            success: function(response) {
                if (response.success) {
                    showMessage(wcMultiSync.strings.sync_started + ' ' + response.data, 'success');
                } else {
                    showMessage(wcMultiSync.strings.sync_failed + ' ' + response.data, 'error');
                }
            },
            error: function() {
                showMessage(wcMultiSync.strings.sync_failed, 'error');
            },
            complete: function() {
                $btn.removeClass('loading').prop('disabled', false);
            }
        });
    });
    
    // Bulk Sync functionality
    $('#bulk-sync-all').on('click', function(e) {
        e.preventDefault();
        
        if (!confirm('Are you sure you want to sync all products to all sites? This may take a while.')) {
            return;
        }
        
        var $btn = $(this);
        $btn.addClass('loading').prop('disabled', true);
        
        $.ajax({
            url: wcMultiSync.ajaxurl,
            type: 'POST',
            data: {
                action: 'wc_multi_sync_bulk_sync',
                nonce: wcMultiSync.nonce
            },
            success: function(response) {
                if (response.success) {
                    showMessage('Bulk sync started! ' + response.data, 'success');
                } else {
                    showMessage('Bulk sync failed: ' + response.data, 'error');
                }
            },
            error: function() {
                showMessage('Bulk sync failed', 'error');
            },
            complete: function() {
                $btn.removeClass('loading').prop('disabled', false);
            }
        });
    });
    
    // Test All Connections
    $('#test-all-connections').on('click', function(e) {
        e.preventDefault();
        
        var $btn = $(this);
        $btn.addClass('loading').prop('disabled', true);
        
        var $testButtons = $('.test-connection-btn[data-site-id]');
        var totalTests = $testButtons.length;
        var completedTests = 0;
        var successfulTests = 0;
        
        if (totalTests === 0) {
            showMessage('No sites configured to test', 'error');
            $btn.removeClass('loading').prop('disabled', false);
            return;
        }
        
        $testButtons.each(function() {
            var $testBtn = $(this);
            var siteId = $testBtn.data('site-id');
            
            $.ajax({
                url: wcMultiSync.ajaxurl,
                type: 'POST',
                data: {
                    action: 'wc_multi_sync_test_connection',
                    nonce: wcMultiSync.nonce,
                    site_id: siteId
                },
                success: function(response) {
                    if (response.success) {
                        successfulTests++;
                        $testBtn.closest('tr').find('.status-indicator')
                            .removeClass('inactive').addClass('active').text('Active');
                    } else {
                        $testBtn.closest('tr').find('.status-indicator')
                            .removeClass('active').addClass('inactive').text('Inactive');
                    }
                },
                complete: function() {
                    completedTests++;
                    if (completedTests === totalTests) {
                        $btn.removeClass('loading').prop('disabled', false);
                        showMessage(`Connection test completed: ${successfulTests}/${totalTests} sites connected successfully`, 
                                  successfulTests === totalTests ? 'success' : 'error');
                    }
                }
            });
        });
    });
    
    // Delete site confirmation
    $('.delete-site').on('click', function(e) {
        return confirm(wcMultiSync.strings.confirm_delete);
    });
    
    // Auto-refresh dashboard stats every 30 seconds
    if ($('.wc-multi-sync-dashboard').length) {
        setInterval(function() {
            refreshDashboardStats();
        }, 30000);
    }
    
    // Auto-refresh activity logs every 10 seconds
    if ($('.wc-multi-sync-recent-activity').length) {
        setInterval(function() {
            refreshActivityLogs();
        }, 10000);
    }
    
    // Show/hide advanced settings
    $('.toggle-advanced-settings').on('click', function(e) {
        e.preventDefault();
        $('.advanced-settings').slideToggle();
        $(this).text(function(i, text) {
            return text === 'Show Advanced Settings' ? 'Hide Advanced Settings' : 'Show Advanced Settings';
        });
    });
    
    // Form validation
    $('form[action=""]').on('submit', function(e) {
        var $form = $(this);
        var isValid = true;
        
        // Check required fields
        $form.find('input[required]').each(function() {
            var $input = $(this);
            if (!$input.val().trim()) {
                $input.addClass('error');
                isValid = false;
            } else {
                $input.removeClass('error');
            }
        });
        
        // Validate URL format
        var $urlInput = $form.find('input[name="site_url"]');
        if ($urlInput.length && $urlInput.val()) {
            var urlPattern = /^https?:\/\/.+/i;
            if (!urlPattern.test($urlInput.val())) {
                $urlInput.addClass('error');
                showMessage('Please enter a valid URL starting with http:// or https://', 'error');
                isValid = false;
            }
        }
        
        if (!isValid) {
            e.preventDefault();
            showMessage('Please fill in all required fields correctly', 'error');
        }
    });
    
    // Progress bar animation
    function animateProgressBar($progressBar, targetWidth) {
        $progressBar.animate({
            width: targetWidth + '%'
        }, 500);
    }
    
    // Real-time sync status updates
    function updateSyncStatus() {
        $.ajax({
            url: wcMultiSync.ajaxurl,
            type: 'POST',
            data: {
                action: 'wc_multi_sync_get_sync_status',
                nonce: wcMultiSync.nonce
            },
            success: function(response) {
                if (response.success && response.data) {
                    updateSyncDisplay(response.data);
                }
            }
        });
    }
    
    function updateSyncDisplay(data) {
        // Update pending jobs count
        $('.pending-jobs-count').text(data.pending || 0);
        
        // Update active syncs
        if (data.active_syncs && data.active_syncs.length > 0) {
            var $container = $('.active-syncs-container');
            $container.empty();
            
            data.active_syncs.forEach(function(sync) {
                var $syncItem = $('<div class="sync-item">');
                $syncItem.html(`
                    <div class="sync-info">
                        <strong>Product ID: ${sync.product_id}</strong>
                        <span>→ Site: ${sync.site_name}</span>
                    </div>
                    <div class="sync-progress">
                        <div class="sync-progress-bar" style="width: ${sync.progress}%"></div>
                    </div>
                    <div class="sync-percentage">${sync.progress}%</div>
                `);
                $container.append($syncItem);
            });
        }
    }
    
    // Update sync status every 5 seconds if on dashboard
    if ($('.wc-multi-sync-dashboard').length) {
        setInterval(updateSyncStatus, 5000);
    }
    
    // Helper functions
    function showMessage(message, type) {
        var $message = $('<div class="wc-multi-sync-message ' + type + '">' + message + '</div>');
        
        // Remove existing messages
        $('.wc-multi-sync-message').remove();
        
        // Add new message
        $('.wrap').prepend($message);
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(function() {
                $message.fadeOut(function() {
                    $(this).remove();
                });
            }, 5000);
        }
        
        // Scroll to top to show message
        $('html, body').animate({ scrollTop: 0 }, 300);
    }
    
    function refreshDashboardStats() {
        $.ajax({
            url: window.location.href,
            type: 'GET',
            success: function(html) {
                var $newStats = $(html).find('.wc-multi-sync-stats-grid');
                if ($newStats.length) {
                    $('.wc-multi-sync-stats-grid').html($newStats.html());
                }
            }
        });
    }
    
    function refreshActivityLogs() {
        $.ajax({
            url: window.location.href,
            type: 'GET',
            success: function(html) {
                var $newLogs = $(html).find('.activity-log');
                if ($newLogs.length) {
                    $('.activity-log').html($newLogs.html());
                }
            }
        });
    }
    
    // Add loading states to buttons
    $(document).on('click', '.button', function() {
        var $btn = $(this);
        if (!$btn.hasClass('no-loading')) {
            $btn.addClass('loading');
        }
    });
    
    // Remove loading states when page loads
    $(window).on('load', function() {
        $('.button').removeClass('loading');
    });
    
    // Copy webhook URL functionality
    $('.copy-webhook-url').on('click', function(e) {
        e.preventDefault();
        var $input = $(this).siblings('input');
        $input.select();
        document.execCommand('copy');
        showMessage('Webhook URL copied to clipboard', 'success');
    });
    
    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        // Ctrl/Cmd + S to save forms
        if ((e.ctrlKey || e.metaKey) && e.which === 83) {
            e.preventDefault();
            $('form input[type="submit"], form button[type="submit"]').first().click();
        }
        
        // Ctrl/Cmd + T to test connection
        if ((e.ctrlKey || e.metaKey) && e.which === 84) {
            e.preventDefault();
            $('.test-connection-btn').first().click();
        }
    });
});