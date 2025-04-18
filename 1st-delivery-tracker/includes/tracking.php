<?php
if (!defined('ABSPATH')) exit;

function fdt_get_barcode_from_order($order_id) {
    global $wpdb;
    
    // Debug the SQL query
    $query = $wpdb->prepare(
        "SELECT meta_value 
        FROM {$wpdb->prefix}wc_orders_meta 
        WHERE order_id = %d 
        AND meta_key = '_first_delivery_barcode'",
        $order_id
    );
    error_log('SQL Query: ' . $query);
    
    $barcode = $wpdb->get_var($query);
    error_log('Found barcode: ' . ($barcode ? $barcode : 'none'));
    
    return $barcode;
}

function fdt_get_order_from_barcode($barcode) {
    global $wpdb;
    
    $query = $wpdb->prepare(
        "SELECT order_id 
        FROM {$wpdb->prefix}wc_orders_meta 
        WHERE meta_value = %s 
        AND meta_key = '_first_delivery_barcode'",
        $barcode
    );
    
    return $wpdb->get_var($query);
}



// Update the API fetch function with debugging
function fdt_fetch_order_status($barcode, $token) {
    $url = 'https://www.firstdeliverygroup.com/api/v2/filter';
    $args = [
        'headers' => [
            'Authorization' => 'Bearer ' . $token,
            'Content-Type'  => 'application/json',
        ],
        'body' => json_encode(['barCode' => $barcode]),
        'timeout' => 30,
    ];
    
    error_log('API Request - Barcode: ' . $barcode);
    error_log('API Token: ' . substr($token, 0, 10) . '...');
    
    $response = wp_remote_post($url, $args);
    if (is_wp_error($response)) {
        error_log('API Error: ' . $response->get_error_message());
        return null;
    }
    
    $body = wp_remote_retrieve_body($response);
    error_log('API Response: ' . $body);
    
    return json_decode($body, true);
}

