<?php
/**
 * Plugin Name: Mobile App Authentication Endpoint
 * Description: Custom authentication endpoint for mobile app password verification
 * Version: 1.0
 * Author: Klarrion
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class MobileAppAuthEndpoint {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('init', array($this, 'handle_cors'));
    }
    
    public function handle_cors() {
        // Handle CORS for the custom endpoints
        if (isset($_SERVER['HTTP_ORIGIN'])) {
            $origin = $_SERVER['HTTP_ORIGIN'];
            
            // Allow requests from your mobile app domain
            $allowed_origins = array(
                'http://localhost:2403',
                'http://localhost:2404',
                'http://localhost:2405',
                'http://localhost:2406',
                'http://localhost:2407',
                'http://localhost:3000',
                'http://localhost:5173',
                'https://klarrion.com',
                'https://www.klarrion.com'
            );
            
            if (in_array($origin, $allowed_origins)) {
                header("Access-Control-Allow-Origin: $origin");
                header('Access-Control-Allow-Credentials: true');
                header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
                header('Access-Control-Allow-Headers: Content-Type, Authorization');
            }
        }
        
        // Handle preflight OPTIONS requests
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            status_header(200);
            exit();
        }
    }
    
    public function register_routes() {
        register_rest_route('mobile-app/v1', '/authenticate', array(
            'methods' => 'POST',
            'callback' => array($this, 'authenticate_user'),
            'permission_callback' => '__return_true', // Allow public access
            'args' => array(
                'email' => array(
                    'required' => true,
                    'type' => 'string',
                    'format' => 'email',
                    'description' => 'User email address',
                ),
                'password' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'User password',
                ),
            ),
        ));

        register_rest_route('mobile-app/v1', '/customer/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_customer_with_avatar'),
            'permission_callback' => '__return_true', // Allow public access for now
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Customer ID',
                ),
            ),
        ));

        register_rest_route('mobile-app/v1', '/update-password', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_password'),
            'permission_callback' => array($this, 'check_update_password_permission'),
            'args' => array(
                'current_password' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Current user password',
                ),
                'new_password' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'New user password',
                ),
                'user_email' => array(
                    'required' => true,
                    'type' => 'string',
                    'format' => 'email',
                    'description' => 'User email for verification',
                ),
            ),
        ));

        // Add a test endpoint to verify the plugin is working
        register_rest_route('mobile-app/v1', '/test', array(
            'methods' => 'GET',
            'callback' => array($this, 'test_endpoint'),
            'permission_callback' => '__return_true',
        ));
    }
    
    public function authenticate_user($request) {
        $email = sanitize_email($request->get_param('email'));
        $password = $request->get_param('password');
        
        // Validate email
        if (!is_email($email)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Invalid email format'
            ), 400);
        }
        
        // Get user by email
        $user = get_user_by('email', $email);
        
        if (!$user) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'User not found'
            ), 404);
        }
        
        // Check if user has customer role
        if (!in_array('customer', $user->roles)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Not a customer account'
            ), 403);
        }
        
        // Verify password
        $user_check = wp_authenticate_username_password(NULL, $user->user_login, $password);
        
        if (is_wp_error($user_check)) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Invalid password'
            ), 401);
        }
        
        // Get WooCommerce customer data
        $customer = new WC_Customer($user->ID);
        
        // Get avatar URL
        $avatar_url = get_avatar_url($user->ID, array('size' => 96));
        
        return new WP_REST_Response(array(
            'success' => true,
            'customer' => array(
                'id' => $customer->get_id(),
                'email' => $customer->get_email(),
                'first_name' => $customer->get_first_name(),
                'last_name' => $customer->get_last_name(),
                'username' => $user->user_login,
                'billing' => $customer->get_billing(),
                'shipping' => $customer->get_shipping(),
                'is_paying_customer' => $customer->get_is_paying_customer(),
                'avatar_url' => $avatar_url,
            )
        ), 200);
    }

    public function get_customer_with_avatar($request) {
        $customer_id = (int) $request->get_param('id');
        
        // Get WooCommerce customer data
        $customer = new WC_Customer($customer_id);
        
        if (!$customer->get_id()) {
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Customer not found'
            ), 404);
        }
        
        // Get avatar URL
        $avatar_url = get_avatar_url($customer_id, array('size' => 96));
        
        // Get user data
        $user = get_user_by('id', $customer_id);
        
        return new WP_REST_Response(array(
            'success' => true,
            'customer' => array(
                'id' => $customer->get_id(),
                'email' => $customer->get_email(),
                'first_name' => $customer->get_first_name(),
                'last_name' => $customer->get_last_name(),
                'username' => $user ? $user->user_login : '',
                'billing' => $customer->get_billing(),
                'shipping' => $customer->get_shipping(),
                'is_paying_customer' => $customer->get_is_paying_customer(),
                'avatar_url' => $avatar_url,
                'date_created' => $customer->get_date_created()->format('Y-m-d H:i:s'),
                'date_modified' => $customer->get_date_modified()->format('Y-m-d H:i:s'),
            )
        ), 200);
    }

    public function update_password($request) {
        $current_password = $request->get_param('current_password');
        $new_password = $request->get_param('new_password');
        $user_email = sanitize_email($request->get_param('user_email'));
        
        // Log request for debugging
        error_log('Mobile App Auth: Password update request for email: ' . $user_email);
        
        // Validate new password strength
        if (strlen($new_password) < 8) {
            error_log('Mobile App Auth: Password too short');
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'New password must be at least 8 characters long'
            ), 400);
        }
        
        // Check for password complexity
        if (!preg_match('/[A-Za-z]/', $new_password) || !preg_match('/[0-9]/', $new_password)) {
            error_log('Mobile App Auth: Password complexity check failed');
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'New password must contain both letters and numbers'
            ), 400);
        }
        
        // Get user by email
        $user = get_user_by('email', $user_email);
        
        if (!$user) {
            error_log('Mobile App Auth: User not found for email: ' . $user_email);
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'User not found'
            ), 404);
        }
        
        // Check if user has customer role
        if (!in_array('customer', $user->roles)) {
            error_log('Mobile App Auth: User is not a customer: ' . $user_email);
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Not a customer account'
            ), 403);
        }
        
        // Verify current password
        $user_check = wp_authenticate_username_password(NULL, $user->user_login, $current_password);
        
        if (is_wp_error($user_check)) {
            error_log('Mobile App Auth: Current password verification failed for user: ' . $user->user_login);
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Current password is incorrect'
            ), 401);
        }
        
        // Update password
        $update_result = wp_update_user(array(
            'ID' => $user->ID,
            'user_pass' => $new_password
        ));
        
        if (is_wp_error($update_result)) {
            error_log('Mobile App Auth: Password update failed: ' . $update_result->get_error_message());
            return new WP_REST_Response(array(
                'success' => false,
                'message' => 'Failed to update password: ' . $update_result->get_error_message()
            ), 500);
        }
        
        // Force logout other sessions for security
        wp_destroy_other_sessions();
        
        error_log('Mobile App Auth: Password updated successfully for user: ' . $user->user_login);
        
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Password updated successfully'
        ), 200);
    }
    
    public function check_update_password_permission($request) {
        // For now, allow public access but with email verification
        // In production, you might want to require authentication
        $user_email = sanitize_email($request->get_param('user_email'));
        
        if (empty($user_email) || !is_email($user_email)) {
            return new WP_Error('invalid_email', 'Valid email address is required', array('status' => 400));
        }
        
        $user = get_user_by('email', $user_email);
        
        if (!$user) {
            return new WP_Error('user_not_found', 'User not found', array('status' => 404));
        }
        
        return true;
    }
    
    public function test_endpoint() {
        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Mobile App Auth Endpoint is working',
            'timestamp' => current_time('mysql'),
            'version' => '1.0'
        ), 200);
    }
}

// Initialize the endpoint
new MobileAppAuthEndpoint();