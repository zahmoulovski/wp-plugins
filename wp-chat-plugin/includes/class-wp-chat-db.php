<?php
/**
 * Database operations for WP Chat Plugin
 */
class WP_Chat_DB {
    /**
     * Table names
     */
    private $users_table;
    private $sessions_table;
    private $messages_table;
    private $status_table;
    private $working_hours_table;
    
    /**
     * Constructor
     */
    public function __construct() {
        global $wpdb;
        
        $this->users_table = $wpdb->prefix . 'wp_chat_users';
        $this->sessions_table = $wpdb->prefix . 'wp_chat_sessions';
        $this->messages_table = $wpdb->prefix . 'wp_chat_messages';
        $this->status_table = $wpdb->prefix . 'wp_chat_user_status';
        $this->working_hours_table = $wpdb->prefix . 'wp_chat_working_hours';
    }
    
    /**
     * Create database tables
     */
    public function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Users table
        $sql = "CREATE TABLE $this->users_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            email varchar(100) NOT NULL,
            full_name varchar(100) NOT NULL,
            phone_number varchar(20),
            wp_user_id bigint(20),
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY email (email)
        ) $charset_collate;";
        
        // Sessions table
        $sql .= "CREATE TABLE $this->sessions_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'pending',
            started_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            assigned_to bigint(20),
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY status (status),
            KEY assigned_to (assigned_to)
        ) $charset_collate;";
        
        // Messages table
        $sql .= "CREATE TABLE $this->messages_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            session_id bigint(20) NOT NULL,
            sender_type varchar(20) NOT NULL,
            sender_id bigint(20),
            message text NOT NULL,
            file_path varchar(255),
            file_name varchar(255),
            file_type varchar(100),
            file_size bigint(20),
            timestamp datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY session_id (session_id)
        ) $charset_collate;";
        
        // User status table
        $sql .= "CREATE TABLE $this->status_table (
            user_id bigint(20) NOT NULL,
            status varchar(20) NOT NULL DEFAULT 'offline',
            typing_in_session bigint(20),
            last_activity datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id),
            KEY status (status),
            KEY typing_in_session (typing_in_session)
        ) $charset_collate;";
        
        // Working hours table
        $sql .= "CREATE TABLE $this->working_hours_table (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            day_of_week tinyint(1) NOT NULL,
            start_time time,
            end_time time,
            is_closed tinyint(1) NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            UNIQUE KEY day_of_week (day_of_week)
        ) $charset_collate;";
        
        // Execute SQL
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Create default working hours if none exist
        $this->create_default_working_hours();
    }
    
    /**
     * Create default working hours
     */
    private function create_default_working_hours() {
        global $wpdb;
        
        // Check if working hours exist
        $count = $wpdb->get_var("SELECT COUNT(*) FROM $this->working_hours_table");
        
        if ($count > 0) {
            return;
        }
        
        // Default working hours (Monday to Friday, 9 AM to 5 PM)
        $default_hours = array(
            array('day_of_week' => 0, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_closed' => 0), // Monday
            array('day_of_week' => 1, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_closed' => 0), // Tuesday
            array('day_of_week' => 2, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_closed' => 0), // Wednesday
            array('day_of_week' => 3, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_closed' => 0), // Thursday
            array('day_of_week' => 4, 'start_time' => '09:00:00', 'end_time' => '17:00:00', 'is_closed' => 0), // Friday
            array('day_of_week' => 5, 'start_time' => '10:00:00', 'end_time' => '14:00:00', 'is_closed' => 0), // Saturday
            array('day_of_week' => 6, 'start_time' => null, 'end_time' => null, 'is_closed' => 1)  // Sunday
        );
        
        foreach ($default_hours as $hours) {
            $wpdb->insert($this->working_hours_table, $hours);
        }
    }
    
    /**
     * Create a new user or get existing user
     */
    public function get_or_create_user($email, $full_name, $phone_number = '', $wp_user_id = null) {
        global $wpdb;
    
        // Check if user exists
        $user = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $this->users_table WHERE email = %s",
            $email
        ));
    
        if ($user) {
            return $user->id;
        }
    
        // Insert new user
        $result = $wpdb->insert(
            $this->users_table,
            array(
                'email' => $email,
                'full_name' => $full_name,
                'phone_number' => $phone_number,
                'wp_user_id' => $wp_user_id
            )
        );
    
        // Log errors
        if ($result === false) {
            error_log("WP Chat Plugin: User creation failed. Error: " . $wpdb->last_error);
            return false;
        }
    
        return $wpdb->insert_id;
    }
    
    /**
     * Create a new chat session
     */
    public function create_session($email, $full_name, $phone_number = '', $wp_user_id = null) {
        global $wpdb;
        
        // Get or create user
        $user_id = $this->get_or_create_user($email, $full_name, $phone_number, $wp_user_id);
        
        if (!$user_id) {
            return false;
        }
        
        // Create session
        $wpdb->insert(
            $this->sessions_table,
            array(
                'user_id' => $user_id,
                'status' => 'pending'
            )
        );
        
        return $wpdb->insert_id;
    }
    
    /**
     * Get a chat session by ID
     */
    public function get_session($session_id) {
        global $wpdb;
        
        // Get session
        $session = $wpdb->get_row($wpdb->prepare(
            "SELECT s.*, u.email, u.full_name, u.phone_number, u.wp_user_id 
             FROM $this->sessions_table s
             JOIN $this->users_table u ON s.user_id = u.id
             WHERE s.id = %d",
            $session_id
        ));
        
        return $session;
    }
    
    /**
     * Get all chat sessions with filters
     */
    public function get_all_sessions($args = array()) {
        global $wpdb;
        
        $defaults = array(
            'status' => '',
            'search' => '',
            'orderby' => 'updated_at',
            'order' => 'DESC',
            'limit' => 50,
            'offset' => 0
        );
        
        $args = wp_parse_args($args, $defaults);
        
        // Build query
        $query = "SELECT s.*, u.email, u.full_name, u.phone_number, u.wp_user_id 
                 FROM $this->sessions_table s
                 JOIN $this->users_table u ON s.user_id = u.id";
        
        $where = array();
        $values = array();
        
        // Status filter
        if (!empty($args['status'])) {
            $where[] = "s.status = %s";
            $values[] = $args['status'];
        }
        
        // Search filter
        if (!empty($args['search'])) {
            $where[] = "(u.full_name LIKE %s OR u.email LIKE %s)";
            $search_term = '%' . $wpdb->esc_like($args['search']) . '%';
            $values[] = $search_term;
            $values[] = $search_term;
        }
        
        // Add WHERE clause if needed
        if (!empty($where)) {
            $query .= " WHERE " . implode(" AND ", $where);
        }
        
        // Order
        $valid_orders = array('ASC', 'DESC');
        $order = in_array(strtoupper($args['order']), $valid_orders) ? strtoupper($args['order']) : 'DESC';
        
        $valid_orderby = array('updated_at', 'started_at', 'status');
        $orderby = in_array($args['orderby'], $valid_orderby) ? $args['orderby'] : 'updated_at';
        
        $query .= " ORDER BY s.$orderby $order";
        
        // Limit
        $limit = absint($args['limit']);
        $offset = absint($args['offset']);
        
        $query .= " LIMIT $limit OFFSET $offset";
        
        // Prepare query if we have values
        if (!empty($values)) {
            $query = $wpdb->prepare($query, $values);
        }
        
        // Execute query
        $sessions = $wpdb->get_results($query);
        
        return $sessions;
    }
    
    /**
     * Get chat sessions for a user
     */
    public function get_user_sessions($user_id) {
        global $wpdb;
        
        // Get sessions
        $sessions = $wpdb->get_results($wpdb->prepare(
            "SELECT s.*, u.email, u.full_name, u.phone_number, u.wp_user_id 
             FROM $this->sessions_table s
             JOIN $this->users_table u ON s.user_id = u.id
             WHERE s.user_id = %d
             ORDER BY s.updated_at DESC",
            $user_id
        ));
        
        return $sessions;
    }
    
    /**
     * Update chat session status
     */
    public function update_session_status($session_id, $status) {
        global $wpdb;
        
        // Valid statuses
        $valid_statuses = array('pending', 'active', 'solved', 'closed');
        
        if (!in_array($status, $valid_statuses)) {
            return false;
        }
        
        // Update status
        $result = $wpdb->update(
            $this->sessions_table,
            array('status' => $status),
            array('id' => $session_id),
            array('%s'),
            array('%d')
        );
        
        return $result !== false;
    }
    
    /**
     * Assign session to an admin
     */
    public function assign_session($session_id, $admin_id) {
        global $wpdb;
        
        // Update assigned_to
        $result = $wpdb->update(
            $this->sessions_table,
            array('assigned_to' => $admin_id),
            array('id' => $session_id),
            array('%d'),
            array('%d')
        );
        
        return $result !== false;
    }
    
    /**
     * Add a message to a chat session
     */
    public function add_message($session_id, $sender_type, $message, $sender_id = null, $file_info = null) {
        global $wpdb;
        
        // Prepare data
        $data = array(
            'session_id' => $session_id,
            'sender_type' => $sender_type,
            'message' => $message
        );
        
        $format = array('%d', '%s', '%s');
        
        // Add sender ID if provided
        if ($sender_id !== null) {
            $data['sender_id'] = $sender_id;
            $format[] = '%d';
        }
        
        // Add file info if provided
        if ($file_info && is_array($file_info)) {
            if (isset($file_info['path'])) {
                $data['file_path'] = $file_info['path'];
                $format[] = '%s';
            }
            if (isset($file_info['name'])) {
                $data['file_name'] = $file_info['name'];
                $format[] = '%s';
            }
            if (isset($file_info['type'])) {
                $data['file_type'] = $file_info['type'];
                $format[] = '%s';
            }
            if (isset($file_info['size'])) {
                $data['file_size'] = $file_info['size'];
                $format[] = '%d';
            }
        }
        
        // Insert message
        $wpdb->insert(
            $this->messages_table,
            $data,
            $format
        );
        
        // Update session 'updated_at' timestamp
        $wpdb->update(
            $this->sessions_table,
            array('updated_at' => current_time('mysql')),
            array('id' => $session_id),
            array('%s'),
            array('%d')
        );
        
        // Update status to 'active' if it was 'pending'
        if ($sender_type === 'admin') {
            $this->update_session_status_if_pending($session_id);
        }
        
        return $wpdb->insert_id;
    }
    
    /**
     * Update session status if it's pending
     */
    private function update_session_status_if_pending($session_id) {
        global $wpdb;
        
        // Get current status
        $status = $wpdb->get_var($wpdb->prepare(
            "SELECT status FROM $this->sessions_table WHERE id = %d",
            $session_id
        ));
        
        if ($status === 'pending') {
            $this->update_session_status($session_id, 'active');
        }
    }
    
    /**
     * Get messages for a chat session
     */
    public function get_session_messages($session_id) {
        global $wpdb;
        
        // Get messages
        $messages = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $this->messages_table 
             WHERE session_id = %d 
             ORDER BY timestamp ASC",
            $session_id
        ));
        
        return $messages;
    }
    
    /**
     * Update user status
     */
    public function update_user_status($user_id, $status = 'online', $typing_in_session = null) {
        global $wpdb;
        
        // Check if status exists
        $exists = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $this->status_table WHERE user_id = %d",
            $user_id
        ));
        
        // Prepare data
        $data = array(
            'status' => $status,
            'last_activity' => current_time('mysql')
        );
        
        $format = array('%s', '%s');
        
        // Add typing session if provided
        if ($typing_in_session !== null) {
            $data['typing_in_session'] = $typing_in_session;
            $format[] = '%d';
        } else {
            $data['typing_in_session'] = null;
            $format[] = null;
        }
        
        if ($exists) {
            // Update
            $result = $wpdb->update(
                $this->status_table,
                $data,
                array('user_id' => $user_id),
                $format,
                array('%d')
            );
        } else {
            // Insert
            $data['user_id'] = $user_id;
            $format[] = '%d';
            $result = $wpdb->insert(
                $this->status_table,
                $data,
                $format
            );
        }
        
        return $result !== false;
    }
    
    /**
     * Get user status
     */
    public function get_user_status($user_id) {
        global $wpdb;
        
        // Get status
        $status = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $this->status_table WHERE user_id = %d",
            $user_id
        ));
        
        return $status;
    }
    
    /**
     * Get all user statuses
     */
    public function get_all_user_statuses() {
        global $wpdb;
        
        // Get all statuses
        $statuses = $wpdb->get_results(
            "SELECT * FROM $this->status_table ORDER BY last_activity DESC"
        );
        
        return $statuses;
    }
    
    /**
     * Get working hours
     */
    public function get_working_hours() {
        global $wpdb;
        
        // Get working hours
        $hours = $wpdb->get_results(
            "SELECT * FROM $this->working_hours_table ORDER BY day_of_week"
        );
        
        return $hours;
    }
    
    /**
     * Update working hours
     */
    public function update_working_hours($day_of_week, $start_time, $end_time, $is_closed) {
        global $wpdb;
        
        // Validate day of week
        if ($day_of_week < 0 || $day_of_week > 6) {
            return false;
        }
        
        // Prepare data
        $data = array(
            'is_closed' => $is_closed ? 1 : 0
        );
        
        $format = array('%d');
        
        // Add times if not closed
        if (!$is_closed) {
            $data['start_time'] = $start_time;
            $data['end_time'] = $end_time;
            $format[] = '%s';
            $format[] = '%s';
        } else {
            $data['start_time'] = null;
            $data['end_time'] = null;
            $format[] = null;
            $format[] = null;
        }
        
        // Update
        $result = $wpdb->update(
            $this->working_hours_table,
            $data,
            array('day_of_week' => $day_of_week),
            $format,
            array('%d')
        );
        
        return $result !== false;
    }
}