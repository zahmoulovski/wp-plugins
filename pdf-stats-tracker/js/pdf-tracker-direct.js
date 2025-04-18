/**
 * PDF Stats Tracker - Direct tracking script
 * This script takes a more direct approach to tracking PDF interactions
 */
(function($) {
    'use strict';
    
    // Configure tracking parameters
    var config = {
        trackedFolders: ['catalogue', 'fichtech'],
        ajaxUrl: pdfStatsTracker.ajax_url,
        nonce: pdfStatsTracker.nonce,
    };
    
    // Initialize tracking on page load
    $(document).ready(function() {
        
        
        // Directly target PDF links in our tracked folders
        initPdfTracking();
    });
    
    /**
     * Initialize PDF tracking on all links
     */
    function initPdfTracking() {
        // Find all links on the page
        $('a').each(function() {
            var $link = $(this);
            var href = $link.attr('href');
            
            // Skip if not a valid link
            if (!href) return;
            
            // Check if it's a PDF
            if (isPdfFile(href)) {
                if (config.debug) {
                    
                }
                
                // Check if it's in a tracked folder
                if (isInTrackedFolder(href)) {
                    if (config.debug) {
                        
                    }
                    
                    // Only add tracking if not already tracked
                    if (!$link.hasClass('pdf-tracked')) {
                        attachTracking($link);
                    }
                }
            }
        });
    }
    
    /**
     * Check if a URL points to a PDF file
     */
    function isPdfFile(url) {
        return url.toLowerCase().endsWith('.pdf');
    }
    
    /**
     * Check if a URL is in one of our tracked folders
     */
    function isInTrackedFolder(url) {
        // Try both direct folder names and full URLs
        for (var i = 0; i < config.trackedFolders.length; i++) {
            var folder = config.trackedFolders[i];
            
            // Check for folder name in URL path
            if (url.indexOf('/' + folder + '/') !== -1) {
                if (config.debug) {
                }
                return true;
            }
        }
        
        // Also check direct folder references from plugin config
        if (pdfStatsTracker.folders) {
            for (var j = 0; j < pdfStatsTracker.folders.length; j++) {
                if (url.indexOf(pdfStatsTracker.folders[j]) !== -1) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Attach tracking events to a PDF link
     */
    function attachTracking($link) {
        var url = $link.attr('href');
        
        // Mark as tracked to avoid duplicate tracking
        $link.addClass('pdf-tracked');
        
        // Store current time to debounce view events
        var lastViewTime = 0;
        
        // Track view when user hovers over the link
        $link.on('mouseenter', function() {
            var now = new Date().getTime();
            
            // Only track view once every 5 seconds per link
            if (now - lastViewTime > 5000) {
                lastViewTime = now;
                sendTrackingEvent(url, 'view');
            }
        });
        
        // Track download when user clicks the link
        $link.on('click', function() {
            // Force recording of download event
            sendTrackingEvent(url, 'download');
            
            // Don't interrupt normal link behavior
            return true;
        });
    }
    
    /**
     * Send tracking event to the server
     */
    function sendTrackingEvent(url, eventType) {
        
        
        // Ensure URL is absolute
        if (url.startsWith('/')) {
            url = window.location.origin + url;
        }
        
        // Use direct AJAX call with vanilla JS for more reliability
        var xhr = new XMLHttpRequest();
        xhr.open('POST', config.ajaxUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (config.debug) {
                        
                        try {
                            var response = JSON.parse(xhr.responseText);
                            console.log('Server response:', response);
                        } catch (e) {
                            console.log('Raw response:', xhr.responseText);
                        }
                    }
                } else {
                    console.error('Tracking failed (' + eventType + '):', url);
                    console.error('Status:', xhr.status);
                    console.error('Response:', xhr.responseText);
                }
            }
        };
        
        var data = 
            'action=track_pdf_' + eventType + 
            '&nonce=' + encodeURIComponent(config.nonce) + 
            '&pdf_url=' + encodeURIComponent(url);
        
        xhr.send(data);
    }
    
    // Also handle direct PDF access
    if (window.location.pathname.toLowerCase().endsWith('.pdf')) {
        var pdfUrl = window.location.href;
        
        if (isInTrackedFolder(pdfUrl)) {
            
            // Track both view and download for direct access
            sendTrackingEvent(pdfUrl, 'view');
            setTimeout(function() {
                sendTrackingEvent(pdfUrl, 'download');
            }, 1000);
        }
    }
    
})(jQuery);