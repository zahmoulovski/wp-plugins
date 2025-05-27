<?php
/*
Plugin Name: KLARRION Functions
Description: Zahmoulovski's plugin for multiple custom functions.
Version: 1.6
Author: Med Yassine Zahmoul
*/
// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
// Include the admin editor file
if (is_admin()) {
    require_once plugin_dir_path(__FILE__) . 'admin-editor.php';
}
// Add a settings link to the plugin actions
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'klarrion_add_settings_link');
function klarrion_add_settings_link($links) {
    $settings_link = '<a href="' . admin_url('admin.php?page=klarrion-functions-editor') . '">' . __('Editor') . '</a>';
    array_unshift($links, $settings_link); // Add the settings link to the beginning of the array
    return $links;
}



// Increase WooCommerce session timeout to 30 days (default is 48 hours)
add_filter('wc_session_expiration', 'extend_woocommerce_session_expiration');
function extend_woocommerce_session_expiration() {
    return 60 * 60 * 24 * 30; // 30 days in seconds
}

// ahrefs analytics
function add_ahrefs_analytics_script() {
    ?>
    <script src="https://analytics.ahrefs.com/analytics.js" data-key="/KQA5ahIIx3b3Qigy5wU/A" async></script>
    <?php
}
add_action('wp_head', 'add_ahrefs_analytics_script');

// === 1. Toggle WooCommerce Emails ===
function toggle_woocommerce_emails($enable) {
    update_option('woo_emails_enabled', $enable);

    $callbacks = [
        'woocommerce_email_enabled_customer_completed_order',
        'woocommerce_email_enabled_customer_processing_order',
        'woocommerce_email_enabled_new_order',
        'woocommerce_email_enabled_cancelled_order',
        'woocommerce_email_enabled_failed_order',
        'woocommerce_email_enabled_customer_refunded_order',
    ];

    foreach ($callbacks as $cb) {
        remove_filter($cb, '__return_false');
        if (!$enable) {
            add_filter($cb, '__return_false');
        }
    }
}
add_action('init', function () {
    $enabled = get_option('woo_emails_enabled', true);
    toggle_woocommerce_emails($enabled);
});

// === 2. Create Users for Orders ===
function create_users_for_orders_without_accounts() {
    $orders = wc_get_orders(['status' => array_keys(wc_get_order_statuses()), 'limit' => -1]);
    foreach ($orders as $order) {
        $email = $order->get_billing_email();
        if (!$email || !is_email($email)) continue;

        if (!email_exists($email)) {
            $user_id = wp_insert_user([
                'user_login' => $email,
                'user_email' => $email,
                'first_name' => $order->get_billing_first_name(),
                'last_name'  => $order->get_billing_last_name(),
                'user_pass'  => wp_generate_password(),
                'role'       => 'customer',
            ]);
            if (!is_wp_error($user_id)) {
                $order->set_customer_id($user_id);
                $order->save();
            }
        } else {
            $existing_user = get_user_by('email', $email);
            if ($existing_user) {
                $order->set_customer_id($existing_user->ID);
                $order->save();
            }
        }
    }
}

// === 3. Delete Users Without Orders ===
function delete_users_without_orders() {
    $excluded_roles = ['administrator', 'b2b', 'shop_manager'];
    $users = get_users(['role__not_in' => $excluded_roles, 'fields' => 'ID']);
    foreach ($users as $user_id) {
        $orders = wc_get_orders(['customer_id' => $user_id, 'limit' => 1]);
        if (empty($orders)) {
            wp_delete_user($user_id);
        }
    }
}

// === 4. Admin Bar Buttons ===
add_action('admin_bar_menu', function ($wp_admin_bar) {
    if (!current_user_can('manage_options')) return;

    $emails_enabled = get_option('woo_emails_enabled', true);

    $wp_admin_bar->add_node([
        'id'    => 'toggle_woo_emails',
        'title' => $emails_enabled ? '🔕 Disable Woo Emails' : '🔔 Enable Woo Emails',
        'href'  => wp_nonce_url(admin_url('?toggle_woo_emails=1'), 'toggle_woo_emails')
    ]);

    $wp_admin_bar->add_node([
        'id'    => 'create_users_for_orders',
        'title' => '👤 Create Users for Orders',
        'href'  => wp_nonce_url(admin_url('?create_users_for_orders=1'), 'create_users_for_orders')
    ]);

    $wp_admin_bar->add_node([
        'id'    => 'delete_users_no_orders',
        'title' => '🧹 Delete Users w/o Orders',
        'href'  => wp_nonce_url(admin_url('?delete_users_no_orders=1'), 'delete_users_no_orders')
    ]);
}, 100);

// === 5. Handle Actions from Button Clicks ===
add_action('admin_init', function () {
    if (isset($_GET['toggle_woo_emails']) && check_admin_referer('toggle_woo_emails')) {
        $current = get_option('woo_emails_enabled', true);
        update_option('woo_emails_enabled', !$current);
        wp_redirect(admin_url());
        exit;
    }

    if (isset($_GET['create_users_for_orders']) && check_admin_referer('create_users_for_orders')) {
        create_users_for_orders_without_accounts();
        add_action('admin_notices', function () {
            echo '<div class="notice notice-success"><p>✅ Users created for orders without accounts.</p></div>';
        });
    }

    if (isset($_GET['delete_users_no_orders']) && check_admin_referer('delete_users_no_orders')) {
        delete_users_without_orders();
        add_action('admin_notices', function () {
            echo '<div class="notice notice-warning"><p>🧹 Users without orders have been deleted.</p></div>';
        });
    }
});



// user creation date 
// Add a new column in the Users list table
function add_user_registration_column($columns) {
    $columns['registration_date'] = 'Registration Date';
    return $columns;
}
add_filter('manage_users_columns', 'add_user_registration_column');

// Fill the new column with user registration data
function show_user_registration_date($value, $column_name, $user_id) {
    if ($column_name == 'registration_date') {
        $user = get_userdata($user_id);
        return date('Y-m-d H:i:s', strtotime($user->user_registered));
    }
    return $value;
}
add_filter('manage_users_custom_column', 'show_user_registration_date', 10, 3);

// Make the column sortable
function make_user_registration_column_sortable($columns) {
    $columns['registration_date'] = 'user_registered';
    return $columns;
}
add_filter('manage_users_sortable_columns', 'make_user_registration_column_sortable');

// Show user registration date on the user profile page
function show_registration_date_on_profile($user) {
    ?>
    <h3>Registration Information</h3>
    <table class="form-table">
        <tr>
            <th><label for="registration_date">Registration Date</label></th>
            <td>
                <input type="text" name="registration_date" id="registration_date" value="<?php echo esc_attr($user->user_registered); ?>" class="regular-text" readonly />
            </td>
        </tr>
    </table>
    <?php
}
add_action('show_user_profile', 'show_registration_date_on_profile');
add_action('edit_user_profile', 'show_registration_date_on_profile');

// Hook into WooCommerce initialization to ensure WooCommerce functions are available
add_action('woocommerce_init', 'initialize_custom_sale_flash_function');

function initialize_custom_sale_flash_function() {
    // Override the sale badge to display discount percentage and savings amount in the same line
    add_filter('woocommerce_sale_flash', 'custom_woocommerce_sale_flash', 10, 3);
}

function custom_woocommerce_sale_flash( $html, $post, $product ) {
    // Apply only for simple products, skipping variable products
    if ( $product->is_type('simple') && $product->is_on_sale() ) {
        // Get the regular price and sale price
        $regular_price = $product->get_regular_price();
        $sale_price = $product->get_sale_price();

        // Calculate the discount percentage
        $discount_percentage = round( ( ( $regular_price - $sale_price ) / $regular_price ) * 100 );

        // Calculate the savings amount
        $savings = $regular_price - $sale_price;

        // Create the custom sale flash message with percentage and savings on the same line
        $html = '<span class="onsale">-' . $discount_percentage . '% &nbsp;- ' . wc_price( $savings ) . '</span>';
    }

    return $html;
}


// Custom currency and currency symbol

add_filter( 'woocommerce_currencies', 'flous' );

function flous( $currencies ) {
    $currencies['TND'] = __( 'Dinar Tounsi', 'woocommerce' ); // Adds the TND currency
    return $currencies;
}

add_filter('woocommerce_currency_symbol', 'add_my_currency_symbol', 10, 2);

