<?php
/**
 * User status tracking for WP Chat Plugin
 */
class WP_Chat_User_Status {
    /**
     * DB instance
     */
    private $db;
    
    /**
     * Time threshold for online status (in seconds)
     */
    private $online_threshold = 120; // 2 minutes
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->db = new WP_Chat_DB();
    }
    
    /**
     * Register AJAX hooks
     */
    public function register_ajax_hooks() {
        add_action('wp_ajax_wp_chat_typing_status', array($this, 'update_typing_status'));
        add_action('wp_ajax_nopriv_wp_chat_typing_status', array($this, 'update_typing_status'));
        
        add_action('wp_ajax_wp_chat_heartbeat', array($this, 'heartbeat'));
        add_action('wp_ajax_nopriv_wp_chat_heartbeat', array($this, 'heartbeat'));
    }
    
    /**
     * Update user's online status when interacting with the site
     */
    public function track_user_activity() {
        // For logged-in users, update status in database
        $user_id = get_current_user_id();
        
        if ($user_id) {
            $this->update_user_status($user_id, 'online');
        }
        
        // For all users, set a cookie for client-side detection
        if (!isset($_COOKIE['wp_chat_last_activity'])) {
            $expiry = time() + DAY_IN_SECONDS;
            setcookie('wp_chat_last_activity', time(), $expiry, '/', COOKIE_DOMAIN);
        }
    }
    
    /**
     * Heartbeat to keep user status updated
     */
    public function heartbeat() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $user_id = get_current_user_id();
        
        if (!$user_id && isset($_REQUEST['visitor_id'])) {
            $user_id = intval($_REQUEST['visitor_id']) * -1; // Negative for visitors
        }
        
        if ($user_id) {
            $is_typing = isset($_REQUEST['is_typing']) ? 
                filter_var($_REQUEST['is_typing'], FILTER_VALIDATE_BOOLEAN) : 
                false;
            
            $session_id = isset($_REQUEST['session_id']) ? 
                intval($_REQUEST['session_id']) : 
                null;
                
            $this->update_user_status($user_id, 'online', $is_typing ? $session_id : null);
        }
        
        // Set activity cookie
        $expiry = time() + DAY_IN_SECONDS;
        setcookie('wp_chat_last_activity', time(), $expiry, '/', COOKIE_DOMAIN);
        
        wp_send_json_success();
    }
    
    /**
     * Update typing status
     */
    public function update_typing_status() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $session_id = isset($_REQUEST['session_id']) ? intval($_REQUEST['session_id']) : 0;
        $is_typing = isset($_REQUEST['is_typing']) ? 
            filter_var($_REQUEST['is_typing'], FILTER_VALIDATE_BOOLEAN) : 
            false;
        
        if (!$session_id) {
            wp_send_json_error(array('message' => 'Session ID is required'));
            return;
        }
        
        $user_id = get_current_user_id();
        
        if (!$user_id && isset($_REQUEST['visitor_id'])) {
            $user_id = intval($_REQUEST['visitor_id']) * -1; // Negative for visitors
        }
        
        if (!$user_id) {
            wp_send_json_error(array('message' => 'User ID is required'));
            return;
        }
        
        // Update user status
        $this->update_user_status($user_id, 'online', $is_typing ? $session_id : null);
        
        // Get typing users for this session
        $typing_users = $this->get_typing_users($session_id, $user_id);
        
        wp_send_json_success(array(
            'typing_users' => $typing_users
        ));
    }
    
    /**
     * Update user status in database
     */
    public function update_user_status($user_id, $status = 'online', $typing_in_session = null) {
        return $this->db->update_user_status($user_id, $status, $typing_in_session);
    }
    
    /**
     * Check if user is online
     */
    public function is_user_online($user_id) {
        $user_status = $this->db->get_user_status($user_id);
        
        if (!$user_status) {
            return false;
        }
        
        // Check if last activity is within threshold
        $last_activity = strtotime($user_status->last_activity);
        $now = time();
        
        return ($now - $last_activity) <= $this->online_threshold;
    }
    
    /**
     * Get all online users
     */
    public function get_online_users() {
        $statuses = $this->db->get_all_user_statuses();
        $online_users = array();
        $now = time();
        
        foreach ($statuses as $status) {
            $last_activity = strtotime($status->last_activity);
            
            if (($now - $last_activity) <= $this->online_threshold) {
                // Handle admin users
                if ($status->user_id > 0) {
                    $user = get_user_by('id', $status->user_id);
                    if ($user) {
                        $online_users[] = array(
                            'id' => $status->user_id,
                            'name' => $user->display_name,
                            'email' => $user->user_email,
                            'is_admin' => user_can($user, 'manage_options'),
                            'status' => $status->status,
                            'typing_in_session' => $status->typing_in_session
                        );
                    }
                } 
                // Handle visitors
                else {
                    // Get session for visitor
                    $session_id = $status->typing_in_session;
                    if ($session_id) {
                        $session = $this->db->get_session($session_id);
                        if ($session) {
                            $online_users[] = array(
                                'id' => $status->user_id,
                                'name' => $session->full_name,
                                'email' => $session->email,
                                'is_admin' => false,
                                'status' => $status->status,
                                'typing_in_session' => $status->typing_in_session
                            );
                        }
                    }
                }
            }
        }
        
        return $online_users;
    }
    
    /**
     * Get users typing in a specific session
     */
    public function get_typing_users($session_id, $current_user_id = 0) {
        $statuses = $this->db->get_all_user_statuses();
        $typing_users = array();
        $now = time();
        
        foreach ($statuses as $status) {
            // Skip current user
            if ($status->user_id == $current_user_id) {
                continue;
            }
            
            $last_activity = strtotime($status->last_activity);
            
            // Check if user is typing in this session and is recently active
            if ($status->typing_in_session == $session_id && 
                ($now - $last_activity) <= $this->online_threshold) {
                
                $name = 'Unknown';
                
                // Get name for admin users
                if ($status->user_id > 0) {
                    $user = get_user_by('id', $status->user_id);
                    if ($user) {
                        $name = $user->display_name;
                    }
                } 
                // Get name for visitors
                else {
                    $session = $this->db->get_session($session_id);
                    if ($session) {
                        $name = $session->full_name;
                    }
                }
                
                $typing_users[] = array(
                    'id' => $status->user_id,
                    'name' => $name
                );
            }
        }
        
        return $typing_users;
    }
    
    /**
     * Add status indicator to user display name
     */
    public function add_status_indicator($display_name, $user_id) {
        if (!$user_id) {
            return $display_name;
        }
        
        $is_online = $this->is_user_online($user_id);
        $status_class = $is_online ? 'online' : 'offline';
        
        $indicator = '<span class="wp-chat-status-indicator ' . $status_class . '" 
                          title="' . ($is_online ? 'Online' : 'Offline') . '"></span>';
        
        return $indicator . ' ' . $display_name;
    }
}