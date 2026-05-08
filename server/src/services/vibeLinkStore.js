const { getDb, COLLECTIONS } = require('../config/firebase');

const VIBE_LINK_TTL_MS = Number(process.env.VIBE_LINK_TTL_MS || 7 * 24 * 60 * 60 * 1000);

function getCollection() {
  const db = getDb();
  if (!db) return null;
  return db.collection(COLLECTIONS.VIBE_LINKS);
}

async function saveVibeLink(linkId, data = {}) {
  const links = getCollection();
  const now = new Date().toISOString();
  const expiresAt = data.expiresAt || new Date(Date.now() + VIBE_LINK_TTL_MS).toISOString();
  const record = {
    linkId,
    ownerUid: data.ownerUid || null,
    senderName: data.senderName,
    senderBirthDate: data.senderBirthDate,
    senderLat: data.senderLat || 6.9271,
    senderLng: data.senderLng || 79.8612,
    receiverName: data.receiverName || null,
    used: false,
    usedAt: null,
    createdAt: now,
    updatedAt: now,
    expiresAt,
  };
  if (!links) return record;
  await links.doc(String(linkId)).set(record, { merge: false });
  return record;
}

async function getVibeLink(linkId) {
  const links = getCollection();
  if (!links) return null;
  const doc = await links.doc(String(linkId)).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) return null;
  return { id: doc.id, ...data };
}

async function markVibeLinkUsed(linkId, receiverName) {
  const links = getCollection();
  const now = new Date().toISOString();
  if (!links) return null;
  const ref = links.doc(String(linkId));
  await ref.set({ used: true, receiverName, usedAt: now, updatedAt: now }, { merge: true });
  return { used: true, receiverName, usedAt: now };
}

module.exports = {
  saveVibeLink,
  getVibeLink,
  markVibeLinkUsed,
};