function add_my_currency_symbol( $currency_symbol, $currency ) {
    switch( $currency ) {
        case 'TND':
            $currency_symbol = 'TND'; // Change the currency symbol to TND
            break;
    }
    return $currency_symbol;
}


/*
 // Enqueue script and styles for child theme
 
function woodmart_child_enqueue_styles() {
	wp_enqueue_style( 'child-style', get_stylesheet_directory_uri() . '/style.css', array( 'woodmart-style' ), woodmart_get_theme_info( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', 'woodmart_child_enqueue_styles', 10010 );

add_filter( 'woocommerce_admin_meta_boxes_variations_per_page', 'zahmoul_variations_per_page' );

function zahmoul_variations_per_page() {
	return 50;
}
*/



// alphabetical order
 

// Add custom sorting options: A to Z and Z to A
add_filter( 'woocommerce_get_catalog_ordering_args', 'custom_woocommerce_get_catalog_ordering_args' );

function custom_woocommerce_get_catalog_ordering_args( $args ) {
    $orderby_value = isset( $_GET['orderby'] ) ? woocommerce_clean( $_GET['orderby'] ) : apply_filters( 'woocommerce_default_catalog_orderby', get_option( 'woocommerce_default_catalog_orderby' ) );

    // Alphabetical A to Z
    if ( 'alphabetical_asc' == $orderby_value ) {
        $args['orderby'] = 'title';
        $args['order'] = 'ASC';
    }
    // Alphabetical Z to A
    elseif ( 'alphabetical_desc' == $orderby_value ) {
        $args['orderby'] = 'title';
        $args['order'] = 'DESC';
    }

    return $args;
}


// Add the new sorting options to the WooCommerce dropdown
add_filter( 'woocommerce_default_catalog_orderby_options', 'custom_woocommerce_catalog_orderby' );
add_filter( 'woocommerce_catalog_orderby', 'custom_woocommerce_catalog_orderby' );

function custom_woocommerce_catalog_orderby( $sortby ) {
    $sortby['alphabetical_asc'] = __( 'Nom (A to Z)' );
    $sortby['alphabetical_desc'] = __( 'Nom (Z to A)' );
    return $sortby;
}



// Add WhatsApp Order button and email form after the "Add to Cart" button
add_action('woocommerce_after_add_to_cart_button', 'add_whatsapp_order_button_with_email');

function add_whatsapp_order_button_with_email() {
    global $product;
    
    // Get the current product URL, name, SKU
    $product_url = get_permalink( $product->get_id() );
    $product_name = $product->get_name(); // Get the Product title
    $product_sku = $product->get_sku(); // Get the REF
    
    // Your WhatsApp number in international format
    $whatsapp_number = '+21698134873'; // Change this to your number
    
    // Initial WhatsApp button with WhatsApp icon and green color
    echo '<div class="whatsapp-order-form">';
    echo '<button type="button" class="button alt whatsapp-order-button" onclick="transformToEmailInput()" style="background-color: #25D366; color: white; border: none; padding: 10px 15px; cursor: pointer; font-size: 16px; border-radius: 50px;">
            <i class="fab fa-whatsapp"></i> Commander par WHATSAPP
          </button>';
    
    // Hidden email input form (hidden initially)
    echo '<div id="email-input-container" style="display:none; margin-top: 10px; width: 100%;">';
    echo '<input type="email" id="whatsapp_email" name="whatsapp_email" placeholder="Entrez votre email" style="padding: 10px 15px; font-size: 16px; flex-grow: 1; border-radius: 50px 0 0 50px; border: 1px solid #ddd; height: 40px;">';
    echo '<button type="button" class="button alt send-whatsapp-button" onclick="sendWhatsappOrder()" style="background-color: #25D366; color: white; border: none; padding: 10px; cursor: pointer; font-size: 16px; width: 50px; height: 40px; border-radius: 0 50px 50px 0;">
            <i class="fab fa-whatsapp"></i>
          </button>';
    echo '</div>';
    echo '</div>';

    // JavaScript to handle the transformation and sending the WhatsApp message
    echo "
    <script type='text/javascript'>
        function transformToEmailInput() {
            // Hide the WhatsApp button and show the email input form
            document.querySelector('.whatsapp-order-button').style.display = 'none';
            document.getElementById('email-input-container').style.display = 'flex'; // This will show the input field and button
        }

        function sendWhatsappOrder() {
            // Get the email from the input field
            var email = document.getElementById('whatsapp_email').value;
            
            // Make sure the email is not empty
            if(email === '') {
                alert('Veuillez entrer votre email.');
                return;
            }

            // Get the quantity from the WooCommerce quantity input
            var quantity = document.querySelector('input[name=\"quantity\"]').value;
            
            // Encode the product details and email
            var productName = '" . esc_js($product_name) . "';
            var productSku = '" . esc_js($product_sku) . "';
            var productUrl = '" . esc_js($product_url) . "';
            var message = '3asléma, n7éb n3adi commande fi : ' + productName + ' (RÉF : ' + productSku + ') - ' + productUrl + ' Quantité: ' + quantity + ' Email : ' + email;

            // Encode the message for URL
            var encodedMessage = encodeURIComponent(message);

            // Create the WhatsApp URL
            var whatsappUrl = 'https://wa.me/" . esc_js($whatsapp_number) . "?text=' + encodedMessage;
            
            // Open WhatsApp in a new tab
            window.open(whatsappUrl, '_blank');
        }
    </script>
    ";
}

// Function to hide all shipping methods except local pickup when a chemical product is in the cart
function disable_shipping_when_chemical_product_in_cart( $rates ) {
    // Define the shipping class slug for chemical products
    $chemical_class_slug = 'chemical';

    // Flag to check if any chemical product is in the cart
    $chemical_product_in_cart = false;

    // Loop through cart items to find if any product has the 'chemical' shipping class
    foreach ( WC()->cart->get_cart() as $cart_item ) {
        $product = $cart_item['data'];
        
        // Check if the product belongs to the 'chemical' shipping class
        if ( $product->get_shipping_class() === $chemical_class_slug ) {
            $chemical_product_in_cart = true;
            break;
        }
    }

    // If a chemical product is in the cart, remove all shipping methods except local pickup
    if ( $chemical_product_in_cart ) {
        foreach ( $rates as $rate_id => $rate ) {
            if ( 'local_pickup' !== $rate->method_id ) {
                unset( $rates[$rate_id] );  // Remove all other shipping methods
            }
        }
    }

    return $rates;  // Return the filtered shipping rates
}
add_filter( 'woocommerce_package_rates', 'disable_shipping_when_chemical_product_in_cart', 100 );

// Function to add a warning message next to the "Retrait en Showroom" option if chemical products are in the cart
function add_chemical_product_warning_message( $method, $index ) {
    // Define the shipping class slug for chemical products
    $chemical_class_slug = 'chemical';
    
    // Initialize a flag to check if any chemical product is in the cart
    $chemical_product_in_cart = false;

    // Loop through the cart items to check if a chemical product is in the cart
    foreach ( WC()->cart->get_cart() as $cart_item ) {
        $product = $cart_item['data'];

        // Check if the product belongs to the 'chemical' shipping class
        if ( $product->get_shipping_class() === $chemical_class_slug ) {
            $chemical_product_in_cart = true;
            break;
        }
    }

    // Display the message only if a chemical product is in the cart and the method is "local pickup"
    if ( $chemical_product_in_cart && 'local_pickup' === $method->method_id ) {
        // Message to display
        echo '<span class="chemical-warning" style="color: red; font-weight: bold; margin-left: 10px;">⚠️ Attention : Les produits chimiques inflammable ne sont pas expédiés via transporteur. ⚠️ </span>';
    }
}

// Hook the function to display the message next to "Retrait en Showroom"
add_action( 'woocommerce_after_shipping_rate', 'add_chemical_product_warning_message', 10, 2 );