// Update the shortcode function where we process the form
add_shortcode('first_delivery_tracker', function() {
    ob_start();
    
    // Get API token early
    $token = get_option(FDT_OPTION_NAME);
    if (!$token) {
        echo '<div class="fdt-error">Configuration API manquante.</div>';
        return ob_get_clean();
    }

    // Check for URL parameters first
    $search_term = '';
    if (isset($_GET['order_id'])) {
        $search_term = sanitize_text_field($_GET['order_id']);
    } elseif (isset($_GET['barcode'])) {
        $search_term = sanitize_text_field($_GET['barcode']);
    }
    
    // If no URL parameters, check POST data
    if (empty($search_term) && isset($_POST['fdt_barcode'])) {
        $search_term = sanitize_text_field($_POST['fdt_barcode']);
    }
    ?>

    

<div class="fdt-form-container">
        <form method="get" action="<?php echo get_permalink(); ?>">
            <input type="text" name="search" 
                   id="fdt_search_input" 
                   value="<?php echo esc_attr($search_term); ?>"
                   placeholder="Entrez votre numéro de commande ou code-barres" required />
            <input type="submit" value="Suivre la commande" />
        </form>
    </div>

    <script>
    jQuery(document).ready(function($) {
        $('form').on('submit', function(e) {
            var input = $('#fdt_search_input');
            var value = input.val().replace(/\D/g, ''); // Remove non-digits
            var digits = value.length;
            
            // Change input name based on number of digits
            if (digits >= 5 && digits <= 6) {
                input.attr('name', 'order_id');
            } else if (digits >= 10) {
                input.attr('name', 'barcode');
            } else {
                e.preventDefault();
                alert('Veuillez entrer un numéro de commande valide (5-6 chiffres) ou un code-barres (10 chiffres ou plus)');
            }
        });
    });
    </script>

<?php
    if (!empty($search_term)) {
        $barcode = $search_term;
        $is_order_id = strlen(preg_replace('/\D/', '', $search_term)) >= 5 && strlen(preg_replace('/\D/', '', $search_term)) <= 6;
        
        // Automatically check if it's an order ID based on length
        if ($is_order_id) {
            $order_id = absint($search_term);
            $stored_barcode = fdt_get_barcode_from_order($order_id);
            if ($stored_barcode) {
                $barcode = $stored_barcode;
                error_log('Found and using stored barcode: ' . $barcode);
            } else {
                echo "<p style='text-align:center;color:#dc3545;'>❌ Cette commande n'a pas de code-barres <strong>FIRST DELIVERY</strong> ou a été envoyée avec une autre société de livraison. Veuillez nous contacter via WHATSAPP pour plus d'informations</p>";
                // Add WhatsApp button
                $whatsapp_number = get_option(FDT_WHATSAPP_NUMBER, '21698134873');
                echo '<div style="text-align: center; margin: 15px 0;">
                    <a href="https://api.whatsapp.com/send?phone=' . esc_attr($whatsapp_number) . '" style="display: inline-block;">
                        <img src="' . esc_url(FDT_PLUGIN_URL . 'assets/whatsapp-button.png') . '" alt="Contactez-nous sur WhatsApp" style="max-width: 200px; height: auto;">
                    </a>
                </div>';
                return ob_get_clean();
            }
        }

        // Check if we need to redirect to update URL
        if (empty($_GET['order_id']) && empty($_GET['barcode'])) {
            $current_url = add_query_arg(
                is_numeric($search_term) ? 'order_id' : 'barcode',
                urlencode($search_term),
                get_permalink()
            );
            wp_redirect($current_url);
            exit;
        }
    
        $response = fdt_fetch_order_status($barcode, $token);
        
        // Debug response
        error_log('Full API Response: ' . print_r($response, true));
    
        if ($response && isset($response['result']['Items']) && !empty($response['result']['Items'])) {
            $item = $response['result']['Items'][0];
            
            // Debug item data
            error_log('Item data: ' . print_r($item, true));

            // Get state and determine progress
            $state = $item['state'];
            $state_map = [
                'Préparation de commande' => ['step' => 1, 'color' => '#28a745'],
                'En attente' => ['step' => 2, 'color' => '#fbbc34'],
                'A vérifier' => ['step' => 2, 'color' => '#fbbc34'],
                'Au magasin' => ['step' => 3, 'color' => '#87ceeb'],
                'En cours' => ['step' => 4, 'color' => '#0073aa'],
                'Rtn dépôt' => ['step' => 4, 'color' => '#0073aa'],
                'Livré' => ['step' => 5, 'color' => '#28a745'],
                // Error states
                'Retour Expéditeur' => ['step' => 5, 'color' => '#dc3545'],
                'Rtn client/agence' => ['step' => 5, 'color' => '#dc3545'],
                'Retour reçu' => ['step' => 5, 'color' => '#dc3545'],
                'Rtn définitif' => ['step' => 5, 'color' => '#dc3545'],
                'Echange' => ['step' => 5, 'color' => '#dc3545'],
                'Supprimé' => ['step' => 5, 'color' => '#dc3545'],
                'Demande d\'enlèvement' => ['step' => 5, 'color' => '#dc3545'],
                'Demande d\'enlèvement assignée' => ['step' => 5, 'color' => '#dc3545'],
                'En cours d\'enlèvement' => ['step' => 5, 'color' => '#dc3545'],
                'Enlevé' => ['step' => 5, 'color' => '#dc3545'],
                'Demande d\'enlèvement annulé' => ['step' => 5, 'color' => '#dc3545'],
                'Retour assigné' => ['step' => 5, 'color' => '#dc3545'],
                'Retour en cours d\'expédition' => ['step' => 5, 'color' => '#dc3545'],
                'Retour enlevé' => ['step' => 5, 'color' => '#dc3545'],
                'Retour Annulé' => ['step' => 5, 'color' => '#dc3545']
            ];
    
            // Debug the state mapping
            error_log('State mapping: ' . print_r(isset($state_map[$state]) ? $state_map[$state] : 'State not found', true));
    
            $current_step = isset($state_map[$state]) ? $state_map[$state]['step'] : 1;
            $current_color = isset($state_map[$state]) ? $state_map[$state]['color'] : '#ccc';
    
            $labels = [
                '<a href="https://klarrion.com/mon-compte/ordres/">🛍️ Préparation de commande</a>',
                '📦 Expédié à FIRST DELIVERY',
                '🏪 Au dèpôt FIRST DELIVERY',
                '🚚 En cours de livraison',
                // Dynamic last step based on state
                (strpos($state, 'Retour') !== false || strpos($state, 'Rtn') !== false || $state === 'Echange' || $state === 'Supprimé' || strpos($state, 'enlèvement') !== false) 
                    ? '<span style="color: ' . $current_color . ';">❌ ' . $state . '</span>' 
                    : '✅ Livré'
            ];
    
            echo '<div class="fdt-tracker-bar">';
            
            // Calculate progress fill width
            $progress_width = ($current_step / (count($labels) - 1)) * 80;
            echo '<div class="progress-fill" style="width: calc('.$progress_width.'% - 100px); background-color: '.$current_color.';"></div>';
    
            foreach ($labels as $index => $label) {
                $class = '';
                $style = '';
                
                if ($index < $current_step) {
                    $class = 'done';
                    $style = 'color: '.$current_color.';';
                } elseif ($index == $current_step - 1) { // Adjusted to match current step
                    $class = 'current';
                    $style = 'color: '.$current_color.';';
                }
                
                echo "<div class='fdt-step $class' style='$style'><small>$label</small></div>";
            }
            echo '</div>';
    
            // Display order info only if we have data
            if (!empty($item['Client']) && !empty($item['Product'])) {

                // Display order info
            echo '<div style="max-width: 800px; margin: auto; padding: 20px;">';

            $display_order_id = isset($_GET['order_id']) ? $_GET['order_id'] : '';
            if (empty($display_order_id) && isset($barcode)) {
                $display_order_id = fdt_get_order_from_barcode($barcode);
            }

            $fields = [
                'Commande' => [
                    'État actuel' => '<span style="color: ' . $current_color . ';">' . $state . '</span>',
                    'Numero de Commande' => (!empty($display_order_id) ? '<a href="https://klarrion.com/mon-compte/ordres/" style="color: ' . $current_color . ';">#' . $display_order_id . '</a>' : ''),
                    'Code-barres' => $item['barCode']
                ],
                'Client' => [
                    'Nom' => isset($item['Client']['name']) ? $item['Client']['name'] : '',
                    'Adresse' => isset($item['Client']['address']) ? $item['Client']['address'] : '',
                    'Ville' => isset($item['Client']['city']) ? $item['Client']['city'] : '',
                    'Gouvernorat' => isset($item['Client']['state']) ? $item['Client']['state'] : '',
                    'Téléphone' => isset($item['Client']['telephone']) ? $item['Client']['telephone'] : '',
                ],
                'Produit' => [
                    'Désignation' => isset($item['Product']['designation']) ? $item['Product']['designation'] : '',
                    'Prix' => isset($item['Product']['price']) ? $item['Product']['price'] . ' TND' : '',
                    'Colis' => isset($item['Product']['itemNumber']) ? $item['Product']['itemNumber'] : '',
                ],
                'Dates' => [
                    'Créée le' => format_fdt_datetime($item['createdAt']),
                    'Ramassée le' => format_fdt_datetime($item['pickupAt']),
                    'Livrée le' => format_fdt_datetime($item['deliveredAt']),
                ],
                
            ];

            // Display fields
            foreach ($fields as $title => $data) {
                if (is_array($data)) {
                    echo "<h4>$title</h4><div style='display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;'>";
                    foreach ($data as $key => $val) {
                        if ($val !== '') {
                            echo "<div><strong>$key:</strong> $val</div>";
                        }
                    }
                    echo "</div>";
                } else {
                    if ($data !== '') {
                        echo "<p><strong>$title:</strong> $data</p>";
                    }
                }
            }
            echo '</div>';
        } else {
            echo "<p style='text-align:center;color:red;'>❌ Aucune commande trouvée pour ce code-barres ou numéro de commande.</p>";
        }
        }
    
        return ob_get_clean();
    }
});

// Date format helper
function format_fdt_datetime($datetime) {
    if (empty($datetime)) return '';
    $dt = new DateTime($datetime);
    return $dt->format('H:i d/m/Y');
}
function fdt_enqueue_styles() {
    wp_enqueue_style('fdt-tracking-styles', plugins_url('fdt-tracking.css', __FILE__));
}
add_action('wp_enqueue_scripts', 'fdt_enqueue_styles');
