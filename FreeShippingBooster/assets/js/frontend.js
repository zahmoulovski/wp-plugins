(function($) {
    'use strict';
    
    var FSPB = {
        
        /**
         * Initialize the plugin
         */
        init: function() {
            this.bindEvents();
            this.updateProgressOnLoad();
        },
        
        /**
         * Bind events
         */
        bindEvents: function() {
            var self = this;
            
            // Update progress when cart is updated
            $(document.body).on('updated_cart_totals', function() {
                self.updateProgress();
            });
            
            $(document.body).on('updated_checkout', function() {
                self.updateProgress();
            });
            
            $(document.body).on('wc_fragments_refreshed', function() {
                self.updateProgress();
            });
            
            // Update progress when quantity changes
            $(document).on('change', 'input.qty', function() {
                setTimeout(function() {
                    self.updateProgress();
                }, 500);
            });
            
            // Update progress when product is added to cart
            $(document.body).on('added_to_cart', function() {
                setTimeout(function() {
                    self.updateProgress();
                }, 1000);
            });
        },
        
        /**
         * Update progress on page load
         */
        updateProgressOnLoad: function() {
            if ($('.fspb-progress-container').length > 0) {
                this.updateProgress();
            }
        },
        
        /**
         * Update progress via AJAX
         */
        updateProgress: function() {
            var self = this;
            var $containers = $('.fspb-progress-container');
            
            if ($containers.length === 0) {
                return;
            }
            
            // Add loading state
            $containers.addClass('loading');
            
            $.ajax({
                url: fspb_frontend.ajax_url,
                type: 'POST',
                data: {
                    action: 'fspb_update_progress',
                    nonce: fspb_frontend.nonce
                },
                success: function(response) {
                    if (response.success) {
                        self.updateProgressDisplay(response.data);
                    }
                },
                error: function() {
                    console.error('Failed to update shipping progress');
                },
                complete: function() {
                    $containers.removeClass('loading');
                }
            });
        },
        
        /**
         * Update progress display
         */
        updateProgressDisplay: function(data) {
            var $containers = $('.fspb-progress-container');
            
            $containers.each(function() {
                var $container = $(this);
                var $message = $container.find('.fspb-message');
                var $progressBar = $container.find('.fspb-progress-bar');
                var $progressText = $container.find('.fspb-progress-text');
                var $remainingAmount = $container.find('.fspb-remaining-amount');
                
                // Update message
                $message.html(data.message);
                if (data.qualified) {
                    $message.addClass('qualified');
                } else {
                    $message.removeClass('qualified');
                }
                
                // Update progress bar
                $progressBar.css('width', data.percentage + '%');
                $progressBar.attr('aria-valuenow', Math.round(data.percentage));
                
                if (data.qualified) {
                    $progressBar.addClass('qualified');
                } else {
                    $progressBar.removeClass('qualified');
                }
                
                // Update progress text
                $progressText.text(Math.round(data.percentage) + '%');
                
                // Update remaining amount
                if (data.remaining > 0) {
                    var remainingFormatted = this.formatCurrency(data.remaining);
                    $remainingAmount.text('Remaining: ' + remainingFormatted).show();
                } else {
                    $remainingAmount.hide();
                }
            }.bind(this));
        },
        
        /**
         * Format currency
         */
        formatCurrency: function(amount) {
            var symbol = fspb_frontend.currency_symbol;
            var position = fspb_frontend.currency_position;
            var formatted = parseFloat(amount).toFixed(2);
            
            switch (position) {
                case 'left':
                    return symbol + formatted;
                case 'right':
                    return formatted + symbol;
                case 'left_space':
                    return symbol + ' ' + formatted;
                case 'right_space':
                    return formatted + ' ' + symbol;
                default:
                    return symbol + formatted;
            }
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        FSPB.init();
    });
    
})(jQuery);