// 1. Automatically create an account for new customers only
function force_account_creation_on_checkout($checkout) {
    if (!empty($_POST['billing_email']) && !email_exists($_POST['billing_email'])) {
        // Get the billing first name
        $billing_first_name = !empty($_POST['billing_first_name']) ? sanitize_user($_POST['billing_first_name']) : '';
        
        if (!empty($billing_first_name)) {
            // Create base username from first name (lowercase and remove special chars)
            $base_username = sanitize_user(strtolower($billing_first_name), true);
            $username = $base_username;
            $counter = 1;

            // Keep trying until we find an available username
            while (username_exists($username)) {
                $username = $base_username . $counter;
                $counter++;
            }

            // Set the username in the POST data
            $_POST['account_username'] = $username;
        }
        
        $_POST['createaccount'] = 1;
    }
}
add_action('woocommerce_checkout_process', 'force_account_creation_on_checkout');

// 2. Hide the "Créer un compte ?" option from the checkout page
function hide_create_account_checkbox_css() {
    if (is_checkout()) {
        echo '<style>
            .woocommerce-account-fields .create-account { display: none; }
        </style>';
    }
}
add_action('wp_head', 'hide_create_account_checkbox_css');


/**
 * Add custom thank you message below breadcrumb but above other thank you content
 */
function klarrion_custom_thank_you_after_breadcrumb($order_id) {
    if (!$order_id) return;
    
    // Get the order object
    $order = wc_get_order($order_id);
    
    // Custom message HTML with centered alignment
    echo '<div style="text-align: center; margin: 20px 0 30px;">';
    echo '<h3 style="margin-bottom: 10px;">' . __('Merci d\'avoir fait vos achats chez nous.', 'klarrion') . '</h3>';
    echo '<h5 style="margin-bottom: 15px;">' . __('Votre commande a été reçue avec succès.', 'klarrion') . '</h5>';
    echo '<p style="font-weight: bold; margin: 0;">Commande numéro <span style="font-size: 35px; color: #85B951;">#' . $order->get_order_number() . '</span></p>';    echo '</div>';
}
// Hook with priority 9 to place it right after breadcrumb (which typically uses priority 10)
add_action('woocommerce_before_thankyou', 'klarrion_custom_thank_you_after_breadcrumb', 9);


/**
 * Add custom order tracking button to WooCommerce thank you page (for all order statuses)
 */
function klarrion_add_order_tracking_button_all_statuses($order_id) {
    if (!$order_id) return;

    // Build the tracking URL with order ID
    $tracking_url = esc_url(add_query_arg('order_id', $order_id, 'https://klarrion.com/suivi-de-commande/'));
    
    // Output the button with the same style as the theme
    echo '<div class="woocommerce-order" style="margin-bottom: 2em;">';
    echo '<p class="woocommerce-notice woocommerce-notice--success woocommerce-thankyou-order-received">' . __('Suivez votre commande', 'klarrion') . '</p>';
    echo '<p class="woocommerce-notice woocommerce-notice--error woocommerce-thankyou-order-failed">Votre commande a bien été reçue, un de nos agents commerciaux prendra contact avec vous pour la confirmer dans les 24 à 48 heures.</p>';
    echo '<a href="' . $tracking_url . '" class="woocommerce-button button pay order-actions-button" style="background-color: #1D7EAA; color: white; border-radius: 10px;">' . __('Suivi de commande', 'klarrion') . '</a>';
    echo '</div>';
}
add_action('woocommerce_thankyou', 'klarrion_add_order_tracking_button_all_statuses', 20);

// Add total savings line in the cart totals with unique classes
function display_cart_total_savings() {
    $total_savings = 0;

    // Loop through cart items to calculate the total savings
    foreach ( WC()->cart->get_cart() as $cart_item ) {
        $product = $cart_item['data'];
        $regular_price = $product->get_regular_price();
        $sale_price = $product->get_sale_price();
        
        // Check if the product is on sale and calculate the savings
        if ( $product->is_on_sale() ) {
            $quantity = $cart_item['quantity'];
            $savings_per_item = $regular_price - $sale_price;
            $total_savings += $savings_per_item * $quantity;
        }
    }

    // Add coupon savings if any coupon is applied
    $coupon_savings = 0;
    if ( WC()->cart->has_discount() ) {
        foreach ( WC()->cart->get_coupons() as $coupon ) {
            $coupon_savings += WC()->cart->get_coupon_discount_amount( $coupon->get_code() );
        }
    }

    // Add the coupon savings to the total savings
    $total_savings += $coupon_savings;

    // If there's any savings, display it in the cart totals
    if ( $total_savings > 0 ) {
        echo '<tr class="cart-total-savings-row">
                <th class="cart-total-savings-label">' . __( 'Total Remise', 'woocommerce' ) . '</th>
                <td class="cart-total-savings-amount" data-title="' . __( 'Total Remise', 'woocommerce' ) . '">' . wc_price( $total_savings ) . '</td>
              </tr>';
    }
}
add_action( 'woocommerce_cart_totals_after_order_total', 'display_cart_total_savings', 10 );


// Display the tax name (from tax settings) below the product price and center it
function add_tax_name_to_cart_price( $product_price, $cart_item, $cart_item_key ) {
    // Get the product's tax class
    $tax_class = $cart_item['data']->get_tax_class();
    
    // Get the tax rate for the product's tax class (standard or custom)
    $tax_rate = WC_Tax::get_rates( $tax_class );

    // If there are rates, get the first one and display its tax name
    if ( ! empty( $tax_rate ) ) {
        // Get the tax name from the tax rate
        $tax_name = reset( $tax_rate ); // Get the first tax rate if there are multiple

        if ( isset( $tax_name['label'] ) ) {
            $tax_name_label = $tax_name['label']; // Tax name like 'TVA 7%' or 'Standard rate'
        } else {
            // Default to tax class if no label is set
            $tax_name_label = ucfirst( str_replace( '-', ' ', $tax_class ) );
        }

        // Add the tax name below the price in a new span element
        $product_price .= ' <span class="tax-class-name"><br>(' . $tax_name_label . ')</span>';
    }

    return $product_price;
}
add_filter( 'woocommerce_cart_item_price', 'add_tax_name_to_cart_price', 10, 3 );

// Add a custom column to the WooCommerce Products table for Tax Rate Percentage
function add_tax_rate_column_to_product_list( $columns ) {
    // Add a custom column before the 'SKU' column
    $columns['tax_rate'] = __( 'TVA', 'woocommerce' );
    return $columns;
}
add_filter( 'manage_edit-product_columns', 'add_tax_rate_column_to_product_list' );

// Populate the custom column with the tax rate percentage (e.g., 7%, 19%, etc.)
function display_tax_rate_in_product_list( $column, $post_id ) {
    if ( 'tax_rate' === $column ) {
        // Get the product's tax class
        $product = wc_get_product( $post_id );
        $tax_class = $product->get_tax_class();

        // Get the tax rate for the product's tax class (standard or custom)
        $tax_rates = WC_Tax::get_rates( $tax_class );

        // If the tax rates exist, get the first rate and display its percentage
        if ( ! empty( $tax_rates ) ) {
            $rate = reset( $tax_rates ); // Get the first tax rate in case there are multiple
            $rate_percentage = isset( $rate['rate'] ) ? $rate['rate'] : 0; // Get the rate percentage
            echo $rate_percentage . '%'; // Display the rate as a percentage
        } else {
            // If no tax rate is set, display 'No Tax' or something else
            echo 'No Tax';
        }
    }
}
add_action( 'manage_product_posts_custom_column', 'display_tax_rate_in_product_list', 10, 2 );


// Tax Exemption Checkbox Logic
add_action('wp_footer', function() {
    if (is_checkout()) { // Only run on checkout page
        ?>
        <script>
        document.addEventListener("DOMContentLoaded", function() {
            // Select the checkboxes
            let checkbox1 = document.querySelector("#tax_exempt"); // First checkbox
            let checkbox2 = document.querySelector("#tefw_exempt"); // Second checkbox
            
            if (checkbox1 && checkbox2) {
                console.log("Checkboxes found successfully!");

                // Hide the entire label of the second checkbox
                let checkbox2Label = checkbox2.closest("label");
                if (checkbox2Label) {
                    checkbox2Label.style.display = "none";
                    console.log("Second checkbox hidden.");
                } else {
                    console.warn("Couldn't find the label for checkbox2!");
                }

                // Copy classes and attributes from checkbox2 to checkbox1
                checkbox1.className = checkbox2.className; // Copy classes
                checkbox1.id = checkbox2.id; // Copy ID
                checkbox1.name = checkbox2.name; // Copy name attribute
                checkbox1.setAttribute('data-gtm-form-interact-field-id', checkbox2.getAttribute('data-gtm-form-interact-field-id')); // Copy data attribute

                console.log("Copied classes & attributes from second checkbox to first!");

                // Sync the second checkbox when the first one is clicked
                checkbox1.addEventListener("change", function() {
                    checkbox2.checked = checkbox1.checked;
                    console.log("Second checkbox state updated:", checkbox2.checked);
                });

            } else {
                console.error("One or both checkboxes not found! Check the field IDs.");
            }
        });
        </script>
        <?php
    }
});


