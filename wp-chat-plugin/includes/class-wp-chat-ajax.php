<?php
/**
 * AJAX handlers for WP Chat Plugin
 */
class WP_Chat_Ajax {
    /**
     * DB instance
     */
    private $db;
    
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
        // Chat functionality
        add_action('wp_ajax_wp_chat_start_session', array($this, 'start_session'));
        add_action('wp_ajax_nopriv_wp_chat_start_session', array($this, 'start_session'));
        
        add_action('wp_ajax_wp_chat_send_message', array($this, 'send_message'));
        add_action('wp_ajax_nopriv_wp_chat_send_message', array($this, 'send_message'));
        
        add_action('wp_ajax_wp_chat_get_messages', array($this, 'get_messages'));
        add_action('wp_ajax_nopriv_wp_chat_get_messages', array($this, 'get_messages'));
        
        add_action('wp_ajax_wp_chat_get_session', array($this, 'get_session'));
        add_action('wp_ajax_nopriv_wp_chat_get_session', array($this, 'get_session'));
        
        add_action('wp_ajax_wp_chat_upload_file', array($this, 'upload_file'));
        add_action('wp_ajax_nopriv_wp_chat_upload_file', array($this, 'upload_file'));
        
        // Admin functionality
        add_action('wp_ajax_wp_chat_get_all_sessions', array($this, 'get_all_sessions'));
        add_action('wp_ajax_wp_chat_update_session_status', array($this, 'update_session_status'));
        add_action('wp_ajax_wp_chat_assign_session', array($this, 'assign_session'));
        add_action('wp_ajax_wp_chat_search_products', array($this, 'search_products'));
        add_action('wp_ajax_wp_chat_send_product_link', array($this, 'send_product_link'));
        
