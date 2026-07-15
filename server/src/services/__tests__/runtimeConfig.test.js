/**
 * runtimeConfig — pins the safety contract: secrets are never editable and are
 * masked in the viewer; only allowlisted numeric knobs validate/coerce.
 */
jest.mock('../../config/firebase', () => ({ getDb: () => null }));
const rc = require('../runtimeConfig');

describe('runtimeConfig', () => {
  test('secret-looking keys are detected as secret', () => {
    ['JWT_SECRET', 'GEMINI_API_KEY', 'REVENUECAT_WEBHOOK_AUTH_KEY', 'ADMIN_SECRET'].forEach((k) =>
      expect(rc.isSecretKey(k)).toBe(true));
    ['GEMINI_MODEL', 'NODE_ENV', 'DAILY_GLOBAL_AI_SPEND_LIMIT_LKR', 'GOOGLE_OAUTH_CLIENT_ID'].forEach((k) =>
      expect(rc.isSecretKey(k)).toBe(false));
  });

  test('rejects writes to non-allowlisted keys (incl. every secret)', () => {
    expect(rc.validate('JWT_SECRET', 'anything').ok).toBe(false);
    expect(rc.validate('GEMINI_API_KEY', 'x').ok).toBe(false);
    expect(rc.validate('PATH', '/evil').ok).toBe(false);
  });

  test('validates and coerces allowlisted numeric knobs', () => {
    expect(rc.validate('DAILY_GLOBAL_AI_SPEND_LIMIT_LKR', '50000')).toEqual({ ok: true, value: 50000 });
    expect(rc.validate('GEMINI_PRO_CALLS_PER_REPORT', 4)).toEqual({ ok: true, value: 4 });
    expect(rc.validate('GEMINI_PRO_CALLS_PER_REPORT', 0).ok).toBe(false); // below min
    expect(rc.validate('AI_BUDGET_ESTIMATE_FULLREPORT_LKR', 'abc').ok).toBe(false);
    expect(rc.validate('DAILY_GLOBAL_AI_SPEND_LIMIT_LKR', null)).toEqual({ ok: true, value: null }); // reset allowed
  });

  test('the masked env viewer never returns a raw secret value', () => {
    process.env.JWT_SECRET = 'supersecretvalue1234567890abcdef';
    process.env.GEMINI_API_KEY = 'AIzaSyABCDEFG_secret_1234';
    const env = rc.maskedEnv();
    const jwt = env.find((e) => e.key === 'JWT_SECRET');
    const gem = env.find((e) => e.key === 'GEMINI_API_KEY');
    expect(jwt.secret).toBe(true);
    expect(jwt.display).not.toContain('supersecret');
    expect(gem.display).not.toContain('AIzaSyABCDEFG');
    delete process.env.JWT_SECRET; delete process.env.GEMINI_API_KEY;
  });
});
