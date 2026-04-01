/**
 * PayHere Payment Gateway Service
 * 
 * Replaces Ideamart for all payment operations.
 * Supports:
 *   - Monthly recurring subscriptions (LKR 240/month)
 *   - One-time token top-ups (LKR 100, 250, 500)
 *   - Webhook notification verification (md5sig)
 * 
 * PayHere Plans:
 *   LITE  — 3.3% fee, no monthly fee, one-time only
 *   PLUS  — 2.99% fee, Rs 3990/month, supports recurring
 *   PREMIUM — 2.69% fee, Rs 9990/month, auto-charge
 * 
 * Environment variables:
 *   PAYHERE_MERCHANT_ID     — Merchant ID from PayHere dashboard
 *   PAYHERE_MERCHANT_SECRET — Merchant secret (from Domains & Credentials)
 *   PAYHERE_SANDBOX         — "true" to use sandbox (default in dev)
 *   PAYHERE_NOTIFY_BASE_URL — Public URL for webhook callbacks
 * 
 * Docs: https://support.payhere.lk/api-&-mobile-sdk/checkout-api
 *       https://support.payhere.lk/api-&-mobile-sdk/recurring-api
 */

const crypto = require('crypto');

// ─── Configuration ──────────────────────────────────────────────

const MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
if (!MERCHANT_ID || !MERCHANT_SECRET) {
  console.warn('⚠️  PAYHERE_MERCHANT_ID or PAYHERE_MERCHANT_SECRET not set — PayHere payments disabled');
}
const SANDBOX = process.env.PAYHERE_SANDBOX === 'true' || !process.env.PAYHERE_MERCHANT_ID;
const NOTIFY_BASE_URL = process.env.PAYHERE_NOTIFY_BASE_URL || 'https://api.grahachara.lk';

// PayHere checkout URLs
const CHECKOUT_URL = SANDBOX
  ? 'https://sandbox.payhere.lk/pay/checkout'
  : 'https://www.payhere.lk/pay/checkout';

// Monthly subscription amount (LKR 240/month via card/bank) — Sri Lanka default
const MONTHLY_AMOUNT = 240;
const MONTHLY_AMOUNT_FORMATTED = '240.00';

// Token top-up packages (includes per-feature charges: 100 for porondam, 350 for report)
const TOP_UP_PACKAGES = [100, 250, 350, 500];

// International pricing (USD)
const MONTHLY_AMOUNT_USD = 4;
const MONTHLY_AMOUNT_USD_FORMATTED = '4.00';
const TOP_UP_PACKAGES_USD = [2, 4, 5, 10];

// ─── Hash Generation ────────────────────────────────────────────

/**
 * Generate MD5 hash for PayHere checkout form.
 * Formula: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret).toUpperCase()).toUpperCase()
 * 
 * @param {string} orderId   — Unique order ID
 * @param {string} amount    — Formatted amount e.g. "240.00"
 * @param {string} currency  — "LKR"
 */
function generateHash(orderId, amount, currency = 'LKR') {
  const merchantSecretHash = crypto
    .createHash('md5')
    .update(MERCHANT_SECRET)
    .digest('hex')
    .toUpperCase();

  const raw = MERCHANT_ID + orderId + amount + currency + merchantSecretHash;

  return crypto
    .createHash('md5')
    .update(raw)
    .digest('hex')
    .toUpperCase();
}

/**
 * Verify PayHere webhook notification hash (md5sig).
 * Formula: MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret).toUpperCase()).toUpperCase()
 * 
 * @param {object} notification — The POST body from PayHere notify_url callback
 * @returns {boolean}
 */
function verifyNotification(notification) {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = notification;

  if (merchant_id !== MERCHANT_ID) {
    console.warn('[PayHere] ✖ Merchant ID mismatch:', merchant_id, 'vs', MERCHANT_ID);
    return false;
  }

  const merchantSecretHash = crypto
    .createHash('md5')
    .update(MERCHANT_SECRET)
    .digest('hex')
    .toUpperCase();

  const raw = merchant_id + order_id + payhere_amount + payhere_currency + status_code + merchantSecretHash;

  const expectedHash = crypto
    .createHash('md5')
    .update(raw)
    .digest('hex')
    .toUpperCase();

  const valid = expectedHash === md5sig;
  if (!valid) {
    console.warn('[PayHere] ✖ Hash mismatch. Expected:', expectedHash, 'Got:', md5sig);
  }
  return valid;
}

// ─── Payment Object Builders ────────────────────────────────────

/**
 * Build payment object for monthly recurring subscription.
 * Used by the React Native SDK (PayHere.startPayment).
 * 
 * @param {object} params
 * @param {string} params.orderId    — Unique order ID (e.g. "SUB_phone_xxx_timestamp")
 * @param {string} params.firstName  — Customer first name
 * @param {string} params.lastName   — Customer last name
 * @param {string} params.email      — Customer email (required by PayHere)
 * @param {string} params.phone      — Customer phone (07XXXXXXXX)
 * @param {string} params.userId     — Internal user ID (stored in custom_1)
 * @param {string} [params.currency] — 'LKR' or 'USD' (default: 'LKR')
 */
