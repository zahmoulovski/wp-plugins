<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit( 'restricted access' );
}

/*
 * This is a function that add admin menu
 */
if ( ! function_exists( 'wc_api_mps_add_admin_menu' ) ) {
    add_action( 'admin_menu', 'wc_api_mps_add_admin_menu', 1 );
    function wc_api_mps_add_admin_menu() {
        
        add_menu_page( esc_html__( 'WooCommerce API Product Sync', 'wc_api_mps' ), esc_html__( 'Product Sync', 'wc_api_mps' ), 'manage_options', 'wc_api_mps', 'wc_api_mps_callback', 'dashicons-update' );
        add_submenu_page( 'wc_api_mps', esc_html__( 'Product Sync - Stores', 'wc_api_mps' ), esc_html__( 'Stores', 'wc_api_mps' ), 'manage_options', 'wc_api_mps', 'wc_api_mps_callback' );
        add_submenu_page( 'wc_api_mps', esc_html__( 'Product Sync - API Error Logs', 'wc_api_mps' ), esc_html__( 'API Error Logs', 'wc_api_mps' ), 'manage_options', 'wc_api_mps_api_error_logs', 'wc_api_mps_api_error_logs_callback' );
        add_submenu_page( 'wc_api_mps', esc_html__( 'Product Sync - Bulk Sync', 'wc_api_mps' ), esc_html__( 'Bulk Sync', 'wc_api_mps' ), 'manage_options', 'wc_api_mps_bulk_sync', 'wc_api_mps_bulk_sync_callback' );
        add_submenu_page( 'wc_api_mps', esc_html__( 'Product Sync - Settings', 'wc_api_mps' ), esc_html__( 'Settings', 'wc_api_mps' ), 'manage_options', 'wc_api_mps_settings', 'wc_api_mps_settings_callback' );
    }
}

/*
 * This is a function that add and list stores.
 */
