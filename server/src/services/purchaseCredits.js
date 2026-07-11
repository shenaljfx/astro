/**
 * PURCHASE CREDITS — consumable one-time product purchases.
 *
 * WHY THIS EXISTS:
 *   The RevenueCat webhook used to treat every NON_RENEWING_PURCHASE as a
 *   lifetime subscription (isSubscribed: true, isLifetime: true). But that
 *   event fires for ALL one-time products — so buying one LKR 750 report
 *   granted unlimited Pro access forever, undercutting the monthly plan.
 *
 * THE MODEL:
 *   A one-time product purchase now writes ONE credit record. A credit
 *   admits the buyer to exactly one generation of that product type:
 *     full_report    → one 'report' generation
 *     porondam_check → one 'porondam' check + AI report
 *   The credit is consumed when a NEW generation entitlement is created
 *   (middleware/entitlements.js). Failed generations retry on the pending
 *   entitlement without needing another credit — "pay once, generate until
 *   success" is preserved.
 *
 * IDEMPOTENCY:
 *   Credits are written with a deterministic doc ID derived from the
 *   RevenueCat event ID, so webhook retries/replays can never mint extra
 *   credits (the webhook also has its own event-claim dedup upstream).
 */

const crypto = require('crypto');
const { getDb, COLLECTIONS } = require('../config/firebase');

// Map store product IDs → entitlement/credit types (matches the `type`
// vocabulary used by middleware/entitlements.js).
const PRODUCT_CREDIT_TYPES = {
  full_report: 'report',
  porondam_check: 'porondam',
  baby_kendara: 'babyKendara',
};

function creditTypeForProduct(productId) {
  return PRODUCT_CREDIT_TYPES[productId] || null;
}

function creditDocId(uid, eventId) {
  // Deterministic + collision-safe even for very long event IDs.
  const hash = crypto.createHash('sha256').update(`${uid}:${eventId}`).digest('hex');
  return `credit_${hash.slice(0, 40)}`;
}

/**
 * Record a purchase credit for a one-time product. Idempotent per
 * (uid, eventId) — calling twice with the same event is a no-op.
 *
 * @param {string} uid       - Firebase user ID
 * @param {string} productId - Store product ID (e.g. 'full_report')
 * @param {object} meta      - { eventId, store, purchaseDate, environment }
 * @returns {object|null} { id, type, created } or null when product isn't creditable
 */
async function addPurchaseCredit(uid, productId, meta = {}) {
  const type = creditTypeForProduct(productId);
  if (!type) return null;

  const db = getDb();
  if (!db) {
    console.warn('[Credits] No database — credit not persisted (dev mode)');
    return { id: 'dev-credit', type, created: false, mock: true };
  }

  const eventId = meta.eventId || crypto.randomUUID();
  const docId = creditDocId(uid, eventId);
  const ref = db.collection(COLLECTIONS.PURCHASE_CREDITS).doc(docId);

  const created = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (doc.exists) return false; // webhook replay — already recorded
    tx.set(ref, {
      uid,
      type,
      productId,
      status: 'available',
      eventId,
      store: meta.store || 'unknown',
      environment: meta.environment || 'PRODUCTION',
      purchasedAt: meta.purchaseDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      consumedAt: null,
      entitlementId: null,
    });
    return true;
  });

  if (created) {
    console.log(`[Credits] ✅ ${type} credit recorded for ${uid} (product: ${productId})`);
  } else {
    console.log(`[Credits] ♻️ Duplicate credit event ignored for ${uid} (${eventId})`);
  }
  return { id: docId, type, created };
}

/**
 * Find the oldest available credit of a type for a user.
 * @returns {object|null} { id, type, productId, purchasedAt } or null
 */
async function getAvailableCredit(uid, type) {
  const db = getDb();
  if (!db || !uid) return null;

  const snap = await db.collection(COLLECTIONS.PURCHASE_CREDITS)
    .where('uid', '==', uid)
    .where('type', '==', type)
    .where('status', '==', 'available')
    .limit(5)
    .get();

  if (snap.empty) return null;
  // Oldest first so credits are consumed in purchase order.
  const docs = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const c = docs[0];
  return { id: c.id, type: c.type, productId: c.productId, purchasedAt: c.purchasedAt };
}

/**
 * Consume a credit (transactional — only succeeds if still available).
 * Called when a NEW generation entitlement is created for the buyer.
 *
 * @param {string} creditId
 * @param {string} entitlementId - The generation entitlement this credit paid for
 * @returns {boolean} true if this call consumed the credit
 */
async function consumeCredit(creditId, entitlementId) {
  const db = getDb();
  if (!db || !creditId || creditId === 'dev-credit') return true;

  const ref = db.collection(COLLECTIONS.PURCHASE_CREDITS).doc(creditId);
  const consumed = await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists || doc.data().status !== 'available') return false;
    tx.update(ref, {
      status: 'consumed',
      entitlementId: entitlementId || null,
      consumedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  });

  if (consumed) {
    console.log(`[Credits] 🎫 Consumed credit ${creditId} → entitlement ${entitlementId}`);
  } else {
    console.warn(`[Credits] ⚠️ Credit ${creditId} was not available to consume (already used?)`);
  }
  return consumed;
}

/**
 * List a user's credits (for support / profile surfaces).
 */
async function getUserCredits(uid, type = null) {
  const db = getDb();
  if (!db || !uid) return [];
  let q = db.collection(COLLECTIONS.PURCHASE_CREDITS).where('uid', '==', uid);
  if (type) q = q.where('type', '==', type);
  const snap = await q.limit(50).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = {
  PRODUCT_CREDIT_TYPES,
  creditTypeForProduct,
  addPurchaseCredit,
  getAvailableCredit,
  consumeCredit,
  getUserCredits,
};
