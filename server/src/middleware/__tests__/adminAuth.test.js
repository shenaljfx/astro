/**
 * adminAuth — the god-mode gate. These tests pin the security contract:
 * no token → 401; wrong email → 403; unverified email → 403; allowlisted
 * verified email → next() with req.admin set. No dev bypass exists.
 */

const mockVerifyIdToken = jest.fn();

jest.mock('../../config/firebase', () => ({
  getAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
  getDb: () => null,
}));

const { adminAuth, ADMIN_EMAILS } = require('../adminAuth');

function run(headers = {}) {
  const req = { headers, ip: '1.2.3.4' };
  const res = {
    statusCode: null,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  const next = jest.fn();
  return adminAuth(req, res, next).then(() => ({ req, res, next }));
}

describe('adminAuth', () => {
  beforeEach(() => mockVerifyIdToken.mockReset());

  test('default allowlist contains exactly the owner email', () => {
    expect(ADMIN_EMAILS).toEqual(['shenalsamaranayakejfx@gmail.com']);
  });

  test('rejects requests without a Bearer token (401)', async () => {
    const { res, next } = await run({});
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects invalid/expired tokens (401)', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));
    const { res, next } = await run({ authorization: 'Bearer nope' });
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a valid token from a NON-allowlisted email (403)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'x', email: 'attacker@gmail.com', email_verified: true });
    const { res, next } = await run({ authorization: 'Bearer t' });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects the allowlisted email when NOT verified (403)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'x', email: 'shenalsamaranayakejfx@gmail.com', email_verified: false });
    const { res, next } = await run({ authorization: 'Bearer t' });
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts the allowlisted verified email and sets req.admin', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'owner-uid', email: 'ShenalSamaranayakeJFX@gmail.com', email_verified: true });
    const { req, res, next } = await run({ authorization: 'Bearer t' });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
    expect(req.admin).toEqual({ uid: 'owner-uid', email: 'shenalsamaranayakejfx@gmail.com' });
  });
});
