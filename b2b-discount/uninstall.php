<?php
// Exit if accessed directly
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Remove the B2B role when the plugin is deleted
if (get_role('b2b')) {
    remove_role('b2b');
}