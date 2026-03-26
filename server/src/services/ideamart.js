/**
 * Ideamart OTP Service
 * 
 * Dialog Axiata's Ideamart platform — OTP API only.
 * Used solely for phone number verification (send & verify OTP).
 * All payment/billing is handled by PayHere (see services/payhere.js).
 * 
 * Docs: https://docs.ideamart.io/developer-docs/
 * 
 * Environment variables:
 *   IDEAMART_APP_ID       — Application ID (e.g. APP_XXXXXX)
 *   IDEAMART_PASSWORD     — Application password hash
 *   IDEAMART_APP_HASH     — Unique reference UUID for OTP tracing
 *   IDEAMART_MOCK         — Set to "true" for dev/testing without real Ideamart
 */

const axios = require('axios');

// ─── Configuration ──────────────────────────────────────────────

const IDEAMART_BASE = 'https://api.ideamart.io';
const APP_ID = process.env.IDEAMART_APP_ID || 'APP_000000';
const PASSWORD = process.env.IDEAMART_PASSWORD || 'test_password_hash';
const APP_HASH = process.env.IDEAMART_APP_HASH || uuidv4().replace(/-/g, '').substring(0, 16);
const MOCK_MODE = process.env.IDEAMART_MOCK === 'true' || !process.env.IDEAMART_APP_ID;

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

module.exports = {
  normalizePhone,
  sendOtp,
  verifyOtp,
  MOCK_MODE,
};
