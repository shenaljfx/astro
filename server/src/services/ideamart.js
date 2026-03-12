/**
 * Ideamart Integration Service
 * 
 * Dialog Axiata's Ideamart platform APIs:
 * - OTP API: Send & verify phone OTPs (user registration/login)
 * - Charging API: Direct Debit (charge LKR from mobile credit)
 * - Subscription API: Register/unregister, check status
 * 
 * Docs: https://docs.ideamart.io/developer-docs/
 * 
 * Environment variables:
 *   IDEAMART_APP_ID       — Application ID (e.g. APP_XXXXXX)
 *   IDEAMART_PASSWORD     — Application password hash
 *   IDEAMART_APP_HASH     — Unique reference UUID for OTP tracing
 *   IDEAMART_MOCK         — Set to "true" for dev/testing without real Ideamart
 *   DAILY_CHARGE_LKR      — Daily charge amount (default: 8)
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ─── Configuration ──────────────────────────────────────────────

const IDEAMART_BASE = 'https://api.ideamart.io';
const APP_ID = process.env.IDEAMART_APP_ID || 'APP_000000';
const PASSWORD = process.env.IDEAMART_PASSWORD || 'test_password_hash';
const APP_HASH = process.env.IDEAMART_APP_HASH || uuidv4().replace(/-/g, '').substring(0, 16);
const MOCK_MODE = process.env.IDEAMART_MOCK === 'true' || !process.env.IDEAMART_APP_ID;
const DAILY_CHARGE = parseFloat(process.env.DAILY_CHARGE_LKR) || 8;

// ─── Helper ─────────────────────────────────────────────────────

/**
 * Normalize Sri Lankan phone number to tel:94XXXXXXXXX format
 * Accepts: 07X XXXXXXX, +947X XXXXXXX, 947XXXXXXXXX, etc.
 */
function normalizePhone(phone) {
  if (!phone) return null;
  // Strip spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Remove tel: prefix if present
  cleaned = cleaned.replace(/^tel:/, '');
  // Remove + prefix
  cleaned = cleaned.replace(/^\+/, '');
  // Convert 07X to 947X
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '94' + cleaned.substring(1);
  }
  // Ensure starts with 94
  if (!cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
  }
  return cleaned;
}

function formatSubscriberId(phone) {
  return 'tel:' + normalizePhone(phone);
}

// ─── Mock Responses (for development without Ideamart account) ──

const mockOtpStore = new Map(); // referenceNo -> { phone, otp, expiresAt, attempts }

function generateMockOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

// ─── OTP API ────────────────────────────────────────────────────

/**
 * Send OTP to a phone number
 * 
 * POST https://api.ideamart.io/subscription/otp/request
 * 
 * @param {string} phone — Raw phone number (any format)
 * @returns {{ success, referenceNo, statusCode, statusDetail }}
 */