// Save the checkbox value to the order meta
add_action('woocommerce_checkout_update_order_meta', function($order_id) {
    if (!empty($_POST['tax_exempt'])) { // Check if checkbox was selected
        update_post_meta($order_id, 'tax_exempt', 'Oui');
    } else {
        update_post_meta($order_id, 'tax_exempt', 'Non');
    }
});

// Show tax exemption in the WooCommerce admin order details
add_action('woocommerce_admin_order_data_after_billing_address', function($order) {
    $tax_exempt = get_post_meta($order->get_id(), 'tax_exempt', true);
    echo '<p><strong>Exonération de TVA:</strong> ' . esc_html($tax_exempt) . '</p>';
});



/* Display a text if Price Zero or Empty - WooCommerce Single Product */
add_filter( 'woocommerce_get_price_html', 'zahmoul_price_free_zero_empty', 9999, 2 );
function zahmoul_price_free_zero_empty( $price, $product ){
if ( '' === $product->get_price() || 0 == $product->get_price() ) {
$price = '<span style="color:red;" class="woocommerce-Price-amount amount">PRIX : SUR DEMANDE</span>';
}
return $price;
}


// round up price 50franc
add_filter( 'raw_woocommerce_price', 'round_up_raw_woocommerce_price' );
function round_up_raw_woocommerce_price( $price ) {
    // Define the precision (e.g., 0.05 or 0.1)
    $precision = 0.05; 

    // Round up to the nearest precision
    $price = ceil($price / $precision) * $precision;

    return $price;
}


// Add a fixed 1 TND fee to every WooCommerce order
add_action('woocommerce_cart_calculate_fees', 'add_fixed_fee_to_order');

function add_fixed_fee_to_order() {
    // Check if WooCommerce is active
    if (is_admin() && !defined('DOING_AJAX')) {
        return;
    }

    // Add a fixed fee of 1 TND to the cart
    WC()->cart->add_fee('Timbre', 1, false);
}


// 1. Add a custom column for Orders to the Users page
function add_orders_column_to_users($columns) {
    $columns['user_orders'] = 'Orders';
    return $columns;
}
add_filter('manage_users_columns', 'add_orders_column_to_users');

// 2. Populate the Orders column with the number of orders and link to the specific user's orders page
function show_user_orders_count($value, $column_name, $user_id) {
    if ('user_orders' === $column_name) {
        $order_count = wc_get_customer_order_count($user_id); // Get the user's order count
        if ($order_count > 0) {
            // Generate the link to WooCommerce orders filtered by user ID
            $orders_url = admin_url("edit.php?post_type=shop_order&_customer_user=$user_id");
            return '<a href="' . esc_url($orders_url) . '">' . esc_html($order_count) . '</a>';
        } else {
            return ' '; // Display "0" if no orders
        }
    }
    return $value;
}
add_action('manage_users_custom_column', 'show_user_orders_count', 10, 3);


// Add a VAT Number field below the Company Name field in WooCommerce checkout
add_filter('woocommerce_checkout_fields', 'add_vat_number_field_to_checkout');

function add_vat_number_field_to_checkout($fields) {
    // Define the VAT number field
    $fields['billing']['billing_vat_number'] = array(
        'type'        => 'text',
        'label'       => __('Matricule fiscal', 'woocommerce'),
        'placeholder' => _x('Matricule fiscal', 'placeholder', 'woocommerce'),
        'required'    => false, // Set to false to make it optional
        'class'       => array('form-row-wide'), // Adjusts the layout
        'priority'    => 26, // Position beneath Company Name field
    );

    return $fields;
}


// Add VAT Number to the list of editable billing fields in the order edit page
add_filter('woocommerce_admin_billing_fields', 'add_vat_number_to_admin_billing_fields');

function add_vat_number_to_admin_billing_fields($billing_fields) {
    // Add VAT Number field right after the Company Name field
    $billing_fields['vat_number'] = array(
        'label' => __('Matricule fiscal', 'woocommerce'),
        'show'  => true, // Make sure the field is visible
    );

    return $billing_fields;
}


// Save the VAT Number field along with other billing information
add_action('woocommerce_process_shop_order_meta', 'save_vat_number_with_billing_info');

function save_vat_number_with_billing_info($order_id) {
    if (isset($_POST['_billing_vat_number'])) {
        // Update the VAT Number in the order meta
        update_post_meta($order_id, '_billing_vat_number', sanitize_text_field($_POST['_billing_vat_number']));
    }
}


// Display VAT Number in order emails and order details
add_filter('woocommerce_order_formatted_billing_address', 'add_vat_number_to_billing_address', 10, 2);

function add_vat_number_to_billing_address($address, $order) {
    $vat_number = $order->get_meta('_billing_vat_number');
    if ($vat_number) {
        $address['vat_number'] = __('Matricule fiscal:', 'woocommerce') . ' ' . $vat_number;
    }

    return $address;
}

// Hook into WooCommerce emails to display VAT number in customer and admin emails
add_action('woocommerce_email_customer_details', 'add_vat_number_to_emails', 25, 4);

function add_vat_number_to_emails($order, $sent_to_admin, $plain_text, $email) {
    // Get the VAT number from the order meta
    $vat_number = get_post_meta($order->get_id(), '_billing_vat_number', true);
    
    // Check if VAT number is present
    if ($vat_number) {
        // Display VAT number in the email content
        if ($plain_text) {
            echo "\nMatricule fiscal: " . $vat_number . "\n";
        } else {
            echo '<p><strong>Matricule fiscal:</strong> ' . esc_html($vat_number) . '</p>';
        }
    }
}


// Apply coupon if the 'cadeau_remise' parameter is present in the URL
add_action('init', 'apply_coupon_via_url');
function apply_coupon_via_url() {
    if (isset($_GET['cadeau_remise']) && !WC()->cart->has_discount($_GET['cadeau_remise'])) {
        WC()->cart->apply_coupon(sanitize_text_field($_GET['cadeau_remise']));
    }
}

// Handle AJAX coupon application (for maintaining persistence with localStorage)
add_action('wp_ajax_apply_coupon', 'apply_coupon_via_ajax');
add_action('wp_ajax_nopriv_apply_coupon', 'apply_coupon_via_ajax');

function apply_coupon_via_ajax() {
    if ( isset($_POST['coupon_code']) && ! empty($_POST['coupon_code']) ) {
        $coupon_code = sanitize_text_field( $_POST['coupon_code'] );
        
        // Check if the coupon is already applied to avoid duplicates
        if ( ! WC()->cart->has_discount( $coupon_code ) ) {
            $result = WC()->cart->apply_coupon( $coupon_code );
            
            if ( $result ) {
                wp_send_json_success('Coupon appliqué avec succès');
            } else {
                wp_send_json_error("Le coupon n'a pas été appliqué");
            }
        } else {
            wp_send_json_success('Le coupon est déjà appliqué');
        }
    } else {
        wp_send_json_error("Aucun code de réduction n'a été fourni");
    }
    wp_die();
}

// Change the WordPress login logo
function custom_login_logo() { 
    echo '<style type="text/css"> 
        #login h1 a { 
            background-image: url(https://klarrion.com/wp-content/uploads/2021/04/logo@4x.webp) !important; 
            background-size: contain; 
            width: 100%; 
            height: 80px; 
            z-index: 2; /* Bring the logo above the overlay */
            position: relative; /* Ensure proper stacking order */
        } 
    </style>';
}
add_action('login_head', 'custom_login_logo');

// Change the login logo URL
function custom_login_logo_url() {
    return home_url();
}
add_filter('login_headerurl', 'custom_login_logo_url');

