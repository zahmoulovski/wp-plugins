<?php
if (!defined('ABSPATH')) exit; // Exit if accessed directly

// Add the "Short URL Manager" admin menu
add_action('admin_menu', function () {
    add_menu_page(
        'Short URL Manager',          // Page title
        'Short URLs',                 // Menu title
        'manage_options',             // Capability
        'short-url-manager',          // Menu slug
        'short_url_admin_page',       // Function to render the page
        'dashicons-admin-links',      // Menu icon
        20                            // Position
    );
});

/**
 * Render the Short URL Manager admin page
 */
function short_url_admin_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'short_urls';

    // Handle form submissions
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';

        if ($action === 'create') {
            // Create a new short URL
            $long_url = esc_url_raw($_POST['long_url']);
            $coupon_code = sanitize_text_field($_POST['coupon_code']);
            $short_code = generate_short_code();

            // Append coupon code to the URL if provided
            if (!empty($coupon_code)) {
                $long_url = add_query_arg('cadeau_remise', $coupon_code, $long_url);
            }

            // Insert the short URL into the database
            $wpdb->insert($table_name, ['short_code' => $short_code, 'long_url' => $long_url]);

            echo '<div class="updated"><p>Short URL created: <strong>' . esc_html($short_code) . '</strong></p></div>';
        } elseif ($action === 'edit') {
            // Edit an existing short URL
            $id = intval($_POST['id']);
            $short_code = sanitize_text_field($_POST['short_code']);
            $long_url = esc_url_raw($_POST['long_url']);

            // Update the short URL in the database
            $wpdb->update($table_name, ['short_code' => $short_code, 'long_url' => $long_url], ['id' => $id]);

            echo '<div class="updated"><p>Short URL updated.</p></div>';
        } elseif ($action === 'delete') {
            // Delete a short URL
            $id = intval($_POST['id']);
            $wpdb->delete($table_name, ['id' => $id]);

            echo '<div class="updated"><p>Short URL deleted.</p></div>';
        }
    }

    // Fetch all short URLs
    $short_urls = $wpdb->get_results("SELECT * FROM $table_name");

    // Fetch existing WooCommerce coupons
    $coupons = get_posts([
        'post_type'   => 'shop_coupon',
        'posts_per_page' => -1 // Get all coupons
    ]);

    // Admin page HTML
    echo '<div class="wrap">';
    echo '<h1>Short URL Manager</h1>';

    // Add new short URL form
    echo '<h2>Add New Short URL</h2>';
    echo '<form method="post" action="">
        <input type="hidden" name="action" value="create">
        <table class="form-table">
            <tr>
                <th><label for="long_url">Original URL</label></th>
                <td><input type="url" name="long_url" id="long_url" class="regular-text" required></td>
            </tr>
            <tr>
                <th><label for="coupon_code">Coupon Code (optional)</label></th>
                <td>
                    <select name="coupon_code" id="coupon_code" class="regular-text">
                        <option value="">Select a Coupon</option>';

    // Loop through WooCommerce coupons and display them
    foreach ($coupons as $coupon) {
        $coupon_code = $coupon->post_title;
        echo "<option value='$coupon_code'>$coupon_code</option>";
    }

    echo '      </select>
                </td>
            </tr>
        </table>
        <p><button type="submit" class="button button-primary">Add Short URL</button></p>
    </form>';

    // Display existing short URLs
    echo '<h2>Existing Short URLs</h2>';
    if ($short_urls) {
        echo '<table class="widefat fixed striped">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Short URL</th>
                    <th>Original URL</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>';

        foreach ($short_urls as $url) {
            $short_url = home_url($url->short_code);
            $long_url = esc_url($url->long_url);

            echo '<tr>
                <td>' . esc_html($url->id) . '</td>
                <td><a href="' . esc_url($short_url) . '" target="_blank">' . esc_html($short_url) . '</a></td>
                <td><a href="' . esc_url($long_url) . '" target="_blank">' . esc_html($long_url) . '</a></td>
                <td>
                    <button type="button" class="button button-primary" onclick="openEditModal(' . esc_js($url->id) . ', \'' . esc_js($url->short_code) . '\', \'' . esc_js($long_url) . '\')">Edit</button>
                    <form method="post" action="" style="display:inline-block;">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="' . esc_attr($url->id) . '">
                        <button type="submit" class="button button-secondary" onclick="return confirm(\'Are you sure you want to delete this URL?\')">Delete</button>
                    </form>
                </td>
            </tr>';
        }

        echo '</tbody></table>';
    } else {
        echo '<p>No short URLs found.</p>';
    }
    echo '</div>';

    // Edit Modal
    echo '<div id="editModal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:white; border:1px solid #ccc; padding:20px; z-index:1000;">
        <h2>Edit Short URL</h2>
        <form method="post" action="">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editId" value="">

            <table class="form-table">
                <tr>
                    <th><label for="editShortCode">Short Code</label></th>
                    <td><input type="text" name="short_code" id="editShortCode" class="regular-text" required></td>
                </tr>
                <tr>
                    <th><label for="editLongUrl">Original URL</label></th>
                    <td><input type="url" name="long_url" id="editLongUrl" class="regular-text" required></td>
                </tr>
            </table>
            <p>
                <button type="submit" class="button button-primary">Save Changes</button>
                <button type="button" class="button" onclick="closeEditModal()">Cancel</button>
            </p>
        </form>
    </div>';

    // JavaScript for Modal
    echo '<script>
        function openEditModal(id, shortCode, longUrl) {
            document.getElementById("editId").value = id;
            document.getElementById("editShortCode").value = shortCode;
            document.getElementById("editLongUrl").value = longUrl;
            document.getElementById("editModal").style.display = "block";
        }

        function closeEditModal() {
            document.getElementById("editModal").style.display = "none";
        }
    </script>';
}