if ( ! function_exists( 'wc_api_mps_callback' ) ) {
    function wc_api_mps_callback() {
        
        $page_url = menu_page_url( 'wc_api_mps', 0 );
        
        if ( isset( $_POST['submit'] ) ) {
            $stores = get_option( 'wc_api_mps_stores' );
            if ( ! is_array( $stores ) ) {
                $stores = array();
            }
            
            $stores[$_POST['url']] = array(
                'consumer_key'                  => $_POST['consumer_key'],
                'consumer_secret'               => $_POST['consumer_secret'],
                'status'                        => 1,
                'exclude_categories_products'   => array(),
                'exclude_tags_products'         => array(),
                'exclude_meta_data'             => '',
                'exclude_term_description'      => 0,
                'price_adjustment'              => 0,
                'price_adjustment_type'         => '',
                'price_adjustment_operation'    => '',
                'price_adjustment_amount'       => '',
                'price_adjustment_amount_round' => 0,
            );
            
            $api = new WC_API_MPS( $_POST['url'], $_POST['consumer_key'], $_POST['consumer_secret'] );            
            $authentication = $api->authentication();
            if ( isset( $authentication->code ) ) {
                ?>
                    <div class="notice notice-error is-dismissible">
                        <p><?php esc_html_e( 'Authentication failure.', 'wc_api_mps' ); ?></p>
                    </div>
                <?php
            } else {
                update_option( 'wc_api_mps_stores', $stores );
                ?>
                    <div class="notice notice-success is-dismissible">
                        <p><?php esc_html_e( 'Store added successfully.', 'wc_api_mps' ); ?></p>
                    </div>
                <?php
            }
        } else if ( isset( $_POST['update'] ) ) {
            if ( ! isset( $_POST['exclude_categories_products'] ) ) {
                $_POST['exclude_categories_products'] = array();
            }
            
            if ( ! isset( $_POST['exclude_tags_products'] ) ) {
                $_POST['exclude_tags_products'] = array();
            }
            
            $stores = get_option( 'wc_api_mps_stores' );
            $stores[$_POST['url']] = array(
                'consumer_key'                  => $_POST['consumer_key'],
                'consumer_secret'               => $_POST['consumer_secret'],
                'status'                        => $_POST['status'],
                'exclude_categories_products'   => $_POST['exclude_categories_products'],
                'exclude_tags_products'         => $_POST['exclude_tags_products'],
                'exclude_meta_data'             => $_POST['exclude_meta_data'],
                'exclude_term_description'      => $_POST['exclude_term_description'],
                'price_adjustment'              => $_POST['price_adjustment'],
                'price_adjustment_type'         => $_POST['price_adjustment_type'],
                'price_adjustment_operation'    => $_POST['price_adjustment_operation'],
                'price_adjustment_amount'       => $_POST['price_adjustment_amount'],
                'price_adjustment_amount_round' => $_POST['price_adjustment_amount_round'],
            );
            
            $api = new WC_API_MPS( $_POST['url'], $_POST['consumer_key'], $_POST['consumer_secret'] );            
            $authentication = $api->authentication();
            if ( isset( $authentication->code ) ) {
                ?>
                    <div class="notice notice-error is-dismissible">
                        <p><?php esc_html_e( 'Authentication failure.', 'wc_api_mps' ); ?></p>
                    </div>
                <?php
            } else {
                update_option( 'wc_api_mps_stores', $stores );
                ?>
                    <div class="notice notice-success is-dismissible">
                        <p><?php esc_html_e( 'Store updated successfully.', 'wc_api_mps' ); ?></p>
                    </div>
                <?php
            }
        } else if ( isset( $_REQUEST['delete'] ) ) {
            $stores = get_option( 'wc_api_mps_stores' );
            unset( $stores[rawurldecode( $_REQUEST['delete'] )] );
            update_option( 'wc_api_mps_stores', $stores );
            ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php esc_html_e( 'Store removed successfully.', 'wc_api_mps' ); ?></p>
                </div>
            <?php
        } else {
            // nothing
        }
        ?>
            <div class="wrap">
                <h1><?php esc_html_e( 'Stores', 'wc_api_mps' ); ?></h1>
                <hr>
                <?php
                    $licence = get_option( 'wc_api_mps_licence' );
                    if ( $licence ) {
                        if ( isset( $_REQUEST['edit'] ) ) {
                            $product_sync_type = get_option( 'wc_api_mps_product_sync_type' );
                            if ( ! $product_sync_type ) {
                                $product_sync_type = 'full_product';
                            }
                            
                            $stores = get_option( 'wc_api_mps_stores' );
                            $store = $stores[rawurldecode( $_REQUEST['edit'] )];
                            $store['exclude_term_description'] = ( isset( $store['exclude_term_description'] ) ? $store['exclude_term_description'] : 0 );
                            ?>
                                <h2><?php esc_html_e( 'Edit store:', 'wc_api_mps' ); ?> <?php echo rawurldecode( $_REQUEST['edit'] ); ?></h2>                           
                                <form method="post" action="<?php echo $page_url; ?>">
                                    <table class="form-table">
                                        <tbody>
                                            <tr>
                                                <th scope="row"><label><?php esc_html_e( 'Status', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <input type="hidden" name="status" value="0" />
                                                    <input type="checkbox" name="status" value="1"<?php echo ( $store['status'] ? ' checked="checked"' : '' ); ?> />
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><label><?php esc_html_e( 'Consumer Key', 'wc_api_mps' ); ?> <span class="description">(required)</span></label></th>
                                                <td>
                                                    <input type="text" name="consumer_key" value="<?php echo $store['consumer_key']; ?>" class="regular-text code" required />
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><label><?php esc_html_e( 'Consumer Secret', 'wc_api_mps' ); ?> <span class="description">(required)</span></label></th>
                                                <td>
                                                    <input type="text" name="consumer_secret" value="<?php echo $store['consumer_secret']; ?>" class="regular-text code" required />
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type != 'full_product' ? 'display: none;' : '' ); ?>">
    <th scope="row"><label><?php esc_html_e( 'Exclude categories products', 'wc_api_mps' ); ?></label></th>
    <td>
        <?php
            $product_cat_args = array(
                'taxonomy'      => 'product_cat',
                
                'hierarchical'  => true,   // Include hierarchy
            );
            $categories = get_terms( $product_cat_args );
            $exclude_categories_products = ( isset( $store['exclude_categories_products'] ) ? $store['exclude_categories_products'] : array() );
            
            if ( $categories != null ) {
                $category_tree = array();
                foreach ( $categories as $category ) {
                    if ( $category->parent == 0 ) {
                        // Top-level category
                        $category_tree[$category->term_id] = $category;
                        $category_tree[$category->term_id]->children = array();
                    } else {
                        // Subcategory
                        if ( isset( $category_tree[$category->parent] ) ) {
                            // Ensure the parent exists in the tree
                            $category_tree[$category->parent]->children[] = $category;
                        }
                    }
                }
                
                // Recursive function to display categories and subcategories
                function display_categories( $categories, $exclude_categories_products, $prefix = '' ) {
                    foreach ( $categories as $category ) {
                        $checked = in_array( $category->term_id, $exclude_categories_products ) ? ' checked="checked"' : '';
                        echo '<label><input type="checkbox" name="exclude_categories_products[]" value="' . $category->term_id . '"' . $checked . ' /> ' . $prefix . $category->name . '</label><br>';
                        if ( ! empty( $category->children ) ) {
                            display_categories( $category->children, $exclude_categories_products, $prefix . '----' );
                        }
                    }
                }
                
                // Display the category tree
                display_categories( $category_tree, $exclude_categories_products );
            }
        ?>
    </td>
</tr>
                                            <tr style="<?php echo ( $product_sync_type != 'full_product' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Exclude tags products', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <?php
                                                        $product_tag_args = array(
                                                            'taxonomy'      => 'product_tag',
                                                            'hide_empty'    => true,
                                                        );
                                                        $tags = get_terms( $product_tag_args );
                                                        $exclude_tags_products = ( isset( $store['exclude_tags_products'] ) ? $store['exclude_tags_products'] : array() );
                                                        if ( $tags != null ) {
                                                            foreach ( $tags as $tag ) {
                                                                $checked = '';
                                                                if ( in_array( $tag->term_id, $exclude_tags_products ) ) {
                                                                    $checked = ' checked="checked"';
                                                                }
                                                                ?><label><input type="checkbox" name="exclude_tags_products[]" value="<?php echo $tag->term_id; ?>"<?php echo $checked; ?> /> <?php echo $tag->name; ?></label>&nbsp;&nbsp;&nbsp;&nbsp;<?php
                                                            }
                                                        }
                                                    ?>
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type != 'full_product' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Exclude Meta Data', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <input type="text" name="exclude_meta_data" value="<?php echo $store['exclude_meta_data']; ?>" class="regular-text code" />
                                                    <p class="description"><?php esc_html_e( 'Exclude product meta key by comma separated.', 'wc_api_mps' ); ?></p>
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type != 'full_product' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Exclude Term Description', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <input type="hidden" name="exclude_term_description" value="0" />
                                                    <input type="checkbox" name="exclude_term_description" value="1"<?php echo ( $store['exclude_term_description'] ? ' checked="checked"' : '' ); ?> />
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type == 'quantity' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Price Adjustment', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <input type="hidden" name="price_adjustment" value="0" />
                                                    <input type="checkbox" name="price_adjustment" value="1"<?php echo ( $store['price_adjustment'] ? ' checked="checked"' : '' ); ?> />
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type == 'quantity' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Price Adjustment Type', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <input type="hidden" name="price_adjustment_type" value="" />
                                                    <fieldset>
                                                        <label><input type="radio" name="price_adjustment_type" value="percentage"<?php echo ( $store['price_adjustment_type'] == 'percentage' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Percentage Amount', 'wc_api_mps' ); ?></label><br>
                                                        <label><input type="radio" name="price_adjustment_type" value="fixed"<?php echo ( $store['price_adjustment_type'] == 'fixed' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Fixed Amount', 'wc_api_mps' ); ?></label>
                                                    </fieldset>
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type == 'quantity' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Price Adjustment Amount', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <select name="price_adjustment_operation">
                                                    <?php
                                                        $operations = array(
                                                            'plus'  => '+',
                                                            'minus' => '-',
                                                        );

                                                        foreach ( $operations as $operation_key => $operation_label ) {
                                                            $selected = '';
                                                            if ( $store['price_adjustment_operation'] == $operation_key ) {
                                                                $selected = ' selected="selected"';
                                                            }
                                                            ?><option value="<?php echo $operation_key; ?>"<?php echo $selected; ?>><?php echo $operation_label; ?></option><?php
                                                        }
                                                    ?>
                                                    </select>
                                                    <input type="number" name="price_adjustment_amount" value="<?php echo $store['price_adjustment_amount']; ?>" step="any" />
                                                </td>
                                            </tr>
                                            <tr style="<?php echo ( $product_sync_type == 'quantity' ? 'display: none;' : '' ); ?>">
                                                <th scope="row"><label><?php esc_html_e( 'Price Adjustment Amount Round?', 'wc_api_mps' ); ?></label></th>
                                                <td>
                                                    <input type="hidden" name="price_adjustment_amount_round" value="0" />
                                                    <input type="checkbox" name="price_adjustment_amount_round" value="1"<?php echo ( ( isset( $store['price_adjustment_amount_round'] ) && $store['price_adjustment_amount_round'] ) ? ' checked="checked"' : '' ); ?> />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <p>
                                        <input type="hidden" name="url" value="<?php echo rawurldecode( $_REQUEST['edit'] ); ?>" />
                                        <input type='submit' class='button-primary' name="update" value="<?php esc_html_e( 'Update store', 'wc_api_mps' ); ?>" />
                                    </p>
                                </form>
                            <?php
                        } else {
                            ?>
                                <h2><?php esc_html_e( 'Add store', 'wc_api_mps' ); ?></h2>                            
                                <form method="post" action="<?php echo $page_url; ?>">
                                    <table class="form-table">
                                        <tbody>                                            
                                            <tr>
                                                <th scope="row"><label><?php esc_html_e( 'Store URL', 'wc_api_mps' ); ?> <span class="description">(required)</span></label></th>
                                                <td>
                                                    <input type="url" name="url" class="regular-text code" required />
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><label><?php esc_html_e( 'Consumer Key', 'wc_api_mps' ); ?> <span class="description">(required)</span></label></th>
                                                <td>
                                                    <input type="text" name="consumer_key" class="regular-text code" required />
                                                </td>
                                            </tr>
                                            <tr>
                                                <th scope="row"><label><?php esc_html_e( 'Consumer Secret', 'wc_api_mps' ); ?> <span class="description">(required)</span></label></th>
                                                <td>
                                                    <input type="text" name="consumer_secret" class="regular-text code" required />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <p><input type='submit' class='button-primary' name="submit" value="<?php esc_html_e( 'Add store', 'wc_api_mps' ); ?>" /></p>
                                </form>
                                <br>
                                <h2><?php esc_html_e( 'Stores', 'wc_api_mps' ); ?></h2>
                                <table class="widefat striped">
                                    <thead>
                                        <tr>
                                            <th><?php esc_html_e( 'Store URL', 'wc_api_mps' ); ?></th>
                                            <th><?php esc_html_e( 'Status', 'wc_api_mps' ); ?></th>       
                                            <th><?php esc_html_e( 'Action', 'wc_api_mps' ); ?></th>
                                        </tr>
                                    </thead>
                                    <tfoot>
                                        <tr>
                                            <th><?php esc_html_e( 'Store URL', 'wc_api_mps' ); ?></th>
                                            <th><?php esc_html_e( 'Status', 'wc_api_mps' ); ?></th>       
                                            <th><?php esc_html_e( 'Action', 'wc_api_mps' ); ?></th>
                                        </tr>
                                    </tfoot>
                                    <tbody>
                                        <?php
                                            $stores = get_option( 'wc_api_mps_stores' );
                                            if ( $stores != null ) {
                                                foreach ( $stores as $store => $data ) {
                                                    ?>
                                                        <tr>
                                                            <td><?php echo $store; ?></td>
                                                            <td>
                                                                <?php
                                                                    if ( $data['status'] ) {
                                                                        ?><span class="dashicons dashicons-yes"></span><?php
                                                                    } else {
                                                                        ?><span class="dashicons dashicons-no"></span><?php
                                                                    }
                                                                ?>
                                                            </td>
                                                            <td>
                                                                <a href="<?php echo $page_url; ?>&edit=<?php echo rawurlencode( $store ); ?>"><span class="dashicons dashicons-edit"></span></a>
                                                                <a href="<?php echo $page_url; ?>&delete=<?php echo rawurlencode( $store ); ?>"><span class="dashicons dashicons-trash"></span></a>
                                                            </td>
                                                        </tr>
                                                    <?php
                                                }
                                            } else {
                                                ?>
                                                    <tr>
                                                        <td colspan="3"><?php esc_html_e( 'No stores found.', 'wc_api_mps' ); ?></td>
                                                    </tr>
                                                <?php
                                            }
                                        ?>                        
                                    </tbody>
                                </table>
                            <?php
                        }
                    } else {
                        ?>
                            <div class="notice notice-error is-dismissible">
                                <p><?php esc_html_e( 'Please verify purchase code.', 'wc_api_mps' ); ?></p>
                            </div>
                        <?php
                    }
                ?>
            </div>
        <?php
    }
}

/*
 * This is a function that sync bulk products.
 */
if ( ! function_exists( 'wc_api_mps_bulk_sync_callback' ) ) {
    function wc_api_mps_bulk_sync_callback() {
        
        $stores = get_option( 'wc_api_mps_stores' );
        $product_cat = ( isset( $_REQUEST['product_cat'] ) ) ? (int) $_REQUEST['product_cat'] : 0;
        $product_tag = ( isset( $_REQUEST['product_tag'] ) ) ? (int) $_REQUEST['product_tag'] : 0;
        $status = ( isset( $_REQUEST['wc_api_mps_status'] ) ) ? sanitize_text_field( $_REQUEST['wc_api_mps_status'] ) : '';
        $store = ( isset( $_REQUEST['wc_api_mps_store'] ) ) ? $_REQUEST['wc_api_mps_store'] : '';
        $s = ( isset( $_REQUEST['s'] ) ) ? sanitize_text_field( $_REQUEST['s'] ) : '';
        $record_per_page = 50;
        if ( isset( $_REQUEST['wc_api_mps_record_per_page'] ) ) {
            $record_per_page = (int) $_REQUEST['wc_api_mps_record_per_page'];
        }
        
        if ( isset( $_REQUEST['submit'] ) ) {
            $records = ( isset( $_REQUEST['records'] ) ? $_REQUEST['records'] : array() );
            if ( $records != null ) {
                $success = array();
                $error = array();
                $selected_stores = ( isset( $_REQUEST['stores'] ) ? $_REQUEST['stores'] : array() );
                $stores = get_option( 'wc_api_mps_stores' );
                $wc_api_mps_stores = array();
                foreach ( $selected_stores as $selected_store ) {
                    if ( isset( $stores[$selected_store] ) ) {
                        $wc_api_mps_stores[$selected_store] = $stores[$selected_store];
                    }
                }
                
                if ( $wc_api_mps_stores != null ) {
                    foreach ( $records as $record ) {
                        $product_id = $record;
                        wc_api_mps_integration( $product_id, $wc_api_mps_stores );
                        $mpsrel = get_post_meta( $product_id, 'mpsrel', true );
                        if ( $mpsrel != null ) {
                            foreach ( $wc_api_mps_stores as $wc_api_mps_store => $wc_api_mps_store_data ) {
                                if ( isset( $mpsrel[$wc_api_mps_store] ) && $mpsrel[$wc_api_mps_store] ) {
                                    $success[$wc_api_mps_store][] = get_the_title( $product_id );
                                } else {
                                    $error[$wc_api_mps_store][] = get_the_title( $product_id );
                                }
                            }
                        }
                    }
                }
                
                if ( $success != null ) {
                    ?>
                        <div class="notice notice-success is-dismissible">
                            <p><?php esc_html_e( 'Products successfully synced.', 'wc_api_mps' ); ?></p>
                            <?php
                                foreach ( $success as $success_key => $success_value ) {
                                    ?><p><?php echo $success_key; ?><br>- <?php echo implode( ', ', $success_value ); ?></p><?php
                                }
                            ?>
                        </div>
                    <?php
                }

                if ( $error != null ) {
                    ?>
                        <div class="notice notice-error is-dismissible">
                            <p><?php esc_html_e( 'Products not synced.', 'wc_api_mps' ); ?></p>
                            <?php
                                foreach ( $error as $error_key => $error_value ) {
                                    ?><p><?php echo $error_key; ?><br>- <?php echo implode( ', ', $error_value ); ?></p><?php
                                }
                            ?>
                        </div>
                    <?php
                }
            }
        }
        
        $page_url = admin_url( '/admin.php?page=wc_api_mps_bulk_sync' );
        $licence = get_option( 'wc_api_mps_licence' );
        ?>
            <div class="wrap">               
                <h1><?php esc_html_e( 'Bulk Sync', 'wc_api_mps' ); ?></h1>
                <hr>
                <?php
                    if ( $licence ) {
                        ?>
                        <form method="post">                
                            <table class="form-table">
                                <tbody>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Search products', 'wc_api_mps' ); ?></th>
                                        <td><input type="text" name="s" value="<?php echo sanitize_text_field( $s ); ?>" /></td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Categories', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <?php
                                                $args = array(
                                                    'show_option_none'  => esc_html__( 'Select a category', 'wc_api_mps' ),
                                                    'option_none_value' => 0,
                                                    'orderby'           => 'name',
                                                    'show_count'        => 1,
                                                    'hierarchical'      => 1,
                                                    'name'              => 'product_cat',
                                                    'selected'          => $product_cat,
                                                    'taxonomy'          => 'product_cat',
                                                );
                                                wp_dropdown_categories( $args );
                                            ?>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Tags', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <?php
                                                $args = array(
                                                    'show_option_none'  => esc_html__( 'Select a tag', 'wc_api_mps' ),
                                                    'option_none_value' => 0,
                                                    'orderby'           => 'name',
                                                    'show_count'        => 1,
                                                    'hierarchical'      => 1,
                                                    'name'              => 'product_tag',
                                                    'selected'          => $product_tag,
                                                    'taxonomy'          => 'product_tag',
                                                );
                                                wp_dropdown_categories( $args );
                                            ?>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Product Per Page', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <select name="wc_api_mps_record_per_page">
                                            <?php 
                                                $number_options = array( 25, 50, 100, 150 );
                                                foreach ( $number_options as $number_option ) {
                                                    $selected = '';
                                                    if ( $record_per_page == $number_option ) {
                                                        $selected = ' selected="$selected"';
                                                    }
                                                    ?><option value="<?php echo intval( $number_option ); ?>"<?php echo $selected; ?>><?php echo $number_option; ?></option><?php
                                                }
                                            ?>
                                            </select>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Status', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <?php
                                                if ( $stores != null ) {
                                                    ?>
                                                        <select name="wc_api_mps_store">
                                                            <option value=""><?php esc_html_e( 'All Stores', 'wc_api_mps' ); ?></option>
                                                            <?php
                                                                foreach ( $stores as $store_url => $store_data ) {
                                                                    if ( $store_data['status'] ) {
                                                                        $selected = '';
                                                                        if ( $store == $store_url ) {
                                                                            $selected = ' selected="selected"';
                                                                        }

                                                                        ?><option value="<?php echo $store_url; ?>"<?php echo $selected; ?>><?php echo $store_url; ?></option><?php
                                                                    }
                                                                }
                                                            ?>
                                                        </select>
                                                        <br><br>
                                                    <?php
                                                }
                                            ?>
                                            <fieldset>
                                                <?php
                                                    $status_options = array(
                                                        ''              => esc_html__( 'All', 'wc_api_mps' ),
                                                        'synced'        => esc_html__( 'Synced', 'wc_api_mps' ),
                                                        'not-synced'    => esc_html__( 'Not Synced', 'wc_api_mps' ),
                                                    );
                                                    foreach ( $status_options as $status_option_value => $status_option_label ) {
                                                        $checked = '';
                                                        if ( $status == $status_option_value ) {
                                                            $checked = ' checked="checked"';
                                                        }

                                                        ?><label><input type="radio" name="wc_api_mps_status" value="<?php echo $status_option_value; ?>"<?php echo $checked; ?>> <?php echo $status_option_label; ?></label>&nbsp;&nbsp;&nbsp;&nbsp;<?php
                                                    }
                                                ?>
                                            </fieldset>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p class="submit">
                                <input name="filter" class="button button-secondary" value="<?php esc_html_e( 'Filter', 'wc_api_mps' ); ?>" type="submit">
                                &nbsp;&nbsp;&nbsp;&nbsp;<a class="button button-secondary" href="<?php echo $page_url; ?>"><?php esc_html_e( 'Clear', 'wc_api_mps' ); ?></a>
                            </p>
                        </form>                
                        <form method="post">
                            <table class="wp-list-table widefat fixed striped">
                                <thead>
        <tr>
            <td class="manage-column column-cb check-column"><input type="checkbox"></td>
            <th><?php esc_html_e( 'ID', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Thumbnail', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Title', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'SKU', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Stock', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Price', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Categories', 'wc_api_mps' ); ?></th>
        </tr>
    </thead>
    <tfoot>
        <tr>
            <td class="manage-column column-cb check-column"><input type="checkbox"></td>
            <th><?php esc_html_e( 'ID', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Thumbnail', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Title', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'SKU', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Stock', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Price', 'wc_api_mps' ); ?></th>
            <th><?php esc_html_e( 'Categories', 'wc_api_mps' ); ?></th>
        </tr>
    </tfoot>
                                <tbody>
                                    <?php 
                                        $paged = ( isset( $_REQUEST['paged'] ) ) ? (int) $_REQUEST['paged'] : 1;
                                        $add_args = array(
                                            'wc_api_mps_record_per_page'  => $record_per_page,
                                        );
                                        
                                        $args = array(
                                            'posts_per_page'    => $record_per_page,                                    
                                            'paged'             => $paged,
                                            'post_type'         => 'product',
                                        );
                                        
                                        if ( $s ) {
                                            $args['s'] = $s;
                                            $add_args['s'] = $s;
                                        }
                                        
                                        if ( $product_cat ) {
                                            $args['tax_query'][] = array(
                                                'taxonomy'  => 'product_cat',
                                                'field'     => 'term_id',
                                                'terms'     => $product_cat,
                                            );
                                            
                                            $add_args['product_cat'] = $product_cat;
                                        }
                                        
                                        if ( $product_tag ) {
                                            $args['tax_query'][] = array(
                                                'taxonomy'  => 'product_tag',
                                                'field'     => 'term_id',
                                                'terms'     => $product_tag,
                                            );
                                            
                                            $add_args['product_tag'] = $product_tag;
                                        }
                                        
                                        if ( $status || $store ) {
                                            if ( $status ) {
                                                $add_args['wc_api_mps_status'] = $status;
                                            }

                                            if ( $store ) {
                                                $add_args['wc_api_mps_store'] = $store;
                                            }

                                            if ( $status == 'synced' ) {
                                                if ( $store ) {
                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'value'     => $store,
                                                        'compare'   => 'LIKE',
                                                    );
                                                } else {
                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'compare'   => 'EXISTS',
                                                    );

                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'value'     => 'a:0:{}',
                                                        'compare'   => '!=',
                                                    );
                                                }
                                            } else if ( $status == 'not-synced' ) {
                                                if ( $store ) {
                                                    $args['meta_query']['relation'] = 'OR';
                                                    
                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'value'     => $store,
                                                        'compare'   => 'NOT LIKE',
                                                    );

                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'compare'   => 'NOT EXISTS',
                                                    );

                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'value'     => 'a:0:{}',
                                                        'compare'   => '=',
                                                    );
                                                } else {
                                                    $args['meta_query']['relation'] = 'OR';

                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'compare'   => 'NOT EXISTS',
                                                    );

                                                    $args['meta_query'][] = array(
                                                        'key'       => 'mpsrel',
                                                        'value'     => 'a:0:{}',
                                                        'compare'   => '=',
                                                    );
                                                }
                                            } else {
                                                //
                                            }
                                        }
                                        
                                        $records = new WP_Query( $args );
            if ( $records->have_posts() ) {
                while ( $records->have_posts() ) {
                    $records->the_post();
                    $record_id = get_the_ID();
                    $thumbnail = get_the_post_thumbnail_url( $record_id, 'thumbnail' );
                    $sku = get_post_meta( $record_id, '_sku', true );
                    $stock = get_post_meta( $record_id, '_stock', true );
                    $price = get_post_meta( $record_id, '_price', true );
                    $categories = get_the_terms( $record_id, 'product_cat' );
                    $category_names = $categories ? implode( ', ', wp_list_pluck( $categories, 'name' ) ) : '-';
                    ?>
                    <tr>
                        <th class="check-column"><input type="checkbox" name="records[]" value="<?php echo intval( $record_id ); ?>"></th>
                        <td><?php echo intval( $record_id ); ?></td>
                        <td><img src="<?php echo esc_url( $thumbnail ); ?>" width="50" height="50"></td>
                        <td><strong><a href="<?php echo get_edit_post_link( $record_id); ?>"><?php echo get_the_title(); ?></a></strong></td>
                        <td><?php echo esc_html( $sku ); ?></td>
                        <td><?php echo esc_html( $stock ); ?></td>
                        <td><?php echo esc_html( $price ); ?></td>
                        <td><?php echo esc_html( $category_names ); ?></td>
                    </tr>
                    <?php
                }
            } else {
                ?>
                <tr class="no-items">                                       
                    <td class="colspanchange" colspan="8"><?php esc_html_e( 'No products found.', 'wc_api_mps' ); ?></td>
                </tr>
                <?php
            }
                                    ?>
                                </tbody>
                            </table>
                            <?php
                                if ( $records->max_num_pages ) {
                                    ?>
                                        <div class="wc_api_mps-pagination">
                                            <span class="pagination-links">
                                                <?php
                                                $big = 999999999;
                                                $total = $records->max_num_pages;
                                                $paginate_url = admin_url( '/admin.php?page=wc_api_mps_bulk_sync&paged=%#%' );
                                                echo paginate_links( array(
                                                    'base'      => str_replace( $big, '%#%', $paginate_url ),
                                                    'format'    => '?paged=%#%',
                                                    'current'   => max( 1, $paged ),
                                                    'total'     => $total,
                                                    'add_args'  => $add_args,    
                                                    'prev_text' => '&laquo;',
                                                    'next_text' => '&raquo;',
                                                ) );
                                                ?>
                                            </span>
                                        </div>
                                    <?php
                                }

                                wp_reset_postdata();
                            ?>
                            <table class="form-table">
                                <tbody>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Destination Sites', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <label><input class="wc_api_mps-check-uncheck" type="checkbox" /><?php esc_html_e( 'All', 'wc_api_mps' ); ?></label>
                                            <p class="description"><?php esc_html_e( 'Select/Deselect all sites.', 'wc_api_mps' ); ?></p>
                                            <br>
                                            <fieldset class="wc_api_mps-sites">                                            
                                                <?php
                                                    if ( $stores != null ) {
                                                        foreach ( $stores as $store_url => $store_data ) {
                                                            if ( $store_data['status'] ) {
                                                                ?><p><label><input type="checkbox" name="stores[]" value="<?php echo $store_url; ?>" /> <?php echo $store_url; ?></label><?php
                                                            }
                                                        }
                                                    }
                                                ?>                                                                         				
                                            </fieldset>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p class="submit">
                                <input type="hidden" name="wc_api_mps_record_per_page" value="<?php echo intval( $record_per_page ); ?>" />
                                <input name="submit" class="button button-primary" value="<?php esc_html_e( 'Sync', 'wc_api_mps' ); ?>" type="submit">
                            </p>
                        </form>
                        <style>
                            .wc_api_mps-pagination {
                                color: #555;
                                cursor: default;
                                float: right;
                                height: 28px;
                                margin-top: 3px;
                            }

                            .wc_api_mps-pagination .page-numbers {
                                background: #e5e5e5;
                                border: 1px solid #ddd;
                                display: inline-block;
                                font-size: 16px;
                                font-weight: 400;
                                line-height: 1;
                                min-width: 17px;
                                padding: 3px 5px 7px;
                                text-align: center;
                                text-decoration: none;
                            }

                            .wc_api_mps-pagination .page-numbers.current {
                                background: #f7f7f7;
                                border-color: #ddd;
                                color: #a0a5aa;
                                height: 16px;
                                margin: 6px 0 4px;
                            }

                            .wc_api_mps-pagination a.page-numbers:hover {
                                background: #00a0d2;
                                border-color: #5b9dd9;
                                box-shadow: none;
                                color: #fff;
                                outline: 0 none;
                            }

                            .wc_api_mps-search-box {
                                margin-bottom: 8px !important;
                            }

                            @media screen and (max-width:782px) {
                                .wc_api_mps-pagination {
                                    float: none;
                                    height: auto;
                                    text-align: center;
                                    margin-top: 7px;
                                }

                                .wc_api_mps-search-box {
                                    margin-bottom: 20px !important;
                                }
                            }
                        </style>
                        <script>
                            jQuery( document ).ready( function( $ ) {
                                $( '.wc_api_mps-check-uncheck' ).on( 'change', function() {
                                    var checked = $( this ).prop( 'checked' );
                                    $( '.wc_api_mps-sites input[type="checkbox"]' ).each( function() {
                                        if ( checked ) {
                                            $( this ).prop( 'checked', true );
                                        } else {
                                            $( this ).prop( 'checked', false );
                                        }
                                    });                   
                                });
                            });
                        </script>
                        <?php
                    } else {
                        ?>
                            <div class="notice notice-error is-dismissible">
                                <p><?php esc_html_e( 'Please verify purchase code.', 'wc_api_mps' ); ?></p>
                            </div>
                        <?php
                    }
                ?>
            </div>
        <?php
    }
}