// Custom styles for the WordPress login page, including hiding the language switcher
function custom_login_styles() {
    echo '<style type="text/css">
        /* Hide the language dropdown */
        .login .language-switcher {
            display: none !important;
        }

        /* Background image */
        body.login {
            background-image: url(https://klarrion.com/wp-content/uploads/2024/11/white-friday@2x.png);
            background-size: cover;
            background-repeat: no-repeat;
            position: relative;
        }

        /* Semi-transparent black overlay */
        body.login::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.8); /* Black overlay with 0.8 opacity */
            z-index: 1; /* Make sure its between the background and other content */
        }

        /* Ensure login content is above the overlay */
        #login {
            position: relative;
            z-index: 2; /* Place above the overlay */
        }

        /* Customizing the login form */
        .login #loginform {
            background: #ffffff;
            padding: 20px;
            border-radius: 8px;
            position: relative;
            z-index: 2; /* Place above the overlay */
        }

        /* Customize the links */
        .login #nav a,
        .login #backtoblog a {
            color: #ffffff !important; /* White links */
            position: relative;
            z-index: 2; /* Place above the overlay */
        }

        /* Customize other texts */
        .login label {
            color: #1D7EAA !important; /* Custom color for labels */
            position: relative;
            z-index: 2; /* Place above the overlay */
        }

        /* Customize the login button */
        .wp-core-ui .button-primary {
            background-color: #3498db;
            border-color: #2980b9;
            box-shadow: none;
            position: relative;
            z-index: 2; /* Place above the overlay */
        }

        /* Button hover effect */
        .wp-core-ui .button-primary:hover {
            background-color: #005177;
        }
    </style>';
}
add_action('login_head', 'custom_login_styles');

// Allow editing of WooCommerce orders regardless of status
add_filter('wc_order_is_editable', 'always_allow_editing_orders', 10, 2);

function always_allow_editing_orders($is_editable, $order) {
    // Allow editing for any order status
    return true;
}

// Display custom image for each specific shipping method instance
add_filter( 'woocommerce_cart_shipping_method_full_label', 'add_image_to_specific_shipping_methods', 10, 2 );

function add_image_to_specific_shipping_methods( $label, $method ) {
    // Define images for each shipping method by instance ID
    $shipping_images = array(
        10 => 'https://klarrion.com/wp-content/uploads/2024/11/first.webp',   // Instance ID 10 - FIRST DELIVERY
        11 => 'https://klarrion.com/wp-content/uploads/2024/11/djerba.webp',   // Instance ID 11 - DJERBA TRANSPORT
        16 => 'https://klarrion.com/wp-content/uploads/2024/11/aramex.webp',   // Instance ID 12 - ARAMEX
        5 => 'https://klarrion.com/wp-content/uploads/2024/11/klarrion.webp', // Instance ID 5 - SHOWROOM
        14 => 'https://klarrion.com/wp-content/uploads/2024/11/tps.png',      // Instance ID 14 - TPS
        // Add more instance IDs and their corresponding image URLs as needed
    );

    // Get the shipping method instance ID
    $instance_id = $method->get_instance_id();

    // Check if the method has a defined image, and add the image before the label
    if ( isset( $shipping_images[ $instance_id ] ) ) {
        $image = '<img src="' . esc_url( $shipping_images[ $instance_id ] ) . '" alt="' . esc_attr( $label ) . '" style="width: 20px; margin-right: 10px; vertical-align: middle;">';
        $label = $image . $label;
    }

    return $label;
}

add_action( 'woocommerce_after_shipping_rate', 'zahmoulovski_shipping_rate_description' );

function zahmoulovski_shipping_rate_description( $method ) {
    // List of instance IDs for which you want to display a description
    $target_instance_ids = array( 5, 10, 11, 14, 16 );

    // Get the current shipping method's instance ID
    $instance_id = $method->get_instance_id();

    // Check if the current instance ID is in the target list
    if ( in_array( $instance_id, $target_instance_ids ) ) {
        // Add your custom message based on the instance ID
        switch ( $instance_id ) {
            case 5:
                echo '<p>Retrait en <a href="https://maps.app.goo.gl/Ve1KznAC36GBDhAf6" target="_blank"> Showroom</a>, paiement sur place.</p>';
                break;
            case 10:
                echo '<p>Livraison 2-3 jours ouvrables selon la disponibilité des produits, Paiement uniquement en <strong>espèces</strong>.</p>';
                break;
            case 11:
                echo '<p>Livraison 2-3 jours ouvrables selon la disponibilité des produits, Paiement en <strong>chèques et espèces</strong>.</p>';
                break;
            case 14:
                echo '<p>Livraison 2-3 jours ouvrables selon la disponibilité des produits, Paiement en <strong>chèques et espèces</strong>.</p>';
                break;
            case 16:
    			// Calculate the total weight of all products in the cart
   				 $total_weight = 0;
    				foreach ( WC()->cart->get_cart() as $cart_item ) {
        				$product_weight = $cart_item['data']->get_weight(); // Product weight in kg
        				$quantity = $cart_item['quantity']; // Quantity of the product
        				$total_weight += $product_weight * $quantity; // Add to total weight
    				}

    				// Display the shipping message with the total weight in red
    				echo '<p>Livraison 2-3 jours ouvrables selon la disponibilité des produits. Paiement en espèces et chèques. Suivi disponible via Aramex.<br> <strong>Total poids de la commande : <span style="color:red;">' . number_format($total_weight, 2) . ' kg</span></strong></p>';
    				break;
        		}
 		   }
}


add_filter( 'woocommerce_cart_shipping_method_full_label', 'replace_shipping_cost_for_instance', 10, 2 );

function replace_shipping_cost_for_instance( $label, $method ) {
    // Target the specific instance ID
    $target_instance_id = 15; // Replace with the instance ID you want to target
    
    // Define the custom text to display
    $custom_text = 'Les frais de livraison seront définis après la validation de votre commande';
    
    // Check if the current method instance matches the target
    if ( intval( $method->instance_id ) === $target_instance_id ) {
        // Replace the label's cost with the custom text
        $label = $method->get_label() . ' - ' . $custom_text;
    }

    return $label;
}

// Adding multiple WooCommerce products to the cart using a URL

add_action('wp', function() {
    if (isset($_GET['add-to-cart'])) {
        // Split the product IDs by commas
        $product_ids = explode(',', sanitize_text_field($_GET['add-to-cart']));
        
        // Check if the array of IDs is valid
        if (!empty($product_ids)) {
            foreach ($product_ids as $product_id) {
                // Add each product ID to the cart
                WC()->cart->add_to_cart((int)$product_id);
            }
            
            // Redirect to the cart page after adding all items
            wp_safe_redirect(wc_get_cart_url());
            exit;
        }
    }
});


/*
function add_weight_to_cart( $product_name, $cart_item, $cart_item_key ) {
    // Get the product weight (in kg) and quantity
    $product_weight = $cart_item['data']->get_weight(); // Get the weight of the product
    $quantity = $cart_item['quantity']; // Get the quantity of the product

    // Check if the product has a valid weight
    if ( $product_weight > 0 ) {
        // Calculate the total weight for this product
        $total_weight = $product_weight * $quantity;

        // Format the weight calculation: "pH-mètre LUT PH-211<br>(0.6KG * Qté 19 = 11.4KG)"
        $weight_display = '<br>(' . number_format($product_weight, 1) . 'KG * Qté ' . $quantity . ' = ' . number_format($total_weight, 1) . 'KG)';

        // Add the weight calculation next to the product name with a line break
        $product_name .= ' <span class="total-weight">' . $weight_display . '</span>';
    }

    return $product_name;
}
add_filter( 'woocommerce_cart_item_name', 'add_weight_to_cart', 10, 3 );

*/



// Allow payments for orders in 'pending payment', 'processing', and 'on-hold' statuses
function allow_payment_for_selected_statuses($valid, $order) {
    // Define the allowed statuses for payment
    $allowed_statuses = ['pending', 'processing', 'on-hold'];

    // Check if the order status is in the allowed statuses
    if (in_array($order->get_status(), $allowed_statuses)) {
        return true; // Allow payment
    }

    // Otherwise, use default validation
    return $valid;
}
add_filter('woocommerce_valid_order_statuses_for_payment', function($statuses, $order) {
    // Define statuses where payment should be allowed
    $allowed_statuses = ['pending', 'processing', 'on-hold'];

    // Merge allowed statuses with existing statuses
    return array_merge($statuses, $allowed_statuses);
}, 10, 2);

