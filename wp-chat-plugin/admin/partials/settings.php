<div class="wrap">
    <h1>Chat Plugin Settings</h1>
    
    <div class="wp-chat-admin-tabs">
        <ul class="nav-tab-wrapper">
            <li><a href="#general" class="nav-tab nav-tab-active">General</a></li>
            <li><a href="#working-hours" class="nav-tab">Working Hours</a></li>
            <li><a href="#advanced" class="nav-tab">Advanced</a></li>
        </ul>
        
        <div class="wp-chat-tab-content">
            <!-- General Settings -->
            <div id="general" class="wp-chat-tab-pane active">
                <form method="post" action="options.php">
                    <?php settings_fields('wp_chat_general'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">Enable Chat</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="wp_chat_enable_chat" value="1" <?php checked('1', $enable_chat); ?> />
                                    Enable chat widget on website
                                </label>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Widget Position</th>
                            <td>
                                <select name="wp_chat_widget_position">
                                    <option value="bottom-right" <?php selected('bottom-right', $widget_position); ?>>Bottom Right</option>
                                    <option value="bottom-left" <?php selected('bottom-left', $widget_position); ?>>Bottom Left</option>
                                    <option value="top-right" <?php selected('top-right', $widget_position); ?>>Top Right</option>
                                    <option value="top-left" <?php selected('top-left', $widget_position); ?>>Top Left</option>
                                </select>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Primary Color</th>
                            <td>
                                <input type="text" name="wp_chat_primary_color" value="<?php echo esc_attr($primary_color); ?>" class="wp-chat-color-picker" />
                                <p class="description">Choose the primary color for the chat widget</p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Welcome Message</th>
                            <td>
                                <textarea name="wp_chat_welcome_message" rows="3" class="large-text"><?php echo esc_textarea($welcome_message); ?></textarea>
                                <p class="description">The message displayed when a user starts a new chat</p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Company Name</th>
                            <td>
                                <input type="text" name="wp_chat_company_name" value="<?php echo esc_attr(get_option('wp_chat_company_name', 'KLARRION')); ?>" class="regular-text" />
                                <p class="description">Your company name displayed to users in the chat</p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Display Company Name</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="wp_chat_use_company_name" value="1" <?php checked('1', get_option('wp_chat_use_company_name', '1')); ?> />
                                    Show company name instead of agent names in customer chat view
                                </label>
                            </td>
                        </tr>
                    </table>
                    
                    <?php submit_button(); ?>
                </form>
            </div>
            
            <!-- Working Hours Settings -->
            <div id="working-hours" class="wp-chat-tab-pane">
                <form method="post" action="options.php">
                    <?php settings_fields('wp_chat_working_hours'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">Enable Working Hours</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="wp_chat_working_hours_enable" value="1" <?php checked('1', $working_hours_enable); ?> />
                                    Only show chat widget during working hours
                                </label>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Working Hours</th>
                            <td>
                                <div class="wp-chat-working-hours-container">
                                    <?php 
                                    $days = array(
                                        'monday' => 'Monday',
                                        'tuesday' => 'Tuesday',
                                        'wednesday' => 'Wednesday',
                                        'thursday' => 'Thursday',
                                        'friday' => 'Friday',
                                        'saturday' => 'Saturday',
                                        'sunday' => 'Sunday'
                                    );
                                    
                                    foreach ($days as $day_key => $day_name) :
                                        $day_data = isset($working_hours[$day_key]) ? $working_hours[$day_key] : array();
                                        $is_closed = isset($day_data['closed']) ? $day_data['closed'] : false;
                                        $start_time = isset($day_data['start']) ? $day_data['start'] : '09:00';
                                        $end_time = isset($day_data['end']) ? $day_data['end'] : '17:00';
                                    ?>
                                        <div class="wp-chat-working-day">
                                            <div class="wp-chat-day-label"><?php echo esc_html($day_name); ?></div>
                                            <div class="wp-chat-day-hours">
                                                <label>
                                                    <input type="checkbox" 
                                                        name="wp_chat_working_hours[<?php echo esc_attr($day_key); ?>][closed]" 
                                                        value="1" 
                                                        class="wp-chat-day-closed" 
                                                        <?php checked(true, $is_closed); ?> />
                                                    Closed
                                                </label>
                                                <div class="wp-chat-time-inputs" <?php echo $is_closed ? 'style="display:none;"' : ''; ?>>
                                                    <input type="time" 
                                                        name="wp_chat_working_hours[<?php echo esc_attr($day_key); ?>][start]" 
                                                        value="<?php echo esc_attr($start_time); ?>" />
                                                    to
                                                    <input type="time" 
                                                        name="wp_chat_working_hours[<?php echo esc_attr($day_key); ?>][end]" 
                                                        value="<?php echo esc_attr($end_time); ?>" />
                                                </div>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">Offline Message</th>
                            <td>
                                <textarea name="wp_chat_offline_message" rows="3" class="large-text"><?php echo esc_textarea($offline_message); ?></textarea>
                                <p class="description">The message displayed when chat is offline (outside working hours)</p>
                            </td>
                        </tr>
                    </table>
                    
                    <?php submit_button(); ?>
                </form>
            </div>
            
            <!-- Advanced Settings -->
            <div id="advanced" class="wp-chat-tab-pane">
                <form method="post" action="options.php">
                    <?php settings_fields('wp_chat_advanced'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">User Status Indicators</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="wp_chat_user_status_indicators" value="1" <?php checked('1', $user_status_indicators); ?> />
                                    Show online/offline status indicators for users and admins
                                </label>
                            </td>
                        </tr>
                    </table>
                    
                    <div class="wp-chat-admin-display-name">
                        <h3>Agent Display Names</h3>
                        <p class="description">Set custom display names for each admin/agent. These names will be visible to other admins only.</p>
                        
                        <?php 
                        $admin_users = get_users(array('role__in' => array('administrator')));
                        foreach ($admin_users as $admin) :
                            $agent_name_option = 'wp_chat_agent_name_' . $admin->ID;
                            $agent_name = get_option($agent_name_option, $admin->display_name);
                        ?>
                            <div class="wp-chat-admin-display-name-option">
                                <label for="<?php echo esc_attr($agent_name_option); ?>">
                                    <?php echo esc_html($admin->display_name); ?> (<?php echo esc_html($admin->user_email); ?>)
                                </label>
                                <input 
                                    type="text" 
                                    name="<?php echo esc_attr($agent_name_option); ?>" 
                                    id="<?php echo esc_attr($agent_name_option); ?>" 
                                    value="<?php echo esc_attr($agent_name); ?>" 
                                    class="wp-chat-admin-display-name-input"
                                    placeholder="Agent <?php echo esc_attr($admin->ID); ?>"
                                />
                            </div>
                        <?php endforeach; ?>
                    </div>
                    
                    <?php submit_button(); ?>
                </form>
            </div>
        </div>
    </div>
</div>