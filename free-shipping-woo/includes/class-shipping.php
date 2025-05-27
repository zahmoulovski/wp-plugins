<?php
/**
 * Shipping method functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class FSPB_Shipping {
    
    private $settings;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->settings = get_option('fspb_settings', array());
        
        // Hook into shipping calculations
        add_filter('woocommerce_package_rates', array($this, 'modify_shipping_rates'), 100, 2);
        add_action('woocommerce_cart_calculate_fees', array($this, 'maybe_add_free_shipping'));
    }
    
    /**
     * Modify shipping rates based on progress
     */
    public function modify_shipping_rates($rates, $package) {
        if (is_admin() && !defined('DOING_AJAX')) {
            return $rates;
        }
        
        $calculator = new FSPB_Calculator();
        $progress_data = $calculator->calculate_progress();
        
        // If qualified for free shipping, add free shipping method and hide others
        if ($progress_data['qualified']) {
            // Add free shipping method with French text and qualification message
            $free_shipping_rate = new WC_Shipping_Rate(
                'fspb_free_shipping',
                'Livraison gratuite - Vous bénéficiez de la livraison gratuite!',
                0,
                array(),
                'fspb_free_shipping'
            );
            
            $rates['fspb_free_shipping'] = $free_shipping_rate;
            
            // Hide all other shipping methods except pickup (ID: 5)
            foreach ($rates as $rate_id => $rate) {
                // Keep pickup method (you can adjust this condition based on your pickup method)
                if (strpos($rate_id, 'pickup') !== false || 
                    strpos($rate_id, ':5') !== false || 
                    $rate->get_method_id() === 'pickup' ||
                    $rate_id === 'pickup:5') {
                    continue; // Keep pickup method
                }
                
                // Remove other shipping methods when free shipping is available
                if ($rate_id !== 'fspb_free_shipping') {
                    unset($rates[$rate_id]);
                }
            }
        }
        
        return $rates;
    }
    
    /**
     * Maybe add free shipping notice
     */
    public function maybe_add_free_shipping() {
        if (!WC()->cart) {
            return;
        }
        
        $calculator = new FSPB_Calculator();
        $progress_data = $calculator->calculate_progress();
        
        // Store progress data for use in other parts of the plugin
        WC()->session->set('fspb_progress_data', $progress_data);
    }
}