// Customize the order validation to ensure payment is allowed
add_filter('woocommerce_order_has_status', 'allow_payment_for_selected_statuses', 10, 2);


// Function to handle the custom endpoint '/pay/{order_id}'.
function handle_custom_pay_endpoint() {
    // Register custom endpoint.
    add_rewrite_rule('^pay/([0-9]+)/?', 'index.php?pay_order_id=$matches[1]', 'top');

    // Ensure the custom query variable 'pay_order_id' is recognized.
    add_filter('query_vars', function($vars) {
        $vars[] = 'pay_order_id';
        return $vars;
    });

    // Redirect the customer to the correct payment page.
    add_action('template_redirect', function() {
        // Check if we're on the 'pay/{order_id}' page.
        if (get_query_var('pay_order_id')) {
            $order_id = get_query_var('pay_order_id');
            $order = wc_get_order($order_id);

            // If the order doesn't exist, show a 404 page.
            if (!$order) {
                wp_die('Order not found.');
            }

            // Check if the order status is 'Completed'.
            if ('completed' === $order->get_status()) {
                wp_die('Cette commande a déjà été effectuée et ne peut être payée à nouveau.');
            }

            // Ensure the order is in a valid state for payment (not completed).
            $valid_statuses = ['pending', 'processing', 'on-hold']; // Allow these statuses for payment.

            if (!in_array($order->get_status(), $valid_statuses)) {
                wp_die("Cette commande n'est pas éligible au paiement. Veuillez contacter le service d'assistance si vous avez besoin d'aide.");
            }

            // Get the order key.
            $order_key = $order->get_order_key();

            // Build the URL to redirect to.
            $payment_url = home_url("/validation-commande/commande-paiement/{$order_id}/?pay_for_order=true&key={$order_key}");

            // Redirect to the payment URL.
            wp_redirect($payment_url);
            exit;
        }
    });
}

// Add the function to initialize the custom endpoint and behavior.
add_action('init', 'handle_custom_pay_endpoint');


// Add a new column to the products table
add_filter('manage_edit-product_columns', 'add_last_modified_column');
function add_last_modified_column($columns) {
    $columns['last_modified'] = __('Last Modified', 'woocommerce');
    return $columns;
}

// Populate the column with the last modified date
add_action('manage_product_posts_custom_column', 'populate_last_modified_column', 10, 2);
function populate_last_modified_column($column, $post_id) {
    if ($column == 'last_modified') {
        $last_modified = get_post_modified_time('Y-m-d H:i:s', true, $post_id);
        echo esc_html($last_modified);
    }
}

// Make the column sortable
add_filter('manage_edit-product_sortable_columns', 'make_last_modified_column_sortable');
function make_last_modified_column_sortable($columns) {
    $columns['last_modified'] = 'last_modified';
    return $columns;
}

// Handle the sorting of the column
add_action('pre_get_posts', 'sort_by_last_modified_column');
function sort_by_last_modified_column($query) {
    if (!is_admin() || !$query->is_main_query() || $query->get('post_type') !== 'product') {
        return;
    }

    $orderby = $query->get('orderby');
    if ($orderby === 'last_modified') {
        $query->set('orderby', 'modified');
    }
}


// Add a custom cross-sell tab for products
function add_cross_sell_tab($tabs) {
    global $product;

    // Get cross-sell products for the current product
    $cross_sells = $product->get_cross_sell_ids();

    // If there are cross-sells, add the custom tab
    if (!empty($cross_sells)) {
        $tabs['cross_sell_tab'] = array(
            'title'    => __('Environnement conseillé/nécessaire:', 'your-text-domain'),
            'priority' => 50, // Adjust the priority to control where it appears in the tabs
            'callback' => 'display_cross_sell_tab_content'
        );
    }

    return $tabs;
}
add_filter('woocommerce_product_tabs', 'add_cross_sell_tab');

// Display cross-sells in the custom tab
function display_cross_sell_tab_content() {
    global $product;

    // Get cross-sell products for the current product
    $cross_sells = $product->get_cross_sell_ids();

    // Check if there are any cross-sells
    if (!empty($cross_sells)) {
        echo '<div class="woocommerce columns-4">';
        echo '<ul class="products">'; // Start the WooCommerce product grid

        $count = 0;
        foreach ($cross_sells as $cross_sell_id) {
            $post_object = get_post($cross_sell_id);
            setup_postdata($GLOBALS['post'] =& $post_object);

            // Add a class for every 4th item to start a new row
            $classes = 'product';
            if ($count % 4 === 0) {
                $classes .= ' first';
            }

            echo '<li class="' . esc_attr($classes) . '">';
            wc_get_template_part('content', 'product'); // WooCommerce default template
            echo '</li>';

            $count++;
        }

        wp_reset_postdata();
        echo '</ul>';
        echo '</div>';
    } else {
        echo '<p>' . __("Aucun produit recommandé n'est disponible.", 'your-text-domain') . '</p>';
    }
}

/*
// Invoices test code 

add_action('woocommerce_order_details_after_order_table', 'display_invoice_in_order_details');
add_action('woocommerce_admin_order_data_after_order_details', 'display_invoice_in_admin');
add_filter('woocommerce_my_account_my_orders_actions', 'add_invoice_button_to_my_orders', 10, 2);

function display_invoice_in_order_details($order) {
    $order_id = $order->get_id();
    $invoice_path = '/wp-content/uploads/invoices/' . $order_id . '-facture-2025.pdf';
    $invoice_url = site_url($invoice_path);

    if (file_exists(ABSPATH . $invoice_path)) {
        echo '<p><strong>Télécharger la facture:</strong> <a href="' . esc_url($invoice_url) . '" target="_blank">Télécharger</a></p>';
    } else {
        echo '<p><strong>Facture:</strong> Pas encore disponible.</p>';
    }
}

function display_invoice_in_admin($order) {
    $order_id = $order->get_id();
    $invoice_path = '/wp-content/uploads/invoices/' . $order_id . '-facture-2025.pdf';
    $invoice_url = site_url($invoice_path);

    if (file_exists(ABSPATH . $invoice_path)) {
        echo '<p><strong>Facture:</strong> <a href="' . esc_url($invoice_url) . '" target="_blank">Télécharger la facture</a></p>';
    } else {
        echo '<p><strong>Facture:</strong> Not uploaded yet.</p>';
    }
}

function add_invoice_button_to_my_orders($actions, $order) {
    $order_id = $order->get_id();
    $invoice_path = '/wp-content/uploads/invoices/' . $order_id . '-facture-2025.pdf';
    $invoice_url = site_url($invoice_path);

    // Check if the invoice file exists
    if (file_exists(ABSPATH . $invoice_path)) {
        $actions['invoice'] = [
            'url'  => esc_url($invoice_url),
            'name' => __('Facture', 'woocommerce'),
        ];
    }

    return $actions;
}

*/


// trigger for add to cart - qty + redirection to product page via url using SKU
// https://klarrion.com/?produit=KL_766888&add-to-cart=KL_766888&qty=2

// Add product to cart with SKU and quantity
add_action('wp_loaded', function() {
    if ( isset( $_GET['add-to-cart'] ) && !is_numeric( $_GET['add-to-cart'] ) ) {
        $sku = sanitize_text_field( $_GET['add-to-cart'] );
        $quantity = isset( $_GET['qty'] ) ? intval( $_GET['qty'] ) : 1; // Default to 1 if qty is not set
        $product_id = wc_get_product_id_by_sku( $sku );

        // If the product exists, add it to the cart with the specified quantity
        if ( $product_id ) {
            // Check if the product is already in the cart
            $found = false;
            foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
                if ( $cart_item['product_id'] == $product_id ) {
                    // Product already in the cart, increase the quantity
                    WC()->cart->set_quantity( $cart_item_key, $cart_item['quantity'] + $quantity );
                    $found = true;
                    break;
                }
            }
            // If not found, add a new item to the cart
            if ( !$found ) {
                WC()->cart->add_to_cart( $product_id, $quantity );
            }

            // After adding the product, force a redirect to the product page
            wp_redirect( get_permalink( $product_id ) );
            exit;
        }
    }
});

