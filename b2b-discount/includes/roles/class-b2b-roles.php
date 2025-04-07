<?php
if (!defined('ABSPATH')) {
    exit;
}

class B2B_Roles {
    public function add_b2b_role() {
        if (!get_role('b2b')) {
            add_role('b2b', 'B2B', array('read' => true));
        }
    }

    public function remove_b2b_role() {
        if (get_role('b2b')) {
            remove_role('b2b');
        }
    }
}