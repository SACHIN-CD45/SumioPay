<?php
/**
 * Plugin Name: SumioPay UPI Gateway for WooCommerce
 * Plugin URI: https://sumiopay.com/integrations/woocommerce
 * Description: Zero-fee, instant non-custodial UPI payment orchestration for WooCommerce with automatic real-time bank UTR verification.
 * Version: 2.4.0
 * Author: SumioPay Engineering Team
 * Author URI: https://sumiopay.com
 * License: MIT
 * Text Domain: sumiopay-woocommerce
 */

if (!defined('ABSPATH')) {
    exit; // Direct access prevention
}

add_action('plugins_loaded', 'sumiopay_woocommerce_gateway_init', 11);

function sumiopay_woocommerce_gateway_init() {
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class WC_Gateway_SumioPay extends WC_Payment_Gateway {

        public function __construct() {
            $this->id                 = 'sumiopay';
            $this->icon               = apply_filters('woocommerce_sumiopay_icon', 'https://sumiopay.com/assets/upi-badge.svg');
            $this->has_fields         = false;
            $this->method_title       = __('SumioPay UPI & Instant QR', 'sumiopay-woocommerce');
            $this->method_description = __('Accept direct UPI payments (GPay, PhonePe, Paytm, CRED, BHIM) with 0% gateway commission and instant UTR reconciliation.', 'sumiopay-woocommerce');

            // Load settings
            $this->init_form_fields();
            $this->init_settings();

            // Define user setting variables
            $this->title          = $this->get_option('title', 'Direct UPI (GPay / PhonePe / Paytm / BHIM)');
            $this->description    = $this->get_option('description', 'Scan dynamic QR or pay via any UPI app. Instant automated order confirmation.');
            $this->api_key        = $this->get_option('api_key');
            $this->project_id     = $this->get_option('project_id');
            $this->webhook_secret = $this->get_option('webhook_secret');
            $this->api_endpoint   = rtrim($this->get_option('api_endpoint', 'https://apipay.sumiotech.in'), '/');

            // Save admin options
            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));

            // Webhook IPN Listener Hook
            add_action('woocommerce_api_sumiopay_webhook', array($this, 'handle_sumiopay_webhook'));
        }

        public function init_form_fields() {
            $this->form_fields = array(
                'enabled' => array(
                    'title'   => __('Enable/Disable', 'sumiopay-woocommerce'),
                    'type'    => 'checkbox',
                    'label'   => __('Enable SumioPay UPI Gateway', 'sumiopay-woocommerce'),
                    'default' => 'yes',
                ),
                'title' => array(
                    'title'       => __('Title', 'sumiopay-woocommerce'),
                    'type'        => 'text',
                    'description' => __('Payment method title that customer sees at checkout.', 'sumiopay-woocommerce'),
                    'default'     => __('Direct UPI / Dynamic QR (0% Fee)', 'sumiopay-woocommerce'),
                    'desc_tip'    => true,
                ),
                'description' => array(
                    'title'       => __('Description', 'sumiopay-woocommerce'),
                    'type'        => 'textarea',
                    'description' => __('Payment method description that customer sees at checkout.', 'sumiopay-woocommerce'),
                    'default'     => __('Pay instantly using Google Pay, PhonePe, Paytm, BHIM or any UPI app. Instant auto-verification.', 'sumiopay-woocommerce'),
                ),
                'api_endpoint' => array(
                    'title'       => __('SumioPay API URL', 'sumiopay-woocommerce'),
                    'type'        => 'text',
                    'description' => __('Base API URL of your SumioPay instance.', 'sumiopay-woocommerce'),
                    'default'     => 'https://apipay.sumiotech.in',
                ),
                'api_key' => array(
                    'title'       => __('SumioPay API Key', 'sumiopay-woocommerce'),
                    'type'        => 'password',
                    'description' => __('Get this from SumioPay Dashboard > API Keys.', 'sumiopay-woocommerce'),
                    'default'     => '',
                ),
                'project_id' => array(
                    'title'       => __('Project ID', 'sumiopay-woocommerce'),
                    'type'        => 'text',
                    'description' => __('Project UUID from your SumioPay Merchant Dashboard.', 'sumiopay-woocommerce'),
                    'default'     => '',
                ),
                'webhook_secret' => array(
                    'title'       => __('Webhook Signing Secret', 'sumiopay-woocommerce'),
                    'type'        => 'password',
                    'description' => __('Secret used to verify HMAC-SHA256 signature on payment notifications.', 'sumiopay-woocommerce'),
                    'default'     => '',
                ),
                'webhook_url_display' => array(
                    'title'       => __('Your Webhook URL', 'sumiopay-woocommerce'),
                    'type'        => 'title',
                    'description' => sprintf(
                        __('Copy this URL to your SumioPay Dashboard > Webhooks:<br><code>%s</code>', 'sumiopay-woocommerce'),
                        WC()->api_request_url('sumiopay_webhook')
                    ),
                ),
            );
        }

        public function process_payment($order_id) {
            $order = wc_get_order($order_id);

            // Amount converted to integer minor units (paise)
            $amount_in_paise = (int) round($order->get_total() * 100);

            $payload = array(
                'amount'          => $amount_in_paise,
                'projectId'       => $this->project_id,
                'merchantOrderId' => (string) $order_id,
                'customerName'    => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'customerPhone'   => $order->get_billing_phone(),
                'customerEmail'   => $order->get_billing_email(),
                'notes'           => array(
                    'wc_order_id'    => $order_id,
                    'customer_email' => $order->get_billing_email(),
                ),
            );

            $response = wp_remote_post($this->api_endpoint . '/api/v1/payments/orders', array(
                'method'    => 'POST',
                'timeout'   => 30,
                'headers'   => array(
                    'Content-Type'  => 'application/json',
                    'x-api-key'     => $this->api_key,
                ),
                'body'      => json_encode($payload),
            ));

            if (is_wp_error($response)) {
                wc_add_notice(__('Unable to connect to SumioPay. Please try again.', 'sumiopay-woocommerce'), 'error');
                return array('result' => 'fail');
            }

            $body = json_decode(wp_remote_retrieve_body($response), true);

            if (empty($body['success']) || empty($body['data'])) {
                $err_msg = isset($body['message']) ? $body['message'] : 'Failed to create payment order.';
                wc_add_notice(__('Payment Gateway Error: ', 'sumiopay-woocommerce') . $err_msg, 'error');
                return array('result' => 'fail');
            }

            $payment_data = $body['data'];
            $sumiopay_order_id = $payment_data['orderId'];

            // Store SumioPay Order ID in WooCommerce order meta
            $order->update_meta_data('_sumiopay_order_id', $sumiopay_order_id);
            $order->update_meta_data('_sumiopay_allocated_paise', $payment_data['allocatedAmountPaise'] ?? $amount_in_paise);
            $order->save();

            // Set order to on-hold / pending payment
            $order->update_status('pending', sprintf(__('Awaiting UPI payment confirmation via SumioPay (Order #%s).', 'sumiopay-woocommerce'), $sumiopay_order_id));

            // Return checkout redirect URL
            $checkout_url = isset($payment_data['paymentUrl']) ? $payment_data['paymentUrl'] : $this->api_endpoint . '/checkout/' . $sumiopay_order_id;

            return array(
                'result'   => 'success',
                'redirect' => $checkout_url,
            );
        }

        public function handle_sumiopay_webhook() {
            $raw_payload = file_get_contents('php://input');
            $signature   = isset($_SERVER['HTTP_X_SUMIOPAY_SIGNATURE']) ? sanitize_text_field($_SERVER['HTTP_X_SUMIOPAY_SIGNATURE']) : '';

            if (empty($raw_payload)) {
                status_header(400);
                wp_send_json_error(array('message' => 'Empty webhook payload'));
                exit;
            }

            // Cryptographic HMAC-SHA256 Verification
            if (!empty($this->webhook_secret)) {
                $computed = hash_hmac('sha256', $raw_payload, $this->webhook_secret);
                if (!hash_equals($computed, $signature)) {
                    status_header(401);
                    wp_send_json_error(array('message' => 'Invalid HMAC-SHA256 signature'));
                    exit;
                }
            }

            $event = json_decode($raw_payload, true);
            if (empty($event['event']) || empty($event['data'])) {
                status_header(400);
                wp_send_json_error(array('message' => 'Malformed webhook format'));
                exit;
            }

            $event_type = $event['event'];
            $order_info = $event['data'];
            $wc_order_id = $order_info['merchantOrderId'] ?? null;

            if (!$wc_order_id) {
                status_header(200);
                wp_send_json_success(array('message' => 'No matching merchantOrderId'));
                exit;
            }

            $order = wc_get_order($wc_order_id);
            if (!$order) {
                status_header(404);
                wp_send_json_error(array('message' => 'WooCommerce Order not found'));
                exit;
            }

            if ($event_type === 'payment.paid' || $event_type === 'payment.reconciled') {
                $utr = $order_info['utr'] ?? 'N/A';
                $payer_vpa = $order_info['payerVpa'] ?? 'UPI';

                if (!$order->is_paid()) {
                    // Mark as payment complete with Bank UTR reference
                    $order->payment_complete($utr);
                    $order->add_order_note(sprintf(
                        __('SumioPay Verified Payment: UTR #%s from %s. Order marked as paid automatically.', 'sumiopay-woocommerce'),
                        $utr,
                        $payer_vpa
                    ));
                    $order->update_meta_data('_sumiopay_utr', $utr);
                    $order->update_meta_data('_sumiopay_payer_vpa', $payer_vpa);
                    $order->save();
                }
            } elseif ($event_type === 'payment.expired') {
                if ($order->get_status() === 'pending') {
                    $order->update_status('cancelled', __('SumioPay UPI payment window expired.', 'sumiopay-woocommerce'));
                }
            }

            status_header(200);
            wp_send_json_success(array('status' => 'Webhook processed successfully'));
            exit;
        }
    }

    function add_sumiopay_gateway_class($gateways) {
        $gateways[] = 'WC_Gateway_SumioPay';
        return $gateways;
    }
    add_filter('woocommerce_payment_gateways', 'add_sumiopay_gateway_class');
}
