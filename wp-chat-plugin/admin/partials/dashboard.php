<div class="wrap">
    <h1>Chat Plugin Dashboard</h1>
    
    <div class="wp-chat-dashboard">
        <div class="wp-chat-dashboard-column">
            <div class="wp-chat-dashboard-card">
                <h2>Pending Sessions (<?php echo count($pending_sessions); ?>)</h2>
                <div class="wp-chat-pending-sessions">
                    <?php if (empty($pending_sessions)) : ?>
                        <p>No pending chat sessions.</p>
                    <?php else : ?>
                        <?php foreach ($pending_sessions as $session) : 
                            $last_activity = new DateTime($session->updated_at);
                            $now = new DateTime();
                            $interval = $now->diff($last_activity);
                            $is_online = $user_status->is_user_online($session->user_id);
                        ?>
                            <div class="wp-chat-session-item" data-session-id="<?php echo esc_attr($session->id); ?>">
                                <div class="wp-chat-session-item-header">
                                    <h3>
                                        <?php echo esc_html($session->full_name); ?>
                                        <span class="wp-chat-status <?php echo $is_online ? 'online' : 'offline'; ?>" 
                                              title="<?php echo $is_online ? 'Online' : 'Offline'; ?>">
                                            ●
                                        </span>
                                    </h3>
                                    <span class="wp-chat-session-item-time">
                                        <?php 
                                        if ($interval->days > 0) {
                                            echo esc_html($interval->days . ' days ago');
                                        } elseif ($interval->h > 0) {
                                            echo esc_html($interval->h . ' hours ago');
                                        } else {
                                            echo esc_html($interval->i . ' minutes ago');
                                        }
                                        ?>
                                    </span>
                                </div>
                                <div class="wp-chat-session-item-body">
                                    <div><strong>Email:</strong> <?php echo esc_html($session->email); ?></div>
                                    <?php if (!empty($session->phone_number)) : ?>
                                        <div><strong>Phone:</strong> <?php echo esc_html($session->phone_number); ?></div>
                                    <?php endif; ?>
                                    <div>
                                        <a href="#" class="wp-chat-view-session button button-primary" 
                                           data-session-id="<?php echo esc_attr($session->id); ?>">
                                            View Chat
                                        </a>
                                        <select class="wp-chat-status-select" data-session-id="<?php echo esc_attr($session->id); ?>">
                                            <option value="pending" <?php selected($session->status, 'pending'); ?>>Pending</option>
                                            <option value="active" <?php selected($session->status, 'active'); ?>>Active</option>
                                            <option value="solved" <?php selected($session->status, 'solved'); ?>>Solved</option>
                                            <option value="closed" <?php selected($session->status, 'closed'); ?>>Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <div class="wp-chat-dashboard-column">
            <div class="wp-chat-dashboard-card">
                <h2>Active Sessions (<?php echo count($active_sessions); ?>)</h2>
                <div class="wp-chat-active-sessions">
                    <?php if (empty($active_sessions)) : ?>
                        <p>No active chat sessions.</p>
                    <?php else : ?>
                        <?php foreach ($active_sessions as $session) : 
                            $last_activity = new DateTime($session->updated_at);
                            $now = new DateTime();
                            $interval = $now->diff($last_activity);
                            $is_online = $user_status->is_user_online($session->user_id);
                            
                            // Get assigned admin name
                            $assigned_admin_name = 'Unassigned';
                            if ($session->assigned_to) {
                                $admin = get_user_by('id', $session->assigned_to);
                                if ($admin) {
                                    $assigned_admin_name = $admin->display_name;
                                }
                            }
                        ?>
                            <div class="wp-chat-session-item" data-session-id="<?php echo esc_attr($session->id); ?>">
                                <div class="wp-chat-session-item-header">
                                    <h3>
                                        <?php echo esc_html($session->full_name); ?>
                                        <span class="wp-chat-status <?php echo $is_online ? 'online' : 'offline'; ?>" 
                                              title="<?php echo $is_online ? 'Online' : 'Offline'; ?>">
                                            ●
                                        </span>
                                    </h3>
                                    <span class="wp-chat-session-item-time">
                                        <?php 
                                        if ($interval->days > 0) {
                                            echo esc_html($interval->days . ' days ago');
                                        } elseif ($interval->h > 0) {
                                            echo esc_html($interval->h . ' hours ago');
                                        } else {
                                            echo esc_html($interval->i . ' minutes ago');
                                        }
                                        ?>
                                    </span>
                                </div>
                                <div class="wp-chat-session-item-body">
                                    <div><strong>Email:</strong> <?php echo esc_html($session->email); ?></div>
                                    <?php if (!empty($session->phone_number)) : ?>
                                        <div><strong>Phone:</strong> <?php echo esc_html($session->phone_number); ?></div>
                                    <?php endif; ?>
                                    <div><strong>Assigned to:</strong> <?php echo esc_html($assigned_admin_name); ?></div>
                                    <div>
                                        <a href="#" class="wp-chat-view-session button button-primary" 
                                           data-session-id="<?php echo esc_attr($session->id); ?>">
                                            View Chat
                                        </a>
                                        <select class="wp-chat-status-select" data-session-id="<?php echo esc_attr($session->id); ?>">
                                            <option value="pending" <?php selected($session->status, 'pending'); ?>>Pending</option>
                                            <option value="active" <?php selected($session->status, 'active'); ?>>Active</option>
                                            <option value="solved" <?php selected($session->status, 'solved'); ?>>Solved</option>
                                            <option value="closed" <?php selected($session->status, 'closed'); ?>>Closed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    
    <div class="wp-chat-dashboard-wide">
        <div class="wp-chat-dashboard-card">
            <h2>Recent Sessions</h2>
            <table class="wp-list-table widefat fixed striped wp-chat-sessions-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Last Activity</th>
                        <th>Assigned To</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($recent_sessions)) : ?>
                        <tr>
                            <td colspan="7">No chat sessions found.</td>
                        </tr>
                    <?php else : ?>
                        <?php foreach ($recent_sessions as $session) : 
                            // Get assigned admin name
                            $assigned_admin_name = 'Unassigned';
                            if ($session->assigned_to) {
                                $admin = get_user_by('id', $session->assigned_to);
                                if ($admin) {
                                    $assigned_admin_name = $admin->display_name;
                                }
                            }
                            
                            // Format dates
                            $started_at = new DateTime($session->started_at);
                            $updated_at = new DateTime($session->updated_at);
                            
                            // Get status class
                            $status_class = '';
                            switch ($session->status) {
                                case 'pending':
                                    $status_class = 'wp-chat-status-pending';
                                    break;
                                case 'active':
                                    $status_class = 'wp-chat-status-active';
                                    break;
                                case 'solved':
                                    $status_class = 'wp-chat-status-solved';
                                    break;
                                case 'closed':
                                    $status_class = 'wp-chat-status-closed';
                                    break;
                            }
                        ?>
                            <tr>
                                <td><?php echo esc_html($session->full_name); ?></td>
                                <td><?php echo esc_html($session->email); ?></td>
                                <td><span class="<?php echo esc_attr($status_class); ?>"><?php echo esc_html(ucfirst($session->status)); ?></span></td>
                                <td><?php echo esc_html($started_at->format('M j, Y g:i A')); ?></td>
                                <td><?php echo esc_html($updated_at->format('M j, Y g:i A')); ?></td>
                                <td><?php echo esc_html($assigned_admin_name); ?></td>
                                <td>
                                    <a href="#" class="wp-chat-view-session" data-session-id="<?php echo esc_attr($session->id); ?>">
                                        View
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>