// Redirect to product via SKU
function redirect_to_product_by_sku() {
    if ( isset( $_GET['produit'] ) ) {
        $sku = sanitize_text_field( $_GET['produit'] );
        
        // Query the product by SKU
        $product_id = wc_get_product_id_by_sku( $sku );
        
        // If the product exists, redirect to the product page
        if ( $product_id ) {
            wp_redirect( get_permalink( $product_id ) );
            exit;
        }
    }
}
add_action( 'template_redirect', 'redirect_to_product_by_sku' );


// get product via url using API based on sku

function get_product_by_sku_from_website_a( $sku ) {
    $url = 'https://klarrion.com/wp-json/wc/v3/products?sku=' . $sku; // Website A URL
    $consumer_key = 'ck_bf386ac582f3cfe66badbb32fc5fa466cf6c7467'; // API consumer key for Website A
    $consumer_secret = 'cs_2089fc890395248b1acce1f02a526bc8d12caee4'; // API consumer secret for Website A

    $response = wp_remote_get( $url, array(
        'headers' => array(
            'Authorization' => 'Basic ' . base64_encode( $consumer_key . ':' . $consumer_secret )
        )
    ));

    if ( is_wp_error( $response ) ) {
        return false;
    }

    $products = json_decode( wp_remote_retrieve_body( $response ), true );
    
    // If product found, return required fields
    if ( !empty( $products ) ) {
        $product = $products[0]; // Assuming SKU is unique
        return array(
            'price'         => $product['price'],
            'sale_price'    => $product['sale_price'],
            'stock'         => $product['stock_quantity'],
            'stock_status'  => $product['stock_status']
        );
    }

    return false;
}

// ref next to the product's title 
// 
function custom_display_sku_above_title() {
    global $product;
    
    // Display SKU above product title
    echo '<p class="custom-product-sku">Réf: ' . esc_html( $product->get_sku() ) . '</p>';
    
    // Add inline CSS to style the SKU
    echo '
    <style>
        .custom-product-sku {
            font-size: 1em; /* Slightly smaller font size */
            color: inherit; /* Same color as the product title */
            margin-bottom: 0px; /* Spacing between SKU and product title */
        }
    </style>
    ';
}

// Hook to display SKU above the product title
add_action( 'woocommerce_single_product_summary', 'custom_display_sku_above_title', 5 );


// Add a Checkbox in Product Edit Page
add_action('woocommerce_product_options_pricing', function () {
    woocommerce_wp_text_input([
        'id'          => '_min_qty',
        'label'       => __('Minimum Quantity', 'woocommerce'),
        'desc_tip'    => true,
        'description' => __('Set the minimum quantity for this product.', 'woocommerce'),
        'type'        => 'number',
        
    ]);

    woocommerce_wp_checkbox([
        'id'          => '_fixed_multiple_qty',
        'label'       => __('Force Multiples of Minimum Quantity', 'woocommerce'),
        'description' => __('If checked, users can only order in multiples of the minimum quantity (e.g., 10, 20, 30).', 'woocommerce'),
    ]);
});

// Save Checkbox Value
add_action('woocommerce_admin_process_product_object', function ($product) {
    if (isset($_POST['_min_qty'])) {
        $product->update_meta_data('_min_qty', absint($_POST['_min_qty']));
    }

    $fixed_multiple = isset($_POST['_fixed_multiple_qty']) ? 'yes' : 'no';
    $product->update_meta_data('_fixed_multiple_qty', $fixed_multiple);
});

// Enforce Multiples in Cart Validation
add_filter('woocommerce_add_to_cart_validation', function ($passed, $product_id, $quantity) {
    $min_qty = get_post_meta($product_id, '_min_qty', true);
    $fixed_multiple = get_post_meta($product_id, '_fixed_multiple_qty', true) === 'yes';

    if ($min_qty) {
        if ($quantity < $min_qty) {
            wc_add_notice(sprintf(__('Vous devez ajouter au moins %d de ce produit.', 'woocommerce'), $min_qty), 'error');
            return false;
        }

        if ($fixed_multiple && $quantity % $min_qty !== 0) {
            wc_add_notice(sprintf(__('Veuillez ajouter une quantité multiple de %d.', 'woocommerce'), $min_qty), 'error');
            return false;
        }
    }

    return $passed;
}, 10, 3);

// Adjust Quantity in Cart to Match Multiples
add_filter('woocommerce_cart_item_quantity', function ($product_quantity, $cart_item_key, $cart_item) {
    $min_qty = get_post_meta($cart_item['product_id'], '_min_qty', true);
    $fixed_multiple = get_post_meta($cart_item['product_id'], '_fixed_multiple_qty', true) === 'yes';

    if ($min_qty) {
        $new_qty = max($min_qty, $cart_item['quantity']);

        if ($fixed_multiple) {
            $new_qty = ceil($new_qty / $min_qty) * $min_qty;
        }

        if ($cart_item['quantity'] !== $new_qty) {
            WC()->cart->set_quantity($cart_item_key, $new_qty);
        }
    }

    return $product_quantity;
}, 10, 3);

// Set Quantity Input Rules on Product Page

add_filter('woocommerce_quantity_input_args', function ($args, $product) {
    $min_qty = get_post_meta($product->get_id(), '_min_qty', true);
    $fixed_multiple = get_post_meta($product->get_id(), '_fixed_multiple_qty', true) === 'yes';

    if (!empty($min_qty) && $min_qty > 0) {
        $args['min_value'] = $min_qty; // Set minimum value

        if ($fixed_multiple) {
            $args['step'] = $min_qty; // Force step to multiples of min_qty
        }

        // Ensure the input starts with a valid quantity
        $args['input_value'] = $min_qty; 
    }

    return $args;
}, 10, 2);

// Update the Notice Message
add_action('woocommerce_before_add_to_cart_quantity', function () {
    global $product;
    $min_qty = get_post_meta($product->get_id(), '_min_qty', true);
    $fixed_multiple = get_post_meta($product->get_id(), '_fixed_multiple_qty', true) === 'yes';

    if (!empty($min_qty) && $min_qty > 0) {
        echo '<span class="min-qty-notice" style="display:block; margin-top:5px; font-size:14px; color:#ff0000;">' 
            . sprintf(__('La quantité minimale à commander est de %d', 'woocommerce'), $min_qty) 
            . '</span>';

        if ($fixed_multiple) {
            echo '<span class="fixed-multiple-notice" style="display:block; font-size:14px; color:#ff0000;">' 
                . sprintf(__('La commande se fera par lot de %d.', 'woocommerce'), $min_qty) 
                . '</span>';
        }
    }
});




// Show stock quantity only if it's 10 or less, next to quantity input field
function custom_show_low_stock_message() {
    global $product;

    if (!$product || !$product->is_in_stock()) {
        return;
    }

    $stock_quantity = $product->get_stock_quantity();

    // Show the stock message only if stock is less than or equal to 10
    if ($stock_quantity !== null && $stock_quantity > 0 && $stock_quantity <= 10) {
        echo '<span class="custom-stock-message" style="color: red; margin-left: 10px;">Seulement ' . esc_html($stock_quantity) . ' en stock !</span>';
    }
}

// Add stock message next to quantity input
add_action('woocommerce_after_quantity_input_field', 'custom_show_low_stock_message');




// shipping rates for "pharmacy" shipping class only
add_filter('woocommerce_package_rates', 'custom_shipping_cost_per_pharmacy_package', 10, 2);
function custom_shipping_cost_per_pharmacy_package($rates, $package) {
    $target_shipping_methods = array('flat_rate:10', 'flat_rate:11', 'flat_rate:14'); // Targeted shipping method instance IDs
    $price_per_package = 15;
    $max_per_package = 2;

    // Track total quantity of pharmacy products
    $pharmacy_qty = 0;

    foreach ($package['contents'] as $item) {
        $product = $item['data'];

        // Check if the product's shipping class is "pharmacy"
        $shipping_class = $product->get_shipping_class();
        if ($shipping_class === 'pharmacy') {
            $pharmacy_qty += $item['quantity'];
        }
    }

    // If no pharmacy items, return default rates
    if ($pharmacy_qty === 0) {
        return $rates;
    }

    // Calculate the number of packages and custom cost
    $num_packages = ceil($pharmacy_qty / $max_per_package);
    $custom_cost = $num_packages * $price_per_package;

    foreach ($rates as $rate_id => $rate) {
        if (in_array($rate_id, $target_shipping_methods)) {
            $rates[$rate_id]->cost = $custom_cost;
        }
    }

    return $rates;
}


