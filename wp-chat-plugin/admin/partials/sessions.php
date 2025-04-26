<?php
/**
 * Admin Sessions Page
 */
if (!defined('ABSPATH')) exit;

global $wpdb;
$sessions = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}wp_chat_sessions");
?>

<div class="wrap">
    <h1>Chat Sessions</h1>
    <table class="wp-list-table widefat fixed striped">
        <thead>
            <tr>
                <th>ID</th>
                <th>User</th>
                <th>Status</th>
                <th>Last Updated</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ($sessions as $session) : ?>
            <tr>
                <td><?php echo $session->id; ?></td>
                <td><?php echo $session->full_name; ?></td>
                <td><?php echo ucfirst($session->status); ?></td>
                <td><?php echo $session->updated_at; ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>