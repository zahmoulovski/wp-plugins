<?php
/*
Plugin Name: Alcohol Dilution Calculator
Description: Calculator to determine the amount of purified water needed based on alcohol purity and desired concentration.
Version: 1.0
Author: Med Yassine Zahmoul
*/

// Prevent direct access
if (!defined('ABSPATH')) exit;

// Register shortcode
function alcohol_calculator_shortcode() {
    ob_start();
    ?>
    
    <p style="text-align:center; margin-bottom:15px;">
    📥 <a href="https://klarrion.com/fichtech/concentration_table.xlsx" 
          target="_blank" 
          style="color: var(--wd-primary-color); font-weight:bold; text-decoration:none;">
        Télécharger le tableau complet (Excel)
        </a>
    </p>



    <div id="alcohol-calculator" style="padding:20px; border:1px solid #ddd; max-width:40%; margin:0 auto">
        <h3 style="color: red;text-align: center;">Les calculs sont effectués pour 1L d'alcool</h3>
        <label for="initial">Pureté de l'alcool (%):</label><br>
        <select id="initial">
    <option value="">-- Sélectionner --</option>
    <?php 
    $initial_values = [100, 99, 98, 97, 96, 95, 90, 85, 80, 75, 70, 65, 60, 50];
    foreach ($initial_values as $i) { 
    ?>
        <option value="<?php echo $i; ?>"><?php echo $i; ?></option>
    <?php } ?>
</select>
<br><br>

        <label for="final">Concentration souhaitée (%):</label><br>
        <select id="final">
            <option value="">-- Sélectionner --</option>
            <?php for ($i = 95; $i >= 10; $i -= 5) { ?>
                <option value="<?php echo $i; ?>"><?php echo $i; ?></option>
            <?php } ?>
        </select><br><br>

        <button class="alcohol-calculate" onclick="calculateWater()" style="background-color: var(--wd-primary-color); color: white;">Calculer</button>

        <p id="result" style="margin-top:15px; font-weight:bold;"></p>
    </div>

    <script>
    const dilutionTable = {
        95: {100:6.5,99:5.15,98:3.83,97:2.53,96:1.25},
        90: {100:13.25,99:11.83,98:10.43,97:9.07,96:7.73,95:6.41},
        85: {100:20.15,99:17.95,98:15.86,97:13.88,96:12.01,95:10.25,90:6.56},
        80: {100:28.59,99:27.01,98:25.47,97:23.95,96:22.47,95:20.95,90:13.79,85:6.83},
        75: {100:37.58,99:35.9,98:34.28,97:32.67,96:31.08,95:29.52,90:21.89,85:14.48,80:7.2},
        70: {100:47.75,99:45.98,98:44.25,97:42.54,96:40.85,95:39.18,90:31.58,85:23.14,80:15.35,75:7.64},
        65: {100:59.37,99:57.49,98:55.63,97:53.81,96:52.0,95:50.22,90:41.53,85:33.03,80:24.66,75:16.37,70:8.15},
        60: {100:72.28,99:70.07,98:67.9,97:65.76,96:63.65,95:61.56,90:53.65,85:44.85,80:35.44,75:26.47,70:17.58,65:8.76},
        55: {100:88.6,99:86.42,98:84.28,97:82.16,96:80.06,95:77.99,90:67.87,85:57.9,80:48.36,75:39.82,70:31.25,65:22.68,60:13.9,50:9.47},
        50: {100:107.44,99:105.08,98:102.75,97:100.44,96:98.15,95:95.89,90:84.71,85:73.9,80:63.02,75:52.43,70:41.73,65:31.25,60:20.47},
        45: {100:130.26,99:127.67,98:125.11,97:122.57,96:120.06,95:117.59,90:105.34,85:93.3,80:81.38,75:69.54,70:57.78,65:46.9,60:36.0,50:11.41},
        40: {100:158.56,99:155.66,98:152.84,97:150.02,96:147.22,95:144.46,90:130.8,85:117.34,80:104.01,75:90.76,70:77.58,65:64.48,60:51.43,50:25.55},
        35: {100:194.63,99:191.39,98:188.19,97:185.01,96:181.85,95:178.71,90:163.28,85:148.01,80:132.88,75:117.82,70:102.84,65:87.93,60:73.08,50:43.59},
        30: {100:242.38,99:238.67,98:234.99,97:231.27,96:227.56,95:223.87,90:208.08,85:188.57,80:171.06,75:153.64,70:136.31,65:119.06,60:101.71,50:67.45},
        25: {100:308.9,99:304.52,98:300.18,97:295.86,96:291.56,95:287.28,90:266.12,85:245.15,80:224.3,75:203.61,70:182.83,65:162.21,60:141.65,50:100.73},
        20: {100:408.5,99:403.13,98:397.79,97:392.48,96:387.19,95:381.92,90:353.58,85:326.0,80:298.64,75:271.41,70:244.4,65:217.52,60:190.76,50:134.54},
        15: {100:574.75,99:567.43,98:560.53,97:553.55,96:546.59,95:539.66,90:505.87,85:472.1,80:436.85,75:402.28,70:368.23,65:334.91,60:301.07,50:233.64},
        10: {100:907.09,99:896.73,98:886.4,97:876.1,96:865.15,95:855.15,90:804.5,85:753.65,80:702.89,75:652.21,70:601.6,65:551.06,60:500.5,50:399.85}
    };

    function calculateWater() {
        let initial = document.getElementById("initial").value;
        let final = document.getElementById("final").value;
        let resultEl = document.getElementById("result");

        if (!initial || !final) {
            resultEl.innerHTML = "⚠️ Veuillez sélectionner les deux valeurs.";
            return;
        }

        let value = dilutionTable[final] && dilutionTable[final][initial] ? dilutionTable[final][initial] : null;

        if (value) {
            resultEl.innerHTML = `➡️ Ajouter <strong>${value}</strong> ml d' 
        <a href="https://klarrion.com/produit/eau-purifee/" target="_blank" style="color: var(--wd-primary-color); font-weight:bold; text-decoration:none;">
            eau purifiée
        </a> /
        <a href="https://klarrion.com/produit/eau-distilee/" target="_blank" style="color: var(--wd-primary-color); font-weight:bold; text-decoration:none;">
            eau distillée
        </a>.`;
        } else {
            resultEl.innerHTML = "❌ Pas de données pour cette combinaison.";
        }
    }
    </script>

    <?php
    return ob_get_clean();
}
add_shortcode('alcohol_calculator', 'alcohol_calculator_shortcode');
