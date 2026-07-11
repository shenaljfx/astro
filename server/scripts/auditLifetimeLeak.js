/**
 * LIFETIME-LEAK AUDIT (Phase 0 monetization fix)
 * ==============================================
 *
 * Before 2026-07-11 the RevenueCat webhook treated every one-time purchase
 * (full_report LKR 750, porondam_check LKR 990) as a LIFETIME subscription:
 * isSubscribed: true + subscription.isLifetime: true, forever. This script
 * finds every user granted lifetime Pro by that bug.
 *
 * Usage:
 *   node scripts/auditLifetimeLeak.js          — read-only report (default)
 *   node scripts/auditLifetimeLeak.js --fix    — revoke the accidental
 *     lifetime flag AND grant one purchase credit of the bought type as
 *     compensation (they keep what they paid for; they lose what they didn't).
 *
 * Users whose subscription.plan is the real 'lifetime' product are never
 * touched. Decide deliberately before running --fix: these are paying
 * customers, and revoking access may generate support contacts. The
 * read-only report gives you the count and revenue exposure first.
 */

require('dotenv').config();
const { initFirebase, getDb, COLLECTIONS } = require('../src/config/firebase');
const { addPurchaseCredit, creditTypeForProduct } = require('../src/services/purchaseCredits');

const FIX = process.argv.includes('--fix');

async function main() {
  initFirebase();
  const db = getDb();
  if (!db) {
    console.error('Firestore unavailable — check credentials.');
    process.exit(1);
  }

  const snap = await db.collection(COLLECTIONS.USERS)
    .where('subscription.isLifetime', '==', true)
    .limit(5000)
    .get();

  if (snap.empty) {
    console.log('No lifetime subscriptions found. Nothing to audit.');
    return;
  }

  const affected = [];
  let realLifetime = 0;

  snap.docs.forEach((doc) => {
    const u = doc.data();
    const plan = u.subscription && u.subscription.plan;
    if (plan === 'lifetime') { realLifetime += 1; return; }
    const creditType = creditTypeForProduct(plan);
    affected.push({
      uid: doc.id,
      email: u.email || null,
      plan: plan || '(unknown)',
      creditType,
      purchasedAt: (u.subscription && u.subscription.purchasedAt) || null,
      store: (u.subscription && u.subscription.store) || null,
    });
  });

  console.log('── Lifetime-leak audit ─────────────────────────────');
  console.log(`Real 'lifetime' product owners (untouched): ${realLifetime}`);
  console.log(`Accidental lifetime grants (the leak):      ${affected.length}`);
  console.log('');

  affected.forEach((u) => {
    console.log(`  ${u.uid}  plan=${u.plan}  purchased=${u.purchasedAt || '?'}  store=${u.store || '?'}  ${u.email || ''}`);
  });

  if (!affected.length) return;

  if (!FIX) {
    console.log('\nRead-only run. Re-run with --fix to revoke the accidental');
    console.log('lifetime flag and grant one purchase credit of the bought type.');
    return;
  }

  console.log('\nApplying fixes…');
  for (const u of affected) {
    // Compensation first: one credit for the product they actually bought,
    // so a buyer who never generated can still generate once.
    if (u.creditType) {
      await addPurchaseCredit(u.uid, u.plan, {
        eventId: `leak-remediation-${u.uid}`,
        store: u.store || 'remediation',
        purchaseDate: u.purchasedAt || new Date().toISOString(),
      });
    }
    await db.collection(COLLECTIONS.USERS).doc(u.uid).update({
      isSubscribed: false,
      'subscription.status': 'expired',
      'subscription.isLifetime': false,
      'subscription.leakRemediatedAt': new Date().toISOString(),
      'subscription.updatedAt': new Date().toISOString(),
    });
    console.log(`  ✔ ${u.uid} — lifetime revoked, ${u.creditType || 'no'} credit granted`);
  }
  console.log(`\nDone. ${affected.length} users remediated.`);
}

main().catch((e) => { console.error('Audit failed:', e); process.exit(1); });
