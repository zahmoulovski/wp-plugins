<?php
if (!defined('ABSPATH')) exit;

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
    $response = wp_remote_post($url, $args);
    if (is_wp_error($response)) return null;
    $body = wp_remote_retrieve_body($response);
    return json_decode($body, true);
}

add_shortcode('first_delivery_tracker', function () {
    ob_start();
    ?>
    <style>
    .fdt-form-container {
        text-align: center;
        margin-bottom: 30px;
    }
    .fdt-form-container input[type="text"] {
        padding: 10px;
        width: 300px;
        max-width: 100%;
        border-radius: 5px;
        border: 1px solid #ccc;
        margin-right: 10px;
    }
    .fdt-form-container input[type="submit"] {
        padding: 10px 20px;
        background-color: #0073aa;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    }
    .fdt-tracker-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 30px auto;
        max-width: 800px;
        padding: 20px;
        background: #f9f9f9;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.05);
    }
    .fdt-step {
        flex: 1;
        text-align: center;
        position: relative;
    }
    .fdt-step::before {
        content: '';
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ccc;
        z-index: 2;
        margin-top: 5px;
    }
    .fdt-step.done::before {
        background: #28a745;
        margin-top: 5px;
    }
    .fdt-step.red::before {
        background: #dc3545;
        margin-top: 5px;
    }
    .fdt-step:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 24px;
        left: 50%;
        height: 4px;
        width: 100%;
        background: #ccc;
        z-index: 1;
        margin-top: 5px;
    }
    .fdt-step.done:not(:last-child)::after {
        background: #28a745;
        margin-top: 5px;
    }
    .fdt-step.red:not(:last-child)::after {
        background: #dc3545;
        margin-top: 5px;
    }
    @media screen and (max-width: 600px) {
        .fdt-tracker-bar {
            flex-direction: column;
        }
        .fdt-step {
            margin-bottom: 15px;
        }
        .fdt-step::after {
            display: absolute;
        }
    }
    </style>

    <div class="fdt-form-container">
        <form method="post">
            <input type="text" name="fdt_barcode" placeholder="Entrez votre code-barres" required />
            <input type="submit" value="Suivre la commande" />
        </form>
    </div>

    <?php
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['fdt_barcode'])) {
        $barcode = sanitize_text_field($_POST['fdt_barcode']);
        $token = get_option(FDT_OPTION_NAME);
        $response = fdt_fetch_order_status($barcode, $token);

        if ($response && !$response['isError']) {
            $item = $response['result']['Items'][0];

            // Get state and determine progress
            $state = $item['state'];
            $state_map = [
                'En attente' => 1,
                'Au magasin' => 2,
                'En cours' => 3,
                'En cours d’enlèvement' => 4,
                'Livré' => 5,
                'Supprimé' => -1,
                'Retour Expéditeur' => -1,
                'Rtn définitif' => -1,
            ];

            $progress = isset($state_map[$state]) ? $state_map[$state] : 0;

            $labels = [
                'Commande en attente',
                'Au magasin',
                'Traitement en cours',
                'Enlèvement',
                'Livrée'
            ];

            echo '<div class="fdt-tracker-bar">';
            for ($i = 0; $i < 5; $i++) {
                $class = '';
                if ($progress == -1) $class = 'red';
                elseif ($i < $progress) $class = 'done';

                echo "<div class='fdt-step $class'><small>{$labels[$i]}</small></div>";
            }
            echo '</div>';

            // Display additional order info
            echo '<div style="max-width: 800px; margin: auto; padding: 20px;">';
            $fields = [
                'Client' => [
                    'Nom' => $item['Client']['name'],
                    'Adresse' => $item['Client']['address'],
                    'Ville' => $item['Client']['city'],
                    'Gouvernorat' => $item['Client']['state'],
                    'Téléphone' => $item['Client']['telephone'],
                ],
                'Produit' => [
                    'Désignation' => $item['Product']['designation'],
                    'Prix' => $item['Product']['price'] . ' TND',
                    'Colis' => $item['Product']['itemNumber'],
                ],
                'Dates' => [
                    'Créée le' => format_fdt_datetime($item['createdAt']),
                    'Ramassée le' => format_fdt_datetime($item['pickupAt']),
                    'Livrée le' => format_fdt_datetime($item['deliveredAt']),
                ],
                'État actuel' => $item['state'],
            ];

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
                    echo "<p><strong>$title:</strong> $data</p>";
                }
            }

            echo '</div>';
        } else {
            echo "<p style='text-align:center;color:red;'>❌ Aucune commande trouvée pour ce code-barres.</p>";
        }
    }

    return ob_get_clean();
});

// Date format helper
function format_fdt_datetime($datetime) {
    if (empty($datetime)) return '';
    $dt = new DateTime($datetime);
    return $dt->format('H:i d/m/Y');
}