/*
 * This is a function for plugin settings.
 */
if ( ! function_exists( 'wc_api_mps_settings_callback' ) ) {
    function wc_api_mps_settings_callback() {
        
        if ( isset( $_POST['submit'] ) ) {
            if ( isset( $_POST['wc_api_mps_sync_type'] ) ) {
                update_option( 'wc_api_mps_sync_type', sanitize_text_field( $_POST['wc_api_mps_sync_type'] ) );
            }

            if ( isset( $_POST['wc_api_mps_authorization'] ) ) {
                update_option( 'wc_api_mps_authorization', sanitize_text_field( $_POST['wc_api_mps_authorization'] ) );
            }

            if ( isset( $_POST['wc_api_mps_old_products_sync_by'] ) ) {
                update_option( 'wc_api_mps_old_products_sync_by', sanitize_text_field( $_POST['wc_api_mps_old_products_sync_by'] ) );
            }

            if ( isset( $_POST['wc_api_mps_product_sync_type'] ) ) {
                update_option( 'wc_api_mps_product_sync_type', sanitize_text_field( $_POST['wc_api_mps_product_sync_type'] ) );
            }
            
            if ( isset( $_POST['wc_api_mps_stock_sync'] ) ) {
                update_option( 'wc_api_mps_stock_sync', (int) $_POST['wc_api_mps_stock_sync'] );
            }

            if ( isset( $_POST['wc_api_mps_product_delete'] ) ) {
                update_option( 'wc_api_mps_product_delete', (int) $_POST['wc_api_mps_product_delete'] );
            }

            if ( isset( $_POST['wc_api_mps_uninstall'] ) ) {
                update_option( 'wc_api_mps_uninstall', (int) $_POST['wc_api_mps_uninstall'] );
            }

            ?>
                <div class="notice notice-success is-dismissible">
                    <p><?php esc_html_e( 'Settings saved.', 'wc_api_mps' ); ?></p>
                </div>
            <?php
        }
        
        $sync_type = get_option( 'wc_api_mps_sync_type' );
        $authorization = get_option( 'wc_api_mps_authorization' );
        if ( ! $authorization ) {
            $authorization = 'header';
        }
        
        $old_products_sync_by = get_option( 'wc_api_mps_old_products_sync_by' );
        if ( ! $old_products_sync_by ) {
            $old_products_sync_by = 'slug';
        }

        $product_sync_type = get_option( 'wc_api_mps_product_sync_type' );
        if ( ! $product_sync_type ) {
            $product_sync_type = 'full_product';
        }
        
        $product_delete = get_option( 'wc_api_mps_product_delete' );
        $stock_sync = get_option( 'wc_api_mps_stock_sync' );
        $uninstall = get_option( 'wc_api_mps_uninstall' );
        $licence = get_option( 'wc_api_mps_licence' );
        ?>
            <div class="wrap">     
                <h1><?php esc_html_e( 'Settings', 'wc_api_mps' ); ?></h1>
                <hr>
                <?php
                    if ( $licence ) {
                        ?>
                        <form method="post">                
                            <table class="form-table">
                                <tbody>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Sync Type', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <fieldset>
                                                <label><input type="radio" name="wc_api_mps_sync_type" value="auto"<?php echo ( $sync_type == 'auto' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Auto Sync', 'wc_api_mps' ); ?></label><br>
                                                <label><input type="radio" name="wc_api_mps_sync_type" value="manual"<?php echo ( $sync_type == 'manual' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Manual Sync', 'wc_api_mps' ); ?></label>
                                            </fieldset>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Authorization', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <fieldset>
                                                <label><input type="radio" name="wc_api_mps_authorization" value="header"<?php echo ( $authorization == 'header' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Header', 'wc_api_mps' ); ?></label><br>
                                                <label><input type="radio" name="wc_api_mps_authorization" value="query"<?php echo ( $authorization == 'query' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Query String Parameters', 'wc_api_mps' ); ?></label>
                                            </fieldset>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Old Products Sync By', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <fieldset>
                                                <label><input type="radio" name="wc_api_mps_old_products_sync_by" value="slug"<?php echo ( $old_products_sync_by == 'slug' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Slug', 'wc_api_mps' ); ?></label><br>
                                                <label><input type="radio" name="wc_api_mps_old_products_sync_by" value="sku"<?php echo ( $old_products_sync_by == 'sku' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'SKU', 'wc_api_mps' ); ?></label>
                                            </fieldset>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Product Sync Type', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <fieldset>
                                                <label><input type="radio" name="wc_api_mps_product_sync_type" value="full_product"<?php echo ( $product_sync_type == 'full_product' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Full Product', 'wc_api_mps' ); ?></label><br>
                                                <label><input type="radio" name="wc_api_mps_product_sync_type" value="price_and_quantity"<?php echo ( $product_sync_type == 'price_and_quantity' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Price and Quantity', 'wc_api_mps' ); ?></label><br>
                                                <label><input type="radio" name="wc_api_mps_product_sync_type" value="quantity"<?php echo ( $product_sync_type == 'quantity' ? ' checked="checked"' : '' ); ?> /> <?php esc_html_e( 'Quantity', 'wc_api_mps' ); ?></label>
                                            </fieldset>
                                        </td>
                                    </tr>
                                    <tr style="<?php echo ( $product_sync_type != 'full_product' ? 'display: none;' : '' ); ?>">
                                        <th scope="row"><?php esc_html_e( 'Stock Sync?', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <input type="hidden" name="wc_api_mps_stock_sync" value="0" />
                                            <input type="checkbox" name="wc_api_mps_stock_sync" value="1"<?php echo ( $stock_sync ? ' checked="checked"' : '' ); ?> />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Sync on product delete?', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <input type="hidden" name="wc_api_mps_product_delete" value="0" />
                                            <input type="checkbox" name="wc_api_mps_product_delete" value="1"<?php echo ( $product_delete ? ' checked="checked"' : '' ); ?> />
                                        </td>
                                    </tr>
                                    <tr>
                                        <th scope="row"><?php esc_html_e( 'Delete data on uninstall?', 'wc_api_mps' ); ?></th>
                                        <td>
                                            <input type="hidden" name="wc_api_mps_uninstall" value="0" />
                                            <input type="checkbox" name="wc_api_mps_uninstall" value="1"<?php echo ( $uninstall ? ' checked="checked"' : '' ); ?> />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p class="submit">
                                <input type="submit" name="submit" class="button button-primary" value="<?php esc_html_e( 'Save Changes', 'wc_api_mps' ); ?>">
                            </p>
                        </form>
                        <?php
                    } else {
                        ?>
                            <div class="notice notice-error is-dismissible">
                                <p><?php esc_html_e( 'Please verify purchase code.', 'wc_api_mps' ); ?></p>
                            </div>
                        <?php
                    }
                ?>
                
            </div>
        <?php
    }
}

/*
 * This is a function for api error logs
 */
if ( ! function_exists( 'wc_api_mps_api_error_logs_callback' ) ) {
    function wc_api_mps_api_error_logs_callback() {
        
        $file_path = WC_API_MPS_PLUGIN_PATH.'debug.log';
        if ( isset( $_POST['submit'] ) ) {
            $file = fopen( $file_path, 'w' );
            fclose( $file );
        }
        
        $licence = get_option( 'wc_api_mps_licence' );
        ?>
            <div class="wrap">
                <h1><?php esc_html_e( 'API Error Logs', 'wc_api_mps' ); ?></h1>
                <hr>
                <?php
                    if ( $licence ) {
                        $file = fopen( $file_path, 'r' );
                            $file_size = filesize( $file_path );
                            if ( $file_size ) {
                                $file_data = fread( $file, $file_size );
                                if ( $file_data ) {
                                    echo '<pre style="overflow: scroll;">'; print_r( $file_data ); echo '</pre>';
                                    ?>
                                        <form method="post">
                                            <p>
                                             <!--   <input type='submit' class='button-primary' name="submit" value="<?php esc_html_e( 'Clear API Error Logs', 'wc_api_mps' ); ?>" /> -->
                                            </p>
                                        </form>
                                    <?php
                                }
                            } else {
                                ?><p><?php esc_html_e( 'No API error logs found.', 'wc_api_mps' ); ?></p><?php
                            }
                        fclose( $file );
                    } else {
                        ?>
                            <div class="notice notice-error is-dismissible">
                                <p><?php esc_html_e( 'Please verify purchase code.', 'wc_api_mps' ); ?></p>
                            </div>
                        <?php
                    }
                ?>
            </div>
        <?php
    }
}

/*
 * This is a function for licence verification.
 
if ( ! function_exists( 'wc_api_mps_licence_verification_callback' ) ) {
    function wc_api_mps_licence_verification_callback() {
        
        if ( isset( $_POST['verify'] ) ) {
            if ( isset( $_POST['wc_api_mps_purchase_code'] ) ) {
                update_option( 'wc_api_mps_purchase_code', sanitize_text_field( $_POST['wc_api_mps_purchase_code'] ) );
                
                $data = array(
                    'sku'           => '21672540',
                    'purchase_code' => $_POST['wc_api_mps_purchase_code'],
                    'domain'        => site_url(),
                    'status'        => 'verify',
                    'type'          => 'oi',
                );

                $ch = curl_init();
                curl_setopt( $ch, CURLOPT_URL, 'https://www.obtaininfotech.com/extension/' );
                curl_setopt( $ch, CURLOPT_POST, 1 );
                curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query( $data ) );
                curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
                curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, 0 );
                $json_response = curl_exec( $ch );
                curl_close ($ch);
                
                $response = json_decode( $json_response );
                if ( isset( $response->success ) ) {
                    if ( $response->success ) {
                        update_option( 'wc_api_mps_licence', 1 );
                    }
                }
            }
        } else if ( isset( $_POST['unverify'] ) ) {
            if ( isset( $_POST['wc_api_mps_purchase_code'] ) ) {
                $data = array(
                    'sku'           => '21672540',
                    'purchase_code' => $_POST['wc_api_mps_purchase_code'],
                    'domain'        => site_url(),
                    'status'        => 'unverify',
                    'type'          => 'oi',
                );

                $ch = curl_init();
                curl_setopt( $ch, CURLOPT_URL, 'https://www.obtaininfotech.com/extension/' );
                curl_setopt( $ch, CURLOPT_POST, 1 );
                curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query( $data ) );
                curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
                curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, 0 );
                $json_response = curl_exec( $ch );
                curl_close ($ch);

                $response = json_decode( $json_response );
                if ( isset( $response->success ) ) {
                    if ( $response->success ) {
                        update_option( 'wc_api_mps_purchase_code', '' );
                        update_option( 'wc_api_mps_licence', 0 );
                    }
                }
            }
        }    
        
        $wc_api_mps_purchase_code = get_option( 'wc_api_mps_purchase_code' );
        ?>
            <div class="wrap">      
                <h2><?php esc_html_e( 'Licence Verification', 'wc_api_mps' ); ?></h2>
                <hr>
                <?php
                    if ( isset( $response->success ) ) {
                        if ( $response->success ) {                            
                             ?>
                                <div class="notice notice-success is-dismissible">
                                    <p><?php echo $response->message; ?></p>
                                </div>
                            <?php
                        } else {
                            update_option( 'wc_api_mps_licence', 0 );
                            ?>
                                <div class="notice notice-error is-dismissible">
                                    <p><?php echo $response->message; ?></p>
                                </div>
                            <?php
                        }
                    }
                ?>
                <form method="post">
                    <table class="form-table">                    
                        <tbody>
                            <tr>
                                <th scope="row"><?php esc_html_e( 'Purchase Code', 'wc_api_mps' ); ?></th>
                                <td>
                                    <input name="wc_api_mps_purchase_code" type="text" class="regular-text" value="<?php echo esc_html( $wc_api_mps_purchase_code ); ?>" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p>
                        <input type='submit' class='button-primary' name="verify" value="<?php esc_html_e( 'Verify', 'wc_api_mps' ); ?>" />
                        <input type='submit' class='button-primary' name="unverify" value="<?php esc_html_e( 'Unverify', 'wc_api_mps' ); ?>" />
                    </p>
                </form>   
            </div>
        <?php
    }
}
*/