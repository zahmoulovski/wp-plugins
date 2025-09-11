<?php
/**
 * Logger class for WC Multi-Sync
 */
class WC_Multi_Sync_Logger {
    
    private static $instance = null;
    private $logger = null;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        if (class_exists('WC_Logger')) {
            $this->logger = wc_get_logger();
        }
    }
    
    /**
     * Log info message
     */
    public static function info($message, $context = array()) {
        self::log('info', $message, $context);
    }
    
    /**
     * Log error message
     */
    public static function error($message, $context = array()) {
        self::log('error', $message, $context);
    }
    
    /**
     * Log debug message
     */
    public static function debug($message, $context = array()) {
        self::log('debug', $message, $context);
    }
    
    /**
     * Log warning message
     */
    public static function warning($message, $context = array()) {
        self::log('warning', $message, $context);
    }
    
    /**
     * Generic log method
     */
    private static function log($level, $message, $context = array()) {
        $instance = self::get_instance();
        
        $formatted_message = sprintf(
            '[WC Multi-Sync] %s',
            $message
        );
        
        if (!empty($context)) {
            $formatted_message .= ' Context: ' . json_encode($context);
        }
        
        // Log to WooCommerce logger if available
        if ($instance->logger) {
            $instance->logger->log($level, $formatted_message, array('source' => 'wc-multi-sync'));
        }
        
        // Also log to WordPress debug log if WP_DEBUG_LOG is enabled
        if (defined('WP_DEBUG_LOG') && WP_DEBUG_LOG) {
            error_log($formatted_message);
        }
        
        // Store in database for admin interface
        WC_Multi_Sync_Database::add_log($level, $message, null, null, $context);
    }
}