function buildSubscriptionPayment(params) {
  const {
    orderId,
    firstName = 'Grahachara',
    lastName = 'User',
    email = 'user@grahachara.lk',
    phone = '0770000000',
    userId = '',
    currency = 'LKR',
  } = params;

  const isUSD = currency === 'USD';
  const amount = isUSD ? MONTHLY_AMOUNT_USD_FORMATTED : MONTHLY_AMOUNT_FORMATTED;

  return {
    sandbox: SANDBOX,
    merchant_id: MERCHANT_ID,
    notify_url: NOTIFY_BASE_URL + '/api/payhere/notify',
    return_url: NOTIFY_BASE_URL + '/api/payhere/return',
    cancel_url: NOTIFY_BASE_URL + '/api/payhere/cancel',
    order_id: orderId,
    items: 'Grahachara Monthly Subscription',
    amount: amount,
    recurrence: '1 Month',
    duration: 'Forever',
    currency: currency,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    address: isUSD ? 'International' : 'Sri Lanka',
    city: isUSD ? 'N/A' : 'Colombo',
    country: isUSD ? 'N/A' : 'Sri Lanka',
    custom_1: userId,    // Store internal user ID
    custom_2: 'monthly', // Plan identifier
  };
}

/**
 * Build payment object for one-time token top-up.
 * Used by the React Native SDK (PayHere.startPayment).
 * 
 * @param {object} params
 * @param {string} params.orderId
 * @param {number} params.amount     — Amount in the specified currency
 * @param {string} params.firstName
 * @param {string} params.lastName
 * @param {string} params.email
 * @param {string} params.phone
 * @param {string} params.userId
 * @param {string} [params.currency] — 'LKR' or 'USD' (default: 'LKR')
 */
function buildTopUpPayment(params) {
  const {
    orderId,
    amount,
    firstName = 'Grahachara',
    lastName = 'User',
    email = 'user@grahachara.lk',
    phone = '0770000000',
    userId = '',
    currency = 'LKR',
  } = params;

  const isUSD = currency === 'USD';
  const amountFormatted = parseFloat(amount).toFixed(2);
  const currencyLabel = isUSD ? `$${amount}` : `LKR ${amount}`;

  return {
    sandbox: SANDBOX,
    merchant_id: MERCHANT_ID,
    notify_url: NOTIFY_BASE_URL + '/api/payhere/notify-topup',
    order_id: orderId,
    items: `Grahachara Payment ${currencyLabel}`,
    amount: amountFormatted,
    currency: currency,
    first_name: firstName,
    last_name: lastName,
    email: email,
    phone: phone,
    address: isUSD ? 'International' : 'Sri Lanka',
    city: isUSD ? 'N/A' : 'Colombo',
    country: isUSD ? 'N/A' : 'Sri Lanka',
    custom_1: userId,
    custom_2: 'topup',
  };
}

/**
 * Build the hash for a payment object.
 * Must be called server-side; the hash is then sent to the mobile app
 * so it can start the PayHere SDK payment.
 * 
 * @param {string} orderId
 * @param {string} amount   — Formatted amount e.g. "240.00"
 * @param {string} currency — 'LKR' or 'USD'
 */
function buildPaymentHash(orderId, amount, currency) {
  return generateHash(orderId, amount, currency || 'LKR');
}

// ─── Payment Status Codes ───────────────────────────────────────

const STATUS_CODES = {
  SUCCESS: 2,
  PENDING: 0,
  CANCELED: -1,
  FAILED: -2,
  CHARGEDBACK: -3,
};

/**
 * Recurring notification message types
 */
const RECURRING_TYPES = {
  AUTH_SUCCESS: 'AUTHORIZATION_SUCCESS',
  INSTALLMENT_SUCCESS: 'RECURRING_INSTALLMENT_SUCCESS',
  INSTALLMENT_FAILED: 'RECURRING_INSTALLMENT_FAILED',
  COMPLETE: 'RECURRING_COMPLETE',
  STOPPED: 'RECURRING_STOPPED',
};

/**
 * Recurring item status values
 */
const RECURRING_STATUS = {
  ACTIVE: 0,
  CANCELLED: -1,
  COMPLETED: 1,
};

// ─── Exports ────────────────────────────────────────────────────

module.exports = {
  // Config
  MERCHANT_ID,
  SANDBOX,
  CHECKOUT_URL,
  MONTHLY_AMOUNT,
  TOP_UP_PACKAGES,
  MONTHLY_AMOUNT_USD,
  TOP_UP_PACKAGES_USD,

  // Hash & verification
  generateHash,
  verifyNotification,
  buildPaymentHash,

  // Payment builders (for mobile SDK)
  buildSubscriptionPayment,
  buildTopUpPayment,

  // Constants
  STATUS_CODES,
  RECURRING_TYPES,
  RECURRING_STATUS,
};