async function sendOtp(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 11) {
    return { success: false, error: 'Invalid phone number', statusCode: 'E1000' };
  }

  // ─── MOCK MODE ───
  if (MOCK_MODE) {
    const otp = generateMockOtp();
    const referenceNo = uuidv4().replace(/-/g, '');
    mockOtpStore.set(referenceNo, {
      phone: normalized,
      otp,
      expiresAt: Date.now() + 60 * 60 * 1000, // 60 min
      attempts: 0,
    });
    console.log(`📱 [MOCK OTP] Phone: ${normalized}, OTP: ${otp}, Ref: ${referenceNo}`);
    return {
      success: true,
      referenceNo,
      statusCode: 'S1000',
      statusDetail: 'Success',
      mock: true,
      // In mock mode, return the OTP for testing
      _devOtp: otp,
    };
  }

  // ─── LIVE MODE ───
  try {
    const res = await axios.post(`${IDEAMART_BASE}/subscription/otp/request`, {
      applicationId: APP_ID,
      password: PASSWORD,
      subscriberId: formatSubscriberId(normalized),
      applicationHash: APP_HASH,
      applicationMetaData: {
        client: 'MOBILEAPP',
        device: 'Smartphone',
        os: 'cross-platform',
        appCode: 'lk.nakath.ai',
      },
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    if (data.statusCode === 'S1000') {
      return {
        success: true,
        referenceNo: data.referenceNo,
        statusCode: data.statusCode,
        statusDetail: data.statusDetail,
      };
    }

    // E1351 = user already registered
    if (data.statusCode === 'E1351') {
      return {
        success: false,
        error: 'Phone number already registered',
        statusCode: data.statusCode,
        statusDetail: data.statusDetail,
        alreadyRegistered: true,
      };
    }

    return {
      success: false,
      error: data.statusDetail || 'OTP request failed',
      statusCode: data.statusCode,
    };
  } catch (err) {
    console.error('Ideamart OTP send error:', err.message);
    return {
      success: false,
      error: 'Failed to send OTP. Please try again.',
      statusCode: 'E9999',
    };
  }
}

/**
 * Verify OTP code
 * 
 * POST https://api.ideamart.io/subscription/otp/verify
 * 
 * @param {string} referenceNo — From sendOtp response
 * @param {string} otp — 6-digit code entered by user
 * @param {string} phone — Original phone number (for mock mode)
 * @returns {{ success, subscriberId, statusCode, statusDetail }}
 */
async function verifyOtp(referenceNo, otp, phone) {
  if (!referenceNo || !otp) {
    return { success: false, error: 'Reference number and OTP are required', statusCode: 'E1000' };
  }

  // ─── MOCK MODE ───
  if (MOCK_MODE) {
    const normalized = normalizePhone(phone);
    const stored = mockOtpStore.get(referenceNo);

    if (!stored) {
      return { success: false, error: 'Invalid or expired reference number. Please resend OTP.', statusCode: 'E1850' };
    }
    if (stored.phone !== normalized) {
      return { success: false, error: 'Phone number mismatch', statusCode: 'E1850' };
    }
    if (Date.now() > stored.expiresAt) {
      mockOtpStore.delete(referenceNo);
      return { success: false, error: 'OTP expired. Please resend.', statusCode: 'E1851' };
    }
    if (stored.attempts >= 3) {
      mockOtpStore.delete(referenceNo);
      return { success: false, error: 'Maximum OTP attempts exceeded. Please resend.', statusCode: 'E1852' };
    }
    stored.attempts++;

    if (stored.otp !== otp) {
      return { success: false, error: 'Invalid OTP code', statusCode: 'E1850' };
    }

    mockOtpStore.delete(referenceNo);
    // Generate a mock masked subscriberId
    const mockSubscriberId = 'tel:mock_' + normalized;
    console.log(`✅ [MOCK OTP VERIFIED] Phone: ${normalized}, SubscriberId: ${mockSubscriberId}`);
    return {
      success: true,
      subscriberId: mockSubscriberId,
      statusCode: 'S1000',
      statusDetail: 'Success',
      subscriptionStatus: 'REGISTERED',
      mock: true,
    };
  }

  // ─── LIVE MODE ───
  try {
    const res = await axios.post(`${IDEAMART_BASE}/subscription/otp/verify`, {
      applicationId: APP_ID,
      password: PASSWORD,
      referenceNo: referenceNo,
      otp: otp,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    if (data.statusCode === 'S1000') {
      return {
        success: true,
        subscriberId: data.subscriberId, // Masked MSISDN for future API calls
        statusCode: data.statusCode,
        statusDetail: data.statusDetail,
        subscriptionStatus: data.subscriptionStatus,
      };
    }

    // Error codes: E1850 (invalid OTP), E1851 (expired), E1852 (max attempts)
    const errorMessages = {
      'E1850': 'Invalid OTP code. Please try again.',
      'E1851': 'OTP has expired. Please request a new one.',
      'E1852': 'Too many attempts. Please request a new OTP.',
    };

    return {
      success: false,
      error: errorMessages[data.statusCode] || data.statusDetail || 'Verification failed',
      statusCode: data.statusCode,
    };
  } catch (err) {
    console.error('Ideamart OTP verify error:', err.message);
    return {
      success: false,
      error: 'Verification failed. Please try again.',
      statusCode: 'E9999',
    };
  }
}

// ─── CHARGING API (Direct Debit) ────────────────────────────────

/**
 * Charge user's mobile credit
 * 
 * POST https://api.ideamart.io/caas/direct/debit
 * 
 * @param {string} subscriberId — Masked MSISDN from OTP verify
 * @param {number} amount — Amount in LKR (default: DAILY_CHARGE)
 * @returns {{ success, transactionId, statusCode }}
 */
async function chargeUser(subscriberId, amount) {
  if (!subscriberId) {
    return { success: false, error: 'Subscriber ID required', statusCode: 'E1000' };
  }

  const chargeAmount = amount || DAILY_CHARGE;
  const externalTrxId = uuidv4().replace(/-/g, '');

  // ─── MOCK MODE ───
  if (MOCK_MODE) {
    console.log(`💰 [MOCK CHARGE] SubscriberId: ${subscriberId}, Amount: LKR ${chargeAmount}`);
    return {
      success: true,
      transactionId: externalTrxId,
      internalTrxId: 'mock_' + Date.now(),
      amount: chargeAmount,
      currency: 'LKR',
      statusCode: 'S1000',
      statusDetail: 'Success',
      mock: true,
    };
  }

  // ─── LIVE MODE ───
  try {
    const res = await axios.post(`${IDEAMART_BASE}/caas/direct/debit`, {
      applicationId: APP_ID,
      password: PASSWORD,
      externalTrxId: externalTrxId,
      subscriberId: subscriberId,
      paymentInstrument: 'MobileAccount',
      currency: 'LKR',
      amount: String(chargeAmount),
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    if (data.statusCode === 'S1000') {
      return {
        success: true,
        transactionId: data.externalTrxId,
        internalTrxId: data.internalTrxId,
        amount: chargeAmount,
        currency: 'LKR',
        statusCode: data.statusCode,
        statusDetail: data.statusDetail,
        timestamp: data.timeStamp,
      };
    }

    return {
      success: false,
      error: data.statusDetail || 'Charging failed',
      statusCode: data.statusCode,
    };
  } catch (err) {
    console.error('Ideamart charge error:', err.message);
    return {
      success: false,
      error: 'Payment failed. Insufficient balance or network error.',
      statusCode: 'E9999',
    };
  }
}

/**
 * Check user's mobile balance
 * 
 * @param {string} subscriberId — Masked MSISDN
 * @returns {{ success, balance, accountType, accountStatus }}
 */
async function queryBalance(subscriberId) {
  if (!subscriberId) {
    return { success: false, error: 'Subscriber ID required' };
  }

  if (MOCK_MODE) {
    return {
      success: true,
      balance: '500.00',
      accountType: 'Pre Paid',
      accountStatus: 'Active',
      mock: true,
    };
  }

  try {
    const res = await axios.post(`${IDEAMART_BASE}/caas/balance/query`, {
      applicationId: APP_ID,
      password: PASSWORD,
      subscriberId: subscriberId,
      currency: 'LKR',
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    if (data.statusCode === 'S1000') {
      return {
        success: true,
        balance: data.chargeableBalance,
        accountType: data.accountType,
        accountStatus: data.accountStatus,
      };
    }

    return { success: false, error: data.statusDetail || 'Balance query failed' };
  } catch (err) {
    console.error('Ideamart balance query error:', err.message);
    return { success: false, error: 'Failed to check balance' };
  }
}

// ─── SUBSCRIPTION API ───────────────────────────────────────────

/**
 * Register user for subscription (opt-in)
 * 
 * @param {string} subscriberId — Masked MSISDN
 * @returns {{ success, subscriptionStatus }}
 */
async function registerSubscription(subscriberId) {
  if (MOCK_MODE) {
    console.log(`📋 [MOCK SUBSCRIBE] SubscriberId: ${subscriberId}`);
    return { success: true, subscriptionStatus: 'REGISTERED', mock: true };
  }

  try {
    const res = await axios.post(`${IDEAMART_BASE}/subscription/send`, {
      applicationId: APP_ID,
      password: PASSWORD,
      version: '1.0',
      action: '1', // 1 = Opt In
      subscriberId: subscriberId,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    return {
      success: data.statusCode === 'S1000',
      subscriptionStatus: data.subscriptionStatus,
      statusCode: data.statusCode,
      statusDetail: data.statusDetail,
    };
  } catch (err) {
    console.error('Ideamart subscription error:', err.message);
    return { success: false, error: 'Subscription failed' };
  }
}

/**
 * Unregister user from subscription (opt-out)
 */
async function unregisterSubscription(subscriberId) {
  if (MOCK_MODE) {
    console.log(`📋 [MOCK UNSUBSCRIBE] SubscriberId: ${subscriberId}`);
    return { success: true, subscriptionStatus: 'UNREGISTERED', mock: true };
  }

  try {
    const res = await axios.post(`${IDEAMART_BASE}/subscription/send`, {
      applicationId: APP_ID,
      password: PASSWORD,
      version: '1.0',
      action: '0', // 0 = Opt Out
      subscriberId: subscriberId,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    return {
      success: data.statusCode === 'S1000',
      subscriptionStatus: data.subscriptionStatus,
    };
  } catch (err) {
    console.error('Ideamart unsubscribe error:', err.message);
    return { success: false, error: 'Unsubscription failed' };
  }
}

/**
 * Check subscription status
 * 
 * @param {string} subscriberId — Masked MSISDN
 * @returns {{ success, subscriptionStatus }}
 */
async function checkSubscriptionStatus(subscriberId) {
  if (MOCK_MODE) {
    return { success: true, subscriptionStatus: 'REGISTERED', mock: true };
  }

  try {
    const res = await axios.post(`${IDEAMART_BASE}/subscription/getStatus`, {
      applicationId: APP_ID,
      password: PASSWORD,
      subscriberId: subscriberId,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const data = res.data;
    return {
      success: data.statusCode === 'S1000',
      subscriptionStatus: data.subscriptionStatus,
      statusCode: data.statusCode,
    };
  } catch (err) {
    console.error('Ideamart status check error:', err.message);
    return { success: false, error: 'Status check failed' };
  }
}

module.exports = {
  normalizePhone,
  sendOtp,
  verifyOtp,
  chargeUser,
  queryBalance,
  registerSubscription,
  unregisterSubscription,
  checkSubscriptionStatus,
  DAILY_CHARGE,
  MOCK_MODE,
};
