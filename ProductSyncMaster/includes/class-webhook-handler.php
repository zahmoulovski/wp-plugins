<?php
/**
 * Webhook handler for receiving updates from remote sites
 */

if (!defined('ABSPATH')) {
    exit;
}

class WC_Multi_Sync_Webhook_Handler {
    
    public function handle($request) {
        $payload = $request->get_json_params();
        $topic = $request->get_header('X-WC-Webhook-Topic');
        $source = $request->get_header('X-WC-Webhook-Source');
        
        // Log the webhook
        WC_Multi_Sync_Database::log_activity(array(
            'action' => 'webhook_received',
            'status' => 'info',
            'message' => sprintf('Webhook received: %s from %s', $topic, $source),
            'details' => json_encode(array(
                'topic' => $topic,
                'source' => $source,
                'payload' => $payload
            ))
        ));
        
        switch ($topic) {
            case 'product.created':
                return $this->handle_product_created($payload, $source);
                
            case 'product.updated':
                return $this->handle_product_updated($payload, $source);
                
            case 'product.deleted':
                return $this->handle_product_deleted($payload, $source);
                
            default:
                return new WP_REST_Response(array(
                    'message' => 'Webhook topic not supported'
                ), 400);
        }
    }
    
    private function handle_product_created($payload, $source) {
        // Handle product creation webhook
        return new WP_REST_Response(array('status' => 'success'), 200);
    }
    
    private function handle_product_updated($payload, $source) {
        // Handle product update webhook
        return new WP_REST_Response(array('status' => 'success'), 200);
    }
    
    private function handle_product_deleted($payload, $source) {
        // Handle product deletion webhook
        return new WP_REST_Response(array('status' => 'success'), 200);
    }
}