const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, '..', '..', '..', '..', 'firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');

function matchBlock(collectionName) {
  const pattern = new RegExp(`match \/${collectionName}\/\\{[^}]+\\} \\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
  const match = rules.match(pattern);
  if (!match) throw new Error(`Missing rules block for ${collectionName}`);
  return match[1];
}

describe('Firestore security rules', () => {
  test('default-denies unmatched documents', () => {
    expect(rules).toContain('match /{document=**}');
    expect(rules).toContain('allow read, write: if false;');
  });

  test('users are readable only by owner and not directly writable by clients', () => {
    const block = matchBlock('users');
    expect(block).toContain('allow read: if isOwner(userId);');
    expect(block).toContain('allow write: if false;');
  });

  test.each(['reports', 'charts', 'chatSessions', 'porondamResults', 'reportFeedback'])('%s reads require uid ownership and writes are server-only', (collection) => {
    const block = matchBlock(collection);
    expect(block).toContain('allow read: if ownsExistingDoc();');
    expect(block).toContain('allow write: if false;');
  });

  test('report progress requires ownerUid ownership and denies client writes', () => {
    const block = matchBlock('reportProgress');
    expect(block).toContain('allow read: if ownsProgressDoc();');
    expect(block).toContain('allow write: if false;');
  });

  test.each(['jobs', 'rateLimits', 'dailyAiSpend', 'dailyAiUserSpend', 'aiCostEvents', 'revenuecatWebhookEvents'])('%s is server-only', (collection) => {
    const block = matchBlock(collection);
    expect(block).toContain('allow read, write: if false;');
  });
});