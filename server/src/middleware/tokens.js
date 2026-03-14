/**
 * Token / Micro-transaction Middleware
 *
 * Users hold an LKR token balance in their Firestore document.
 * Generating a Full AI Report costs LKR 15; a Porondam Report costs LKR 10.
 *
 * Usage (route):
 *   router.post('/full-report-ai', phoneAuth, requireTokens(15, 'Full Report'), handler);
 *
 * The middleware:
 *   1. Reads tokenBalance from Firestore
 *   2. If balance < cost → 402 with { error, balance, required, topUpRequired: true }
 *   3. If balance >= cost → attaches req.tokenCost and req.tokenBalanceBefore, then calls next()
 *   NOTE: Actual deduction happens inside the route AFTER a successful AI call so failed
 *         generations are never charged.
 */

const { getDb, COLLECTIONS } = require('../config/firebase');
const { chargeUser } = require('../services/ideamart');

// ─── Balance helpers ────────────────────────────────────────────────────────

/**
 * Get current token balance (LKR) for a user.
 * Returns 0 if the user doc doesn't exist or has no balance field.
 */
async function getTokenBalance(uid) {
  const db = getDb();
  if (!db) return 0;
  try {
    const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (!doc.exists) return 0;
    return parseFloat(doc.data().tokenBalance) || 0;
  } catch (e) {
    console.error('[tokens] getTokenBalance error:', e.message);
    return 0;
  }
}

/**
 * Deduct `amount` LKR from a user's balance atomically using a Firestore transaction.
 * Returns { success, newBalance } or throws if insufficient.
 */
async function deductTokenBalance(uid, amount, description = 'Service charge') {
  const db = getDb();
  if (!db) {
    // No Firestore (dev mode) — allow free usage
    console.warn(`[tokens] No DB — skipping deduction of LKR ${amount} for ${uid} (${description})`);
    return { success: true, newBalance: 999, mock: true };
  }

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (!doc.exists) {
      throw new Error('User not found');
    }
    const current = parseFloat(doc.data().tokenBalance) || 0;
    if (current < amount) {
      const err = new Error('Insufficient token balance');
      err.code = 'INSUFFICIENT_BALANCE';
      err.balance = current;
      err.required = amount;
      throw err;
    }
    const newBalance = parseFloat((current - amount).toFixed(2));
    tx.update(userRef, {
      tokenBalance: newBalance,
      updatedAt: new Date().toISOString(),
    });

    // Append to transaction log (best-effort, inside same transaction)
    const logRef = db.collection('tokenTransactions').doc();
    tx.set(logRef, {
      uid,
      type: 'debit',
      amount,
      description,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    });

    return { success: true, newBalance };
  });
}

/**
 * Add `amount` LKR to a user's balance.
 * Used after a successful Ideamart direct-debit top-up.
 */
async function addTokenBalance(uid, amount, txId = null, description = 'Top-up') {
  const db = getDb();
  if (!db) {
    console.warn(`[tokens] No DB — skipping addTokenBalance of LKR ${amount}`);
    return { success: true, newBalance: 999, mock: true };
  }

  const userRef = db.collection(COLLECTIONS.USERS).doc(uid);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (!doc.exists) {
      throw new Error('User not found');
    }
    const current = parseFloat(doc.data().tokenBalance) || 0;
    const newBalance = parseFloat((current + amount).toFixed(2));
    tx.update(userRef, {
      tokenBalance: newBalance,
      updatedAt: new Date().toISOString(),
    });

    const logRef = db.collection('tokenTransactions').doc();
    tx.set(logRef, {
      uid,
      type: 'credit',
      amount,
      description,
      ideamartTxId: txId || null,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    });

    return { success: true, newBalance };
  });
}

// ─── Middleware factory ─────────────────────────────────────────────────────

/**
 * requireTokens(amount, label)
 * Express middleware factory that checks the user's token balance.
 * Must be used AFTER phoneAuth so req.user is populated.
 *
 * On success attaches:
 *   req.tokenCost          — amount to charge (LKR)
 *   req.tokenBalanceBefore — balance before any deduction
 *   req.deductTokens()     — async function to perform the deduction (call from route)
 */
function requireTokens(amount, label = 'Service') {
  return async function tokenCheck(req, res, next) {
    // If no DB (dev mode) or user opted-in anon — allow free
    const db = getDb();
    if (!db) {
      req.tokenCost = amount;
      req.tokenBalanceBefore = 999;
      req.deductTokens = async () => ({ success: true, newBalance: 999, mock: true });
      return next();
    }

    if (!req.user || !req.user.uid || req.user.authType === 'anonymous') {
      return res.status(401).json({
        error: 'Authentication required for this feature',
        tokenRequired: true,
      });
    }

    try {
      const balance = await getTokenBalance(req.user.uid);

      if (balance < amount) {
        return res.status(402).json({
          error: 'Insufficient token balance',
          balance,
          required: amount,
          shortfall: parseFloat((amount - balance).toFixed(2)),
          label,
          topUpRequired: true,
        });
      }

      req.tokenCost = amount;
      req.tokenBalanceBefore = balance;
      req.deductTokens = () => deductTokenBalance(req.user.uid, amount, label);
      next();
    } catch (err) {
      console.error('[tokens] requireTokens error:', err.message);
      res.status(500).json({ error: 'Token check failed', details: err.message });
    }
  };
}

// ─── Top-up via Ideamart direct debit ──────────────────────────────────────

/**
 * Charge the user's mobile credit via Ideamart and add the amount to their
 * token balance.
 *
 * @param {string} uid           — Firebase UID
 * @param {string} subscriberId  — tel:94XXXXXXXXX format (from user Firestore doc)
 * @param {number} amount        — LKR amount to top up (e.g. 15, 30, 50)
 * @param {string} description   — Human-readable description
 */
async function topUpViaIdeamart(uid, subscriberId, amount, description = 'Token top-up') {
  if (!subscriberId) {
    throw new Error('subscriberId is required for Ideamart charging');
  }

  // Charge mobile credit
  const result = await chargeUser(subscriberId, amount);
  if (!result.success) {
    throw new Error(result.error || 'Ideamart charge failed');
  }

  // Credit token balance
  const balanceResult = await addTokenBalance(uid, amount, result.transactionId, description);

  return {
    success: true,
    charged: amount,
    transactionId: result.transactionId,
    newBalance: balanceResult.newBalance,
    mock: result.mock || false,
  };
}

module.exports = {
  requireTokens,
  getTokenBalance,
  deductTokenBalance,
  addTokenBalance,
  topUpViaIdeamart,
};
