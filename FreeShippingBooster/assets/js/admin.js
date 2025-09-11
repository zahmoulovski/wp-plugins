(function($) {
    'use strict';
    
    var FSPBAdmin = {
        
        /**
         * Initialize admin functionality
         */
        init: function() {
            this.initSelect2();
            this.bindEvents();
        },
        
        /**
         * Initialize Select2 for product and category selectors
         */
        initSelect2: function() {
            // Product selectors
            $('.fspb-product-search').select2({
                ajax: {
                    url: fspb_admin.ajax_url,
                    dataType: 'json',
                    delay: 250,
                    data: function(params) {
                        return {
                            term: params.term,
                            action: 'fspb_search_products',
                            nonce: fspb_admin.nonce
                        };
                    },
                    processResults: function(data) {
                        return {
                            results: data
                        };
                    },
                    cache: true
                },
                placeholder: 'Search for products...',
                minimumInputLength: 2,
                allowClear: true
            });
            
            // Category selectors
            $('.fspb-category-search').select2({
                ajax: {
                    url: fspb_admin.ajax_url,
                    dataType: 'json',
                    delay: 250,
                    data: function(params) {
                        return {
                            term: params.term,
                            action: 'fspb_search_categories',
                            nonce: fspb_admin.nonce
                        };
                    },
                    processResults: function(data) {
                        return {
                            results: data
                        };
                    },
                    cache: true
                },
                placeholder: 'Search for categories...',
                minimumInputLength: 1,
                allowClear: true
            });
        },
        
        /**
         * Bind admin events
         */
        bindEvents: function() {
            var self = this;
            
            // Preview updates
            $('#fspb_threshold, #fspb_initial_message, #fspb_success_message').on('input', function() {
                self.updatePreview();
            });
            
            // Form validation
            $('form').on('submit', function(e) {
                if (!self.validateForm()) {
                    e.preventDefault();
                    return false;
                }
            });
        },
        
        /**
         * Update preview (if preview section exists)
         */
        updatePreview: function() {
            var threshold = parseFloat($('#fspb_threshold').val()) || 100;
            var initialMessage = $('#fspb_initial_message').val() || 'Add {remaining} more to get free shipping!';
            var successMessage = $('#fspb_success_message').val() || 'Congratulations! You qualify for free shipping!';
            
            // Update preview if it exists
            var $preview = $('.fspb-preview');
            if ($preview.length > 0) {
                var sampleAmount = 75; // Sample cart amount for preview
                var percentage = Math.min(100, (sampleAmount / threshold) * 100);
                var remaining = Math.max(0, threshold - sampleAmount);
                
                var message = percentage >= 100 ? successMessage : initialMessage.replace('{remaining}', '$' + remaining.toFixed(2));
                
                $preview.find('.fspb-message').html(message);
                $preview.find('.fspb-progress-bar').css('width', percentage + '%');
                $preview.find('.fspb-progress-text').text(Math.round(percentage) + '%');
                
                if (percentage >= 100) {
                    $preview.find('.fspb-progress-bar').addClass('qualified');
                    $preview.find('.fspb-message').addClass('qualified');
                } else {
                    $preview.find('.fspb-progress-bar').removeClass('qualified');
                    $preview.find('.fspb-message').removeClass('qualified');
                }
            }
        },
        
        /**
         * Validate form before submission
         */
        validateForm: function() {
            var isValid = true;
            var errors = [];
            
            // Validate threshold
            var threshold = parseFloat($('#fspb_threshold').val());
            if (isNaN(threshold) || threshold <= 0) {
                errors.push('Free shipping threshold must be a positive number.');
                isValid = false;
            }
            
            // Validate messages
            var initialMessage = $('#fspb_initial_message').val().trim();
            var successMessage = $('#fspb_success_message').val().trim();
            
            if (!initialMessage) {
                errors.push('Initial message cannot be empty.');
                isValid = false;
            }
            
            if (!successMessage) {
                errors.push('Success message cannot be empty.');
                isValid = false;
            }
            
            // Display errors if any
            if (!isValid) {
                alert('Please fix the following errors:\n\n' + errors.join('\n'));
            }
            
            return isValid;
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        // Initialize Select2 when ready
        if (typeof $.fn.select2 !== 'undefined') {
            FSPBAdmin.init();
        } else {
            // Wait a bit for Select2 to load
            setTimeout(function() {
                FSPBAdmin.init();
            }, 500);
        }
    });
    
})(jQuery);