// Disable wpForms database errors 
function disable_wpforms_license_tasks() {
    // Remove the scheduled WPForms license API cron jobs
    remove_action('wpforms_pro_license_api_plugin', 'wpforms()->license->schedule_check');
    remove_action('wpforms_pro_license_api_validate', 'wpforms()->license->schedule_check');

    // Prevent WPForms from registering these cron jobs in the future
    add_filter('pre_option_wpforms_license', '__return_empty_array');
}
add_action('init', 'disable_wpforms_license_tasks');

function remove_wpforms_cron_jobs() {
    wp_clear_scheduled_hook('wpforms-pro_license_api_plugin');
    wp_clear_scheduled_hook('wpforms-pro_license_api_validate');
}
add_action('wp_loaded', 'remove_wpforms_cron_jobs');

function block_wpforms_license_db_writes($query) {
    if (strpos($query, 'kl_wpforms_tasks_meta') !== false) {
        return ''; // Prevents WPForms from running the insert query
    }
    return $query;
}
add_filter('query', 'block_wpforms_license_db_writes');

add_filter('pre_option_wpforms_license', function() {
    return array('key' => 'valid', 'type' => 'pro');
});


// wpforms stop DB payment error 
add_filter( 'wpforms_payment_load', '__return_false' );




// Start session
add_action('init', function () {
    if (is_user_logged_in() && !session_id()) {
        session_start();
    }
});

// Track session entry and current page
add_action('template_redirect', function () {
    if (!is_user_logged_in()) return;

    $user_id = get_current_user_id();
    $current_page = get_the_title();

    if (empty($_SESSION['visit_start_time'])) {
        $_SESSION['visit_start_time'] = time();
        $_SESSION['entry_page'] = $current_page ?: 'Unknown Page';
    }

    // Always update last page (possible exit)
    $_SESSION['exit_page'] = $current_page ?: 'Unknown Page';
});

// Save session info on shutdown
add_action('shutdown', function () {
    if (!is_user_logged_in() || empty($_SESSION['visit_start_time'])) return;

    $user_id = get_current_user_id();
    $entry_time = $_SESSION['visit_start_time'];
    $exit_time = time();
    $duration = $exit_time - $entry_time;

    $entry_page = $_SESSION['entry_page'] ?? 'Unknown';
    $exit_page = $_SESSION['exit_page'] ?? 'Unknown';

    $log = [
        'entry_time' => $entry_time,
        'duration' => $duration,
        'entry_page' => $entry_page,
        'exit_page' => $exit_page,
    ];

    $history = get_user_meta($user_id, '_visit_history', true);
    if (!is_array($history)) $history = [];
    $history[] = $log;

    update_user_meta($user_id, '_visit_history', $history);

    // Clear session
    unset($_SESSION['visit_start_time'], $_SESSION['entry_page'], $_SESSION['exit_page']);
});

add_action('show_user_profile', 'show_visit_history_table');
add_action('edit_user_profile', 'show_visit_history_table');

function show_visit_history_table($user) {
    $history = get_user_meta($user->ID, '_visit_history', true);
    if (empty($history)) {
        echo "<h3>User Visit History</h3><p>No visits logged yet.</p>";
        return;
    }

    echo "<h3>User Visit History</h3><table class='widefat'><thead>
        <tr><th>Date</th><th>Total Duration</th><th>Entry Page</th><th>Exit Page</th></tr></thead><tbody>";

    foreach (array_reverse($history) as $visit) {
        echo "<tr>
            <td>" . date('Y-m-d H:i:s', $visit['entry_time']) . "</td>
            <td>" . gmdate("H:i:s", $visit['duration']) . "</td>
            <td>" . esc_html($visit['entry_page']) . "</td>
            <td>" . esc_html($visit['exit_page']) . "</td>
        </tr>";
    }

    echo "</tbody></table>";
}




// Update last active timestamp
add_action('init', function () {
    if (is_user_logged_in()) {
        update_user_meta(get_current_user_id(), '_last_active', time());
    }
});

// Add column to admin user list
add_filter('manage_users_columns', function($columns) {
    $columns['online_status'] = 'Online';
    return $columns;
});

add_filter('manage_users_custom_column', function($value, $column_name, $user_id) {
    if ($column_name === 'online_status') {
        $last_active = get_user_meta($user_id, '_last_active', true);
        if ($last_active && (time() - $last_active) <= 300) {
            // Green dot
            return '<span style="color:green;font-size:20px;">●</span>';
        } else {
            // Grey dot
            return '<span style="color:#ccc;font-size:20px;">●</span>';
        }
    }
    return $value;
}, 10, 3);



// Add filter dropdown
add_action('restrict_manage_users', function ($which) {
    if ($which !== 'top') return;

    $selected = $_GET['online_status'] ?? '';
    echo '<select name="online_status" style="margin-left:10px;">
            <option value="">All Users</option>
            <option value="online"' . selected($selected, 'online', false) . '>Online Users</option>
          </select>';
    submit_button(__('Filter'), '', 'filter_online_users', false);
});


add_action('wp_dashboard_setup', function () {
    wp_add_dashboard_widget(
        'online_users_widget',
        'Currently Online Users',
        'render_online_users_widget'
    );
});

function render_online_users_widget() {
    $users = get_users([
        'meta_key' => '_last_active',
        'meta_compare' => 'EXISTS',
        'fields' => ['ID', 'display_name']
    ]);

    $online_users = [];
    $now = time();

    foreach ($users as $user) {
        $last_active = get_user_meta($user->ID, '_last_active', true);
        if ($last_active && ($now - $last_active) <= 300) {
            $online_users[] = $user;
        }
    }

    if (empty($online_users)) {
        echo '<p>No users online.</p>';
        return;
    }

    echo '<ul>';
    foreach ($online_users as $user) {
        echo '<li>' . esc_html($user->display_name) . ' (ID: ' . $user->ID . ')</li>';
    }
    echo '</ul>';
}




// Filter the users query
add_filter('pre_get_users', function ($query) {
    if (!is_admin() || !$query->is_main_query()) return;

    if (isset($_GET['online_status']) && $_GET['online_status'] === 'online') {
        $online_user_ids = [];

        $users = get_users([
            'meta_key' => '_last_active',
            'meta_compare' => 'EXISTS',
            'fields' => ['ID']
        ]);

        $current_time = time();
        foreach ($users as $user) {
            $last_active = get_user_meta($user->ID, '_last_active', true);
            if ($last_active && ($current_time - $last_active) <= 300) {
                $online_user_ids[] = $user->ID;
            }
        }

        if (empty($online_user_ids)) {
            $online_user_ids = [0]; // Prevent showing all users
        }

        $query->set('include', $online_user_ids);
    }
});










// Apply 5% discount on product subtotal if wc_konnect_gateway is selected
add_action('woocommerce_cart_calculate_fees', function(WC_Cart $cart) {
    if (is_admin() && !defined('DOING_AJAX')) return;

    $chosen_gateway = WC()->session->get('chosen_payment_method');
    $discount_label = __('Remise sur le paiement en ligne (5%)', 'your-text-domain');

    // Only apply if konnect is selected
    if ($chosen_gateway === 'wc_konnect_gateway') {
        // Prevent duplicate application
        foreach ($cart->get_fees() as $fee) {
            if ($fee->name === $discount_label) {
                return;
            }
        }

        // Calculate 5% only on product subtotal (excluding shipping and other fees)
        $discount = $cart->get_subtotal() * 0.05;

        // Add a non-taxable negative fee (true discount)
        $cart->add_fee($discount_label, -$discount, false); // 'false' = no tax
    }
}, 20);



// Add promo message next to payment method label (frontend only)
add_filter('woocommerce_gateway_title', function($title, $gateway_id) {
    if (!is_admin() && $gateway_id === 'wc_konnect_gateway') {
        $title .= '<br><span style="color: #ff0000; font-weight: bold;">💸 Réduction instantanée de 5% si vous payez en ligne !</span>';
    }
    return $title;
}, 20, 2);


add_action('wp_footer', function() {
    if (is_checkout()) {
        ?>
        <script>
        jQuery(function($) {
            $('form.checkout').on('change', 'input[name="payment_method"]', function() {
                $('body').trigger('update_checkout');
            });
        });
        </script>
        <?php
    }
});