        // User status
        add_action('wp_ajax_wp_chat_get_user_status', array($this, 'get_user_status'));
        add_action('wp_ajax_wp_chat_get_typing_users', array($this, 'get_typing_users'));
        add_action('wp_ajax_nopriv_wp_chat_get_typing_users', array($this, 'get_typing_users'));
    }
    
    /**
     * Start a new chat session
     */
    public function start_session() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $email = isset($_POST['email']) ? sanitize_email($_POST['email']) : '';
        $full_name = isset($_POST['full_name']) ? sanitize_text_field($_POST['full_name']) : '';
        $phone_number = isset($_POST['phone_number']) ? sanitize_text_field($_POST['phone_number']) : '';
        
        if (empty($email) || empty($full_name)) {
            wp_send_json_error(array('message' => 'Email and name are required'));
            return;
        }
        
        // Check if user is logged in
        $user_id = get_current_user_id();
        
        // For non-logged in users, check if email matches a WordPress user
        if (!$user_id) {
            $user = get_user_by('email', $email);
            if ($user) {
                $user_id = $user->ID;
            }
        }
        
        // Create session
        $session_id = $this->db->create_session($email, $full_name, $phone_number, $user_id);
        
        if (!$session_id) {
            wp_send_json_error(array('message' => 'Failed to create chat session'));
            return;
        }
        
        // Add system message
        $welcome_message = get_option('wp_chat_welcome_message', 'Hello! How can we help you today?');
        $this->db->add_message($session_id, 'system', $welcome_message);
        
        // Create visitor ID for non-logged in users
        $visitor_id = null;
        if (!$user_id) {
            $visitor_id = wp_rand(100000, 999999);
            setcookie('wp_chat_visitor_id', $visitor_id, time() + MONTH_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN);
        }
        
        wp_send_json_success(array(
            'session_id' => $session_id,
            'user_id' => $user_id,
            'visitor_id' => $visitor_id,
            'welcome_message' => $welcome_message
        ));
    }
    
    /**
     * Send a message
     */
    public function send_message() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $session_id = isset($_POST['session_id']) ? intval($_POST['session_id']) : 0;
        $message = isset($_POST['message']) ? sanitize_textarea_field($_POST['message']) : '';
        $sender_type = isset($_POST['sender_type']) ? sanitize_text_field($_POST['sender_type']) : 'user';
        
        if (!$session_id || empty($message)) {
            wp_send_json_error(array('message' => 'Session ID and message are required'));
            return;
        }
        
        // Get session
        $session = $this->db->get_session($session_id);
        if (!$session) {
            wp_send_json_error(array('message' => 'Chat session not found'));
            return;
        }
        
        // Determine sender ID
        $sender_id = null;
        if ($sender_type === 'admin') {
            $sender_id = get_current_user_id();
            if (!$sender_id || !current_user_can('manage_options')) {
                wp_send_json_error(array('message' => 'Permission denied'));
                return;
            }
        } else {
            // For regular users
            $sender_id = get_current_user_id();
            if (!$sender_id && isset($_POST['visitor_id'])) {
                $sender_id = intval($_POST['visitor_id']);
            }
        }
        
        // Add message
        $message_id = $this->db->add_message($session_id, $sender_type, $message, $sender_id);
        
        if (!$message_id) {
            wp_send_json_error(array('message' => 'Failed to send message'));
            return;
        }
        
        // Update user status (not typing anymore)
        if ($sender_id && $sender_type === 'user') {
            $user_status = new WP_Chat_User_Status();
            $user_status_id = $sender_id > 0 ? $sender_id : abs($sender_id) * -1;
            $this->db->update_user_status($user_status_id, 'online', null);
        }
        
        wp_send_json_success(array(
            'message_id' => $message_id,
            'timestamp' => current_time('mysql')
        ));
    }
    
    /**
     * Get messages for a session
     */
    public function get_messages() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $session_id = isset($_REQUEST['session_id']) ? intval($_REQUEST['session_id']) : 0;
        
        if (!$session_id) {
            wp_send_json_error(array('message' => 'Session ID is required'));
            return;
        }
        
        // Get session
        $session = $this->db->get_session($session_id);
        if (!$session) {
            wp_send_json_error(array('message' => 'Chat session not found'));
            return;
        }
        
        // Verify permissions
        $user_id = get_current_user_id();
        $is_admin = current_user_can('manage_options');
        
        if (!$is_admin && $user_id !== $session->user_id) {
            // Check if visitor ID cookie matches
            $visitor_id = isset($_COOKIE['wp_chat_visitor_id']) ? intval($_COOKIE['wp_chat_visitor_id']) : 0;
            if (!$visitor_id) {
                wp_send_json_error(array('message' => 'Permission denied'));
                return;
            }
        }
        
        // Get messages
        $messages = $this->db->get_session_messages($session_id);
        
        // Format messages
        $formatted_messages = array();
        foreach ($messages as $message) {
            $sender_name = '';
            
            if ($message->sender_type === 'admin') {
                // Check if we should use company name instead of agent name for front-end users
                $use_company_name = get_option('wp_chat_use_company_name', '1') === '1';
                $company_name = get_option('wp_chat_company_name', 'KLARRION');
                
                // For admin users, always show the real agent name or custom agent name
                if ($message->sender_id && current_user_can('manage_options')) {
                    // Get custom agent display name if set
                    $agent_name_option = 'wp_chat_agent_name_' . $message->sender_id;
                    $agent_name = get_option($agent_name_option, '');
                    
                    if (!empty($agent_name)) {
                        $sender_name = $agent_name;
                    } else {
                        $user = get_user_by('id', $message->sender_id);
                        if ($user) {
                            $sender_name = $user->display_name;
                        } else {
                            $sender_name = 'Support Agent';
                        }
                    }
                } 
                // For regular users, use company name if enabled
                else {
                    if ($use_company_name) {
                        $sender_name = $company_name;
                    } else {
                        // If not using company name, use real agent name or default
                        if ($message->sender_id) {
                            $user = get_user_by('id', $message->sender_id);
                            if ($user) {
                                $sender_name = $user->display_name;
                            } else {
                                $sender_name = 'Support Agent';
                            }
                        } else {
                            $sender_name = 'Support Agent';
                        }
                    }
                }
            } elseif ($message->sender_type === 'user') {
                $sender_name = $session->full_name;
            } else {
                $sender_name = 'System';
            }
            
            $formatted_message = array(
                'id' => $message->id,
                'session_id' => $message->session_id,
                'sender_type' => $message->sender_type,
                'sender_name' => $sender_name,
                'message' => $message->message,
                'timestamp' => $message->timestamp,
                'is_file' => !empty($message->file_path)
            );
            
            // Add file info if present
            if (!empty($message->file_path)) {
                $formatted_message['file'] = array(
                    'path' => $message->file_path,
                    'name' => $message->file_name,
                    'type' => $message->file_type,
                    'size' => $message->file_size
                );
            }
            
            $formatted_messages[] = $formatted_message;
        }
        
        // Get typing users
        $user_status = new WP_Chat_User_Status();
        $typing_users = $user_status->get_typing_users($session_id, $user_id);
        
        wp_send_json_success(array(
            'messages' => $formatted_messages,
            'session' => $session,
            'typing_users' => $typing_users
        ));
    }
    
    /**
     * Get a chat session
     */
    public function get_session() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $session_id = isset($_REQUEST['session_id']) ? intval($_REQUEST['session_id']) : 0;
        
        if (!$session_id) {
            wp_send_json_error(array('message' => 'Session ID is required'));
            return;
        }
        
        // Get session
        $session = $this->db->get_session($session_id);
        if (!$session) {
            wp_send_json_error(array('message' => 'Chat session not found'));
            return;
        }
        
        // Verify permissions
        $user_id = get_current_user_id();
        $is_admin = current_user_can('manage_options');
        
        if (!$is_admin && $user_id !== $session->user_id) {
            // Check if visitor ID cookie matches
            $visitor_id = isset($_COOKIE['wp_chat_visitor_id']) ? intval($_COOKIE['wp_chat_visitor_id']) : 0;
            if (!$visitor_id) {
                wp_send_json_error(array('message' => 'Permission denied'));
                return;
            }
        }
        
        // Get assigned admin username if available
        $assigned_admin_name = '';
        if ($session->assigned_to) {
            $admin = get_user_by('id', $session->assigned_to);
            if ($admin) {
                $assigned_admin_name = $admin->display_name;
            }
        }
        
        $session_data = (array) $session;
        $session_data['assigned_admin_name'] = $assigned_admin_name;
        
        wp_send_json_success(array(
            'session' => $session_data
        ));
    }
    
    /**
     * Upload a file
     */
    public function upload_file() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $session_id = isset($_POST['session_id']) ? intval($_POST['session_id']) : 0;
        $sender_type = isset($_POST['sender_type']) ? sanitize_text_field($_POST['sender_type']) : 'user';
        
        if (!$session_id) {
            wp_send_json_error(array('message' => 'Session ID is required'));
            return;
        }
        
        // Get session
        $session = $this->db->get_session($session_id);
        if (!$session) {
            wp_send_json_error(array('message' => 'Chat session not found'));
            return;
        }
        
        // Verify permissions
        $user_id = get_current_user_id();
        $is_admin = current_user_can('manage_options');
        
        if ($sender_type === 'admin' && (!$user_id || !$is_admin)) {
            wp_send_json_error(array('message' => 'Permission denied'));
            return;
        } elseif ($sender_type === 'user' && $user_id !== $session->user_id) {
            // Check if visitor ID cookie matches
            $visitor_id = isset($_COOKIE['wp_chat_visitor_id']) ? intval($_COOKIE['wp_chat_visitor_id']) : 0;
            if (!$visitor_id) {
                wp_send_json_error(array('message' => 'Permission denied'));
                return;
            }
        }
        
        // Check if file was uploaded
        if (empty($_FILES['file'])) {
            wp_send_json_error(array('message' => 'No file was uploaded'));
            return;
        }
        
        $file = $_FILES['file'];
        
        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error(array('message' => 'Upload failed with error code: ' . $file['error']));
            return;
        }
        
        // Validate file type
        $allowed_types = array(
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png'
        );
        
        $file_ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $file_ext = strtolower($file_ext);
        
        if (!array_key_exists($file_ext, $allowed_types)) {
            wp_send_json_error(array('message' => 'File type not allowed. Allowed types: pdf, doc, docx, ppt, pptx, xls, xlsx, jpg, png'));
            return;
        }
        
        // Check file size
        $max_size = 20 * 1024 * 1024; // 20MB
        if ($file['size'] > $max_size) {
            wp_send_json_error(array('message' => 'File is too large. Maximum size is 20MB'));
            return;
        }
        
        // Create uploads directory if it doesn't exist
        $uploads_dir = WP_CHAT_PLUGIN_DIR . 'uploads';
        if (!file_exists($uploads_dir)) {
            mkdir($uploads_dir, 0755, true);
        }
        
        // Generate unique filename
        $timestamp = time();
        $unique_filename = $timestamp . '_' . sanitize_file_name($file['name']);
        $upload_path = $uploads_dir . '/' . $unique_filename;
        
        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            wp_send_json_error(array('message' => 'Failed to save uploaded file'));
            return;
        }
        
        // Create file URL
        $file_url = WP_CHAT_PLUGIN_URL . 'uploads/' . $unique_filename;
        
        // Determine sender ID
        $sender_id = null;
        if ($sender_type === 'admin') {
            $sender_id = $user_id;
        } else {
            // For regular users
            $sender_id = $user_id ?: (isset($_POST['visitor_id']) ? intval($_POST['visitor_id']) : null);
        }
        
        // Add message with file information
        $file_info = array(
            'path' => $file_url,
            'name' => $file['name'],
            'type' => $file['type'],
            'size' => $file['size']
        );
        
        $message = "Shared a file: " . $file['name'];
        $message_id = $this->db->add_message($session_id, $sender_type, $message, $sender_id, $file_info);
        
        if (!$message_id) {
            wp_send_json_error(array('message' => 'Failed to save file message'));
            return;
        }
        
        wp_send_json_success(array(
            'message_id' => $message_id,
            'file' => $file_info,
            'timestamp' => current_time('mysql')
        ));
    }
    
    /**
     * Get all chat sessions (admin only)
     */
    public function get_all_sessions() {
        check_ajax_referer('wp_chat_security', 'security');
        
        // Verify admin permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied'));
            return;
        }
        
        $status = isset($_REQUEST['status']) ? sanitize_text_field($_REQUEST['status']) : '';
        $search = isset($_REQUEST['search']) ? sanitize_text_field($_REQUEST['search']) : '';
        $orderby = isset($_REQUEST['orderby']) ? sanitize_text_field($_REQUEST['orderby']) : 'updated_at';
        $order = isset($_REQUEST['order']) ? sanitize_text_field($_REQUEST['order']) : 'DESC';
        $limit = isset($_REQUEST['limit']) ? intval($_REQUEST['limit']) : 50;
        $offset = isset($_REQUEST['offset']) ? intval($_REQUEST['offset']) : 0;
        
        $args = array(
            'status' => $status,
            'search' => $search,
            'orderby' => $orderby,
            'order' => $order,
            'limit' => $limit,
            'offset' => $offset
        );
        
        $sessions = $this->db->get_all_sessions($args);
        
        // Format sessions with additional info
        $formatted_sessions = array();
        $user_status = new WP_Chat_User_Status();
        
        foreach ($sessions as $session) {
            $assigned_admin_name = '';
            if ($session->assigned_to) {
                $admin = get_user_by('id', $session->assigned_to);
                if ($admin) {
                    $assigned_admin_name = $admin->display_name;
                }
            }
            
            $is_online = false;
            if ($session->user_id) {
                $is_online = $user_status->is_user_online($session->user_id);
            }
            
            $formatted_session = (array) $session;
            $formatted_session['assigned_admin_name'] = $assigned_admin_name;
            $formatted_session['is_online'] = $is_online;
            
            $formatted_sessions[] = $formatted_session;
        }
        
        wp_send_json_success(array(
            'sessions' => $formatted_sessions
        ));
    }
    
    /**
     * Update session status (admin only)
     */
    public function update_session_status() {
        check_ajax_referer('wp_chat_security', 'security');
        
        // Verify admin permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied'));
            return;
        }
        
        $session_id = isset($_POST['session_id']) ? intval($_POST['session_id']) : 0;
        $status = isset($_POST['status']) ? sanitize_text_field($_POST['status']) : '';
        
        if (!$session_id || !in_array($status, array('pending', 'active', 'solved', 'closed'))) {
            wp_send_json_error(array('message' => 'Invalid session ID or status'));
            return;
        }
        
        $result = $this->db->update_session_status($session_id, $status);
        
        if (!$result) {
            wp_send_json_error(array('message' => 'Failed to update session status'));
            return;
        }
        
        // Add system message about status change
        $user = wp_get_current_user();
        $admin_name = $user->display_name;
        $message = sprintf('Session status changed to "%s" by %s', ucfirst($status), $admin_name);
        $this->db->add_message($session_id, 'system', $message);
        
        wp_send_json_success(array(
            'status' => $status
        ));
    }
    
    /**
     * Assign session to admin (admin only)
     */
    public function assign_session() {
        check_ajax_referer('wp_chat_security', 'security');
        
        // Verify admin permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied'));
            return;
        }
        
        $session_id = isset($_POST['session_id']) ? intval($_POST['session_id']) : 0;
        $admin_id = isset($_POST['admin_id']) ? intval($_POST['admin_id']) : 0;
        
        if (!$session_id || !$admin_id) {
            wp_send_json_error(array('message' => 'Session ID and admin ID are required'));
            return;
        }
        
        // Verify admin exists
        $admin = get_user_by('id', $admin_id);
        if (!$admin || !user_can($admin_id, 'manage_options')) {
            wp_send_json_error(array('message' => 'Invalid admin user'));
            return;
        }
        
        $result = $this->db->assign_session($session_id, $admin_id);
        
        if (!$result) {
            wp_send_json_error(array('message' => 'Failed to assign session'));
            return;
        }
        
        // Add system message about assignment
        $message = sprintf('Session assigned to %s', $admin->display_name);
        $this->db->add_message($session_id, 'system', $message);
        
        wp_send_json_success(array(
            'admin_id' => $admin_id,
            'admin_name' => $admin->display_name
        ));
    }
    
    /**
     * Get user status
     */
    public function get_user_status() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $user_id = isset($_REQUEST['user_id']) ? intval($_REQUEST['user_id']) : 0;
        
        if (!$user_id) {
            wp_send_json_error(array('message' => 'User ID is required'));
            return;
        }
        
        $user_status = new WP_Chat_User_Status();
        $is_online = $user_status->is_user_online($user_id);
        
        wp_send_json_success(array(
            'is_online' => $is_online
        ));
    }
    
    /**
     * Get typing users for a session
     */
    public function get_typing_users() {
        check_ajax_referer('wp_chat_security', 'security');
        
        $session_id = isset($_REQUEST['session_id']) ? intval($_REQUEST['session_id']) : 0;
        
        if (!$session_id) {
            wp_send_json_error(array('message' => 'Session ID is required'));
            return;
        }
        
        $user_id = get_current_user_id();
        if (!$user_id && isset($_REQUEST['visitor_id'])) {
            $user_id = intval($_REQUEST['visitor_id']) * -1; // Negative for visitors
        }
        
        $user_status = new WP_Chat_User_Status();
        $typing_users = $user_status->get_typing_users($session_id, $user_id);
        
        wp_send_json_success(array(
            'typing_users' => $typing_users
        ));
    }
    
    /**
     * Search products (admin only)
     */
    public function search_products() {
        check_ajax_referer('wp_chat_security', 'security');
        
        // Verify admin permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied'));
            return;
        }
        
        $search_term = isset($_REQUEST['search']) ? sanitize_text_field($_REQUEST['search']) : '';
        
        if (empty($search_term)) {
            wp_send_json_error(array('message' => 'Search term is required'));
            return;
        }
        
        // Search for products by title, SKU, or content
        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => 20,
            's' => $search_term,
            'meta_query' => array(
                'relation' => 'OR',
                array(
                    'key' => '_sku',
                    'value' => $search_term,
                    'compare' => 'LIKE'
                )
            )
        );
        
        $products_query = new WP_Query($args);
        $products = array();
        
        if ($products_query->have_posts()) {
            while ($products_query->have_posts()) {
                $products_query->the_post();
                $product_id = get_the_ID();
                
                // Check if WooCommerce is active
                if (function_exists('wc_get_product')) {
                    $product = wc_get_product($product_id);
                    
                    if ($product) {
                        $products[] = array(
                            'id' => $product_id,
                            'title' => get_the_title(),
                            'url' => get_permalink(),
                            'image' => get_the_post_thumbnail_url($product_id, 'thumbnail') ?: '',
                            'price' => $product->get_price_html(),
                            'sku' => $product->get_sku(),
                            'description' => wp_trim_words($product->get_short_description(), 15)
                        );
                    }
                } else {
                    // Fallback for non-WooCommerce sites
                    $products[] = array(
                        'id' => $product_id,
                        'title' => get_the_title(),
                        'url' => get_permalink(),
                        'image' => get_the_post_thumbnail_url($product_id, 'thumbnail') ?: '',
                        'description' => wp_trim_words(get_the_excerpt(), 15)
                    );
                }
            }
            wp_reset_postdata();
        }
        
        wp_send_json_success(array(
            'products' => $products
        ));
    }
    
    /**
     * Send product link as a message (admin only)
     */
    public function send_product_link() {
        check_ajax_referer('wp_chat_security', 'security');
        
        // Verify admin permissions
        $user_id = get_current_user_id();
        if (!$user_id || !current_user_can('manage_options')) {
            wp_send_json_error(array('message' => 'Permission denied'));
            return;
        }
        
        $session_id = isset($_POST['session_id']) ? intval($_POST['session_id']) : 0;
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        $product_url = isset($_POST['product_url']) ? esc_url_raw($_POST['product_url']) : '';
        $product_title = isset($_POST['product_title']) ? sanitize_text_field($_POST['product_title']) : '';
        
        if (!$session_id || (!$product_id && empty($product_url))) {
            wp_send_json_error(array('message' => 'Session ID and product information are required'));
            return;
        }
        
        // Get session
        $session = $this->db->get_session($session_id);
        if (!$session) {
            wp_send_json_error(array('message' => 'Chat session not found'));
            return;
        }
        
        // Prepare message
        if ($product_id) {
            $product_url = get_permalink($product_id);
            $product_title = get_the_title($product_id);
        }
        
        if (empty($product_title)) {
            $product_title = 'Product';
        }
        
        $message = "Here's a product you might be interested in: <a href=\"{$product_url}\" target=\"_blank\">{$product_title}</a>";
        
        // Add message
        $message_id = $this->db->add_message($session_id, 'admin', $message, $user_id);
        
        if (!$message_id) {
            wp_send_json_error(array('message' => 'Failed to send product link'));
            return;
        }
        
        wp_send_json_success(array(
            'message_id' => $message_id,
            'timestamp' => current_time('mysql')
        ));
    }
}