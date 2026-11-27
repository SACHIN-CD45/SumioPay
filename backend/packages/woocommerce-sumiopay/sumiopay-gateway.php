<?php
/**
 * Plugin Name: SumioPay UPI Gateway for WooCommerce
 * Plugin URI: https://sumiopay.sumiotech.in/guide
 * Description: Non-custodial direct UPI payment orchestration for WooCommerce with automatic real-time bank UTR verification and Enterprise Bills.
 * Version: 2.9.0
 * Author: SumioTech Engineering Team
 * Author URI: https://sumiopay.sumiotech.in
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
        /** @var string */
        private $api_key = '';
        /** @var string */
        private $api_secret = '';
        /** @var string */
        private $website_name = '';
        /** @var string */
        private $brand_color = '#4F3DF5';
        /** @var string */
        private $webhook_secret = '';
        /** @var string */
        private $api_endpoint = 'https://apipay.sumiotech.in';

        public function __construct() {
            $this->id                 = 'sumiopay';
            $this->icon               = apply_filters('woocommerce_sumiopay_icon', 'https://sumiopay.sumiotech.in/sumiopay-icon.png');
            $this->has_fields         = false;
            $this->method_title       = __('SumioPay UPI & Instant QR', 'sumiopay-woocommerce');
            $this->method_description = __('Accept direct UPI payments (GPay, PhonePe, Paytm, CRED, BHIM) settled 100% directly into your bank with instant automated verification.', 'sumiopay-woocommerce');

            $this->init_form_fields();
            $this->init_settings();

            $this->title          = $this->get_option('title', 'UPI (GPay / PhonePe / Paytm / BHIM)');
            $this->description    = $this->get_option('description', 'Scan dynamic QR or pay via any UPI app. Instant automated order confirmation.');
            $this->api_key        = $this->get_option('api_key');
            $this->api_secret     = $this->get_option('api_secret');
            $this->website_name   = $this->get_option('website_name', get_bloginfo('name'));
            $this->brand_color    = $this->get_option('brand_color', '#4F3DF5');
            $this->webhook_secret = $this->get_option('webhook_secret');
            $this->api_endpoint   = rtrim($this->get_option('api_endpoint', 'https://apipay.sumiotech.in'), '/');

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
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
                    'default'     => __('UPI / QR (GPay, PhonePe, Paytm, BHIM)', 'sumiopay-woocommerce'),
                    'desc_tip'    => true,
                ),
                'description' => array(
                    'title'       => __('Description', 'sumiopay-woocommerce'),
                    'type'        => 'textarea',
                    'description' => __('Payment method description that customer sees at checkout.', 'sumiopay-woocommerce'),
                    'default'     => __('Pay instantly using Google Pay, PhonePe, Paytm, BHIM or any UPI app.', 'sumiopay-woocommerce'),
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
                    'description' => __('sp_live_... or sp_test_... key from SumioPay Dashboard > Connect.', 'sumiopay-woocommerce'),
                    'default'     => '',
                ),
                'api_secret' => array(
                    'title'       => __('SumioPay API Secret', 'sumiopay-woocommerce'),
                    'type'        => 'password',
                    'description' => __('sp_sec_... secret from SumioPay Dashboard > Connect (required for webhook overrides & refunds).', 'sumiopay-woocommerce'),
                    'default'     => '',
                ),
                'website_name' => array(
                    'title'       => __('Checkout Brand Name', 'sumiopay-woocommerce'),
                    'type'        => 'text',
                    'description' => __('Store name displayed on the hosted checkout page.', 'sumiopay-woocommerce'),
                    'default'     => get_bloginfo('name'),
                ),
                'brand_color' => array(
                    'title'       => __('Brand Accent Color (Hex)', 'sumiopay-woocommerce'),
                    'type'        => 'text',
                    'description' => __('e.g. #4F3DF5', 'sumiopay-woocommerce'),
                    'default'     => '#4F3DF5',
                ),
                'webhook_secret' => array(
                    'title'       => __('Webhook Signing Secret', 'sumiopay-woocommerce'),
                    'type'        => 'password',
                    'description' => __('Webhook secret from SumioPay Dashboard > Connect for HMAC-SHA256 verification.', 'sumiopay-woocommerce'),
                    'default'     => '',
                ),
                'webhook_url_display' => array(
                    'title'       => __('Your WooCommerce Webhook URL', 'sumiopay-woocommerce'),
                    'type'        => 'title',
                    'description' => sprintf(
                        __('Paste this URL in SumioPay Dashboard > Webhooks:<br><code>%s</code>', 'sumiopay-woocommerce'),
                        WC()->api_request_url('sumiopay_webhook')
                    ),
                ),
            );
        }

        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            $amount_in_paise = (int) round($order->get_total() * 100);
            $return_url = $this->get_return_url($order);

            $items = array();
            foreach ($order->get_items() as $item) {
                $items[] = array(
                    'label'    => $item->get_name(),
                    'quantity' => (int) $item->get_quantity(),
                    'amount'   => (float) $item->get_total(),
                );
            }

            $payload = array(
                'amountInPaise'      => $amount_in_paise,
                'appName'            => 'WOOCOMMERCE',
                'customerUserId'     => (string) ($order->get_customer_id() ?: ('wc_' . $order_id)),
                'customerPhone'      => $order->get_billing_phone(),
                'customerEmail'      => $order->get_billing_email(),
                'websiteName'        => $this->website_name ?: get_bloginfo('name'),
                'brandColor'         => $this->brand_color ?: '#4F3DF5',
                'callbackWebhookUrl' => WC()->api_request_url('sumiopay_webhook'),
                'billDetails'        => array(
                    'items'          => $items,
                    'subtotal'       => (float) $order->get_subtotal() + (float) $order->get_discount_total(),
                    'discountAmount' => (float) $order->get_discount_total(),
                    'taxAmount'      => (float) $order->get_total_tax(),
                    'returnUrl'      => $return_url,
                ),
                'metadata'           => array(
                    'wc_order_id'   => (string) $order_id,
                    'customerName'  => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
                    'returnUrl'     => $return_url,
                ),
            );

            $headers = array(
                'Content-Type'    => 'application/json',
                'x-api-key'       => $this->api_key,
                'Idempotency-Key' => 'wc_' . $order_id . '_' . $amount_in_paise,
            );
            if (!empty($this->api_secret)) {
                $headers['x-api-secret'] = $this->api_secret;
            }

            $response = wp_remote_post($this->api_endpoint . '/api/v1/payments/orders', array(
                'method'  => 'POST',
                'timeout' => 30,
                'headers' => $headers,
                'body'    => wp_json_encode($payload),
            ));

            if (is_wp_error($response)) {
                wc_add_notice(__('Unable to connect to SumioPay. Please try again.', 'sumiopay-woocommerce'), 'error');
                return array('result' => 'fail');
            }

            $body = json_decode(wp_remote_retrieve_body($response), true);

            if (empty($body['success']) || empty($body['data'])) {
                $err_msg = $body['error']['message'] ?? $body['message'] ?? 'Failed to create payment order.';
                wc_add_notice(__('Payment Gateway Error: ', 'sumiopay-woocommerce') . $err_msg, 'error');
                return array('result' => 'fail');
            }

            $payment_data = $body['data'];
            $sumiopay_order_id = $payment_data['orderId'];

            $order->update_meta_data('_sumiopay_order_id', $sumiopay_order_id);
            $order->update_meta_data('_sumiopay_exact_paise', $payment_data['exactAmountInPaise'] ?? $amount_in_paise);
            $order->save();

            $order->update_status('pending', sprintf(__('Awaiting UPI payment confirmation via SumioPay (Order #%s).', 'sumiopay-woocommerce'), $sumiopay_order_id));

            $checkout_url = $payment_data['hostedCheckoutUrl'] ?? $payment_data['checkoutUrl'] ?? ('https://sumiopay.sumiotech.in/pay/' . $sumiopay_order_id);

            return array(
                'result'   => 'success',
                'redirect' => $checkout_url,
            );
        }

        public function handle_sumiopay_webhook() {
            $raw_payload = file_get_contents('php://input');
            $signature   = isset($_SERVER['HTTP_X_SUMIOPAY_SIGNATURE']) ? sanitize_text_field($_SERVER['HTTP_X_SUMIOPAY_SIGNATURE']) : '';
            $timestamp   = isset($_SERVER['HTTP_X_SUMIOPAY_TIMESTAMP']) ? sanitize_text_field($_SERVER['HTTP_X_SUMIOPAY_TIMESTAMP']) : '';

            if (empty($raw_payload)) {
                status_header(400);
                wp_send_json_error(array('message' => 'Empty webhook payload'));
                exit;
            }

            // Cryptographic HMAC-SHA256 Verification (${timestamp}.${rawBody} with 300s replay window)
            if (!empty($this->webhook_secret)) {
                if (empty($timestamp) || !ctype_digit((string) $timestamp) || abs(time() - (int) $timestamp) > 300) {
                    status_header(401);
                    wp_send_json_error(array('message' => 'Expired or missing webhook timestamp'));
                    exit;
                }
                $signed_payload = $timestamp . '.' . $raw_payload;
                $computed = hash_hmac('sha256', $signed_payload, $this->webhook_secret);
                if (!hash_equals($computed, $signature)) {
                    status_header(401);
                    wp_send_json_error(array('message' => 'Invalid HMAC-SHA256 signature'));
                    exit;
                }
            }

            $event = json_decode($raw_payload, true);
            $event_type = $event['type'] ?? $event['event'] ?? '';
            if (empty($event_type) || empty($event['data'])) {
                status_header(400);
                wp_send_json_error(array('message' => 'Malformed webhook format'));
                exit;
            }

            $order_info = $event['data'];
            $meta = isset($order_info['metadata']) && is_array($order_info['metadata']) ? $order_info['metadata'] : array();
            $wc_order_id = $meta['wc_order_id'] ?? $order_info['merchantOrderId'] ?? null;

            if (!$wc_order_id) {
                status_header(200);
                wp_send_json_success(array('message' => 'No matching wc_order_id'));
                exit;
            }

            $order = wc_get_order($wc_order_id);
            if (!$order) {
                status_header(404);
                wp_send_json_error(array('message' => 'WooCommerce Order not found'));
                exit;
            }

            if ($event_type === 'payment.succeeded' || $event_type === 'payment.paid' || $event_type === 'payment.reconciled') {
                $utr = $order_info['utrNumber'] ?? $order_info['utr'] ?? 'CONFIRMED';

                if (!$order->is_paid()) {
                    $order->payment_complete($utr);
                    $order->add_order_note(sprintf(
                        __('SumioPay Verified Payment: UTR #%s. Order marked paid automatically.', 'sumiopay-woocommerce'),
                        $utr
                    ));
                    $order->update_meta_data('_sumiopay_utr', $utr);
                    $order->save();
                }
            } elseif ($event_type === 'payment.expired' || $event_type === 'payment.cancelled') {
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
