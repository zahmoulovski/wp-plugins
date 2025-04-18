/**
 * PDF Stats Tracker - Frontend tracking script
 */
(function($) {
    'use strict';
    
    // Track PDF views and downloads
    $(document).ready(function() {
        // Track when a PDF link is clicked
        trackPdfLinks();
        
        // Observe DOM changes to track dynamically added PDF links
        observeDomChanges();
    });
    
    /**
     * Track PDF links on the page
     */
    function trackPdfLinks() {

        // Get all links on the page
        $('a').each(function() {
            var href = $(this).attr('href');
            
            // Additional check for PDFs with relative URLs
            if (href && href.toLowerCase().endsWith('.pdf')) {
                
                
                // For relative URLs, try to determine if they're in our tracked folders
                if (href.startsWith('/')) {
                    // This is a relative URL, check if it contains our folders
                    if (href.indexOf('/catalogue/') !== -1 || href.indexOf('/fichtech/') !== -1) {
                        if (!$(this).hasClass('pdf-tracked')) {
                            addTracking($(this));
                        }
                        return; // Skip the standard check below
                    }
                }
            }
            
            // Standard check
            if (isPdfLink(href)) {
                // If not already tracked, add tracking
                if (!$(this).hasClass('pdf-tracked')) {
                    addTracking($(this));
                }
            }
        });
        
    }
    
    /**
     * Observe DOM changes to track dynamically added PDF links
     */
    function observeDomChanges() {
        // Create a MutationObserver to watch for DOM changes
        if (typeof MutationObserver !== 'undefined') {
            var observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        // Check if any added nodes contain PDF links
                        $(mutation.addedNodes).find('a').each(function() {
                            var href = $(this).attr('href');
                            if (isPdfLink(href)) {
                                // If not already tracked, add tracking
                                if (!$(this).hasClass('pdf-tracked')) {
                                    addTracking($(this));
                                }
                            }
                        });
                    }
                });
            });
            
            // Start observing the body for changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }
    
    /**
     * Check if a URL is a PDF link in one of our tracked folders
     */
    function isPdfLink(url) {
        if (!url) {
            return false;
        }
        
        // First check if it's a PDF
        if (!url.toLowerCase().endsWith('.pdf')) {
            return false;
        }
        
        // Log for debugging

        // More flexible check for folder paths
        if (url.indexOf('/catalogue/') !== -1 || url.indexOf('/fichtech/') !== -1) {
            return true;
        }
        
        // Check if it's in one of our tracked folders 
        for (var i = 0; i < pdfStatsTracker.folders.length; i++) {
            if (url.indexOf(pdfStatsTracker.folders[i]) !== -1) {
                return true;
            }
        }
        
        // Not in tracked folders
        return false;
    }
    
    /**
     * Add tracking to a PDF link
     */
    function addTracking(linkElement) {
        var href = linkElement.attr('href');

        // Mark as tracked
        linkElement.addClass('pdf-tracked');
        
        // Track view on hover with debounce (only trigger once in 2 seconds)
        var viewDebounce = false;
        linkElement.on('mouseenter', function() {
            if (!viewDebounce) {
                viewDebounce = true;
                trackPdfAction(href, 'view');
                setTimeout(function() {
                    viewDebounce = false;
                }, 2000);
            }
        });
        
        // Track download on click (more reliable)
        linkElement.on('click', function(e) {
            // Don't interfere with normal link behavior
            trackPdfAction(href, 'download');
            
            // Add a small delay to ensure the tracking request completes
            // This is optional and can be removed if it causes issues
            if (e.ctrlKey || e.metaKey) {
                // User is opening in new tab, no need to delay
                return true;
            }
            

            // Allow normal link behavior
            return true;
        });
    }
    
    /**
     * Track PDF action (view or download)
     */
    function trackPdfAction(url, action) {
        // Validate URL and action before tracking
        if (!url || (action !== 'view' && action !== 'download')) {
            console.error('Invalid tracking parameters - URL:', url, 'Action:', action);
            return;
        }
        

        // Make sure we have full URL for tracking
        if (url.startsWith('/')) {
            // This is a relative URL, convert to absolute
            url = window.location.protocol + '//' + window.location.host + url;
        }
        
        // Send AJAX request to track action
        $.ajax({
            url: pdfStatsTracker.ajax_url,
            type: 'POST',
            data: {
                action: 'track_pdf_' + action,
                nonce: pdfStatsTracker.nonce,
                pdf_url: url
            },
            success: function(response) {
                // Action tracked successfully

                // Extra check for potential errors
                if (response.success === false) {
                    console.error('Server reported error:', response.data ? response.data.message : 'Unknown error');
                }
            },
            error: function(xhr, status, error) {
                // Error tracking action
                console.error('Error tracking PDF ' + action + ':', error);
                console.error('Status:', status);
                console.error('Response:', xhr.responseText);
            }
        });
    }
    
    /**
     * Track direct PDF access
     * This is called when a PDF is directly accessed in the browser
     */
    function trackPdfDirectAccess(url) {
        // Track as both a view and download since they're directly viewing the PDF
        trackPdfAction(url, 'view');
        
        // Small delay to ensure both tracking actions aren't competing
        setTimeout(function() {
            trackPdfAction(url, 'download');
        }, 500);
    }
    
    // Make function available globally for the inline script
    window.trackPdfDirectAccess = trackPdfDirectAccess;
    
})(jQuery);