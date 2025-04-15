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
    margin: 30px auto;
    max-width: 800px;
    padding: 20px 0;
    position: relative;
}

.fdt-step {
    flex: 1;
    text-align: center;
    position: relative;
    z-index: 2;
    padding: 40px 30px 20px 30px;
}
    /* Progress line */
.fdt-tracker-bar::before {
    content: '';
    position: absolute;
    top: 25px;
    left: 50px;
    right: 50px;
    height: 4px;
    background: #ccc;
    z-index: 1;
}

/* Progress line fill */
.fdt-tracker-bar .progress-fill {
    position: absolute;
    top: 25px;
    left: 50px;
    height: 4px;
    background: #28a745;
    z-index: 2;
    transition: width 0.3s ease;
}

/* Step circles */
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
    z-index: 3;
}

.fdt-step.done::before {
    background: #28a745;
}

.fdt-step.current::before {
    background: #fff;
    border: 3px solid #28a745;
    box-sizing: border-box;
}

/* Mobile Version */
@media screen and (max-width: 600px) {
    .fdt-tracker-bar {
        flex-direction: column;
        align-items: flex-start;
        padding: 0 20px;
    }

    .fdt-tracker-bar::before,
    .fdt-tracker-bar .progress-fill {
        display: none;
    }

    .fdt-step {
        width: 100%;
        text-align: left;
        padding: 0 0 30px 30px;
        margin-bottom: 15px;
        border-left: 2px solid #ccc;
    }

    .fdt-step:last-child {
        border-left: 0;
        padding-bottom: 0;
    }

    .fdt-step::before {
        left: -11px;
        top: 0;
        transform: none;
    }

    .fdt-step.done {
        border-left-color: #28a745;
    }

    .fdt-step.done::before {
        background: #28a745;
    }

    .fdt-step.current {
        border-left-color: #ccc;
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
$current_step = isset($state_map[$state]) ? $state_map[$state] : 0;
$total_steps = count($labels);

// Calculate progress fill width
$progress_width = ($current_step / ($total_steps - 1)) * 100;
echo '<div class="progress-fill" style="width: calc('.$progress_width.'% - 100px)"></div>';

foreach ($labels as $index => $label) {
    $class = '';
    if ($current_step == -1) {
        $class = 'red';
    } elseif ($index < $current_step) {
        $class = 'done';
    } elseif ($index == $current_step) {
        $class = 'current';
    }
    
    echo "<div class='fdt-step $class'><small>$label</small></div>";
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
