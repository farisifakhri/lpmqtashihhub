import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/config/database.js';
import { createDraft } from '../src/services/registration.service.js';
import { getRegistrationPayment } from '../src/services/payment.service.js';
import { authRateLimiter, registrationRateLimiter, shouldSkipRateLimit } from '../src/middlewares/rateLimiter.middleware.js';

test('P0: createDraft rejects attachment files belonging to other users', async () => {
  const originalFindUnique = prisma.serviceType.findUnique;
  const originalStoredFileFindMany = prisma.storedFile.findMany;

  try {
    prisma.serviceType.findUnique = async () => ({ id: 'srv-1', status: 'ACTIVE', category: {} });
    prisma.storedFile.findMany = async () => [
      { id: 'file-other', owner_id: 'other-user-uuid' },
    ];

    await assert.rejects(
      createDraft(
        {
          service_type_id: 'srv-1',
          title: 'Mushaf Test',
          cover_file_id: 'file-other',
        },
        { id: 'my-user-uuid', roles: ['PENERBIT'], publisherId: 'pub-1' }
      ),
      (err) => err.statusCode === 403 && err.message.includes('bukan milik akun Anda')
    );
  } finally {
    prisma.serviceType.findUnique = originalFindUnique;
    prisma.storedFile.findMany = originalStoredFileFindMany;
  }
});

test('P0: getRegistrationPayment denies unassigned verifier with 403', async () => {
  const originalRegFindUnique = prisma.registration.findUnique;
  const originalAssignFindFirst = prisma.verificationAssignment.findFirst;

  try {
    prisma.registration.findUnique = async () => ({
      id: 'reg-1',
      publisher_id: 'pub-1',
      fee_sla_snapshot: {},
    });

    prisma.verificationAssignment.findFirst = async () => ({
      id: 'assign-1',
      verifier_id: 'other-verifier-id',
    });

    await assert.rejects(
      getRegistrationPayment('reg-1', {
        id: 'unassigned-verifier-id',
        roles: ['VERIFIKATOR'],
      }),
      (err) => err.statusCode === 403 && err.message.includes('Anda tidak memiliki hak akses')
    );
  } finally {
    prisma.registration.findUnique = originalRegFindUnique;
    prisma.verificationAssignment.findFirst = originalAssignFindFirst;
  }
});

test('P0: rateLimiter does not bypass on User-Agent header in non-test environment', () => {
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal(shouldSkipRateLimit(), false);
    process.env.NODE_ENV = 'test';
    assert.equal(shouldSkipRateLimit(), true);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});

test('P0-1 Auth: forgotPassword, resetPassword, changePassword, and authenticate negative security tests', async () => {
  const crypto = await import('crypto');
  const jwt = (await import('jsonwebtoken')).default;
  const bcrypt = (await import('bcryptjs')).default;
  const { forgotPassword, resetPassword, changePassword } = await import('../src/services/auth.service.js');
  const { authenticate } = await import('../src/middlewares/auth.middleware.js');
  const { emailProvider } = await import('../src/services/email-provider.service.js');
  const { ENV } = await import('../src/config/env.js');

  const originalFindUnique = prisma.user.findUnique;
  const originalUpdate = prisma.user.update;
  const originalAuditCreate = prisma.auditLog.create;
  const originalTokenDeleteMany = prisma.passwordResetToken.deleteMany;
  const originalTokenCreate = prisma.passwordResetToken.create;
  const originalTokenFindUnique = prisma.passwordResetToken.findUnique;
  const originalTokenUpdate = prisma.passwordResetToken.update;
  const originalTransaction = prisma.$transaction;

  try {
    prisma.auditLog.create = async () => ({ id: 'mock-audit' });

    const passwordHash = await bcrypt.hash('CurrentPassword123', 10);
    const fakeUser = {
      id: 'u-1',
      name: 'Ahmad Pentashih',
      email: 'petugas@kemenag.go.id',
      status: 'ACTIVE',
      password_hash: passwordHash,
      password_changed_at: null,
      roles: [{ role: { code: 'VERIFIKATOR' } }],
      publisher: null,
    };

    let storedResetTokens = [];

    prisma.user.findUnique = async ({ where }) => {
      if (where.email === fakeUser.email || where.id === fakeUser.id) return fakeUser;
      return null;
    };

    prisma.passwordResetToken.deleteMany = async ({ where }) => {
      storedResetTokens = storedResetTokens.filter((t) => t.user_id !== where.user_id);
      return { count: 1 };
    };

    prisma.passwordResetToken.create = async ({ data }) => {
      const record = { id: 'prt-' + Date.now(), used_at: null, ...data };
      storedResetTokens.push(record);
      return record;
    };

    prisma.passwordResetToken.findUnique = async ({ where }) => {
      const record = storedResetTokens.find((t) => t.token_hash === where.token_hash);
      if (!record) return null;
      return { ...record, user: fakeUser };
    };

    prisma.passwordResetToken.update = async ({ where, data }) => {
      const idx = storedResetTokens.findIndex((t) => t.id === where.id);
      if (idx !== -1) {
        storedResetTokens[idx] = { ...storedResetTokens[idx], ...data };
        return storedResetTokens[idx];
      }
      return null;
    };

    prisma.user.update = async ({ where, data }) => {
      Object.assign(fakeUser, data);
      return fakeUser;
    };

    prisma.$transaction = async (fn) => {
      return fn({
        user: prisma.user,
        passwordResetToken: prisma.passwordResetToken,
      });
    };

    // -------------------------------------------------------------
    // NEGATIF 1: Respons forgot-password TIDAK memuat token dan identik untuk email yang ada dan tidak ada
    // -------------------------------------------------------------
    const resUnknown = await forgotPassword({ email: 'nonexistent@kemenag.go.id' });
    const resExisting = await forgotPassword({ email: 'petugas@kemenag.go.id' });

    assert.equal(resUnknown.resetToken, undefined, 'resetToken tidak boleh ada di respons email yang tidak ada');
    assert.equal(resExisting.resetToken, undefined, 'resetToken TIDAK BOLEH ADA di respons email yang ada!');
    assert.deepEqual(resUnknown, resExisting, 'Pesan dan struktur respons harus 100% identik');
    assert.equal(resExisting.message, 'Jika email terdaftar, petunjuk telah dikirim.');

    // Periksa bahwa raw token hanya dikirim ke email via emailProvider
    const lastSentEmail = emailProvider.sentMessages[emailProvider.sentMessages.length - 1];
    assert.ok(lastSentEmail, 'Email petunjuk reset password harus dikirim');
    assert.equal(lastSentEmail.to, fakeUser.email);
    assert.ok(lastSentEmail.payload.resetUrl.includes('/reset-password?token='));
    const rawToken = lastSentEmail.payload.resetUrl.split('token=')[1];

    // Periksa bahwa di database hanya tersimpan hash token SHA-256, bukan raw token
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(storedResetTokens[0].token_hash, expectedHash);

    // -------------------------------------------------------------
    // NEGATIF 2: Token reset TIDAK BISA dipakai sebagai bearer pada endpoint terautentikasi
    // -------------------------------------------------------------
    const responseHelper = () => ({
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    });

    const resResetAsBearer = responseHelper();
    await authenticate(
      { headers: { authorization: `Bearer ${rawToken}` } },
      resResetAsBearer,
      () => assert.fail('Tidak boleh lolos ke next()')
    );
    assert.equal(resResetAsBearer.statusCode, 401, 'Token reset bukan JWT access yang valid');

    // -------------------------------------------------------------
    // NEGATIF 3: Token dengan type salah atau tanpa type access DITOLAK oleh authenticate
    // -------------------------------------------------------------
    const tokenNoType = jwt.sign({ userId: fakeUser.id }, ENV.JWT_SECRET);
    const resNoType = responseHelper();
    await authenticate(
      { headers: { authorization: `Bearer ${tokenNoType}` } },
      resNoType,
      () => assert.fail('Token tanpa type: access tidak boleh lolos')
    );
    assert.equal(resNoType.statusCode, 401);
    assert.match(resNoType.body.message, /Tipe token tidak valid/);

    const tokenWrongType = jwt.sign({ userId: fakeUser.id, type: 'refresh' }, ENV.JWT_SECRET);
    const resWrongType = responseHelper();
    await authenticate(
      { headers: { authorization: `Bearer ${tokenWrongType}` } },
      resWrongType,
      () => assert.fail('Token type selain access tidak boleh lolos')
    );
    assert.equal(resWrongType.statusCode, 401);

    // -------------------------------------------------------------
    // NEGATIF 4: reset-password menolak password baru yang sama dengan password lama
    // -------------------------------------------------------------
    await assert.rejects(
      resetPassword({ token: rawToken, new_password: 'CurrentPassword123' }),
      (err) => err.statusCode === 400 && err.message.includes('sama dengan kata sandi lama')
    );

    // -------------------------------------------------------------
    // NEGATIF 5: Token kedaluwarsa ditolak
    // -------------------------------------------------------------
    storedResetTokens[0].expires_at = new Date(Date.now() - 1000); // Masa berlaku habis
    await assert.rejects(
      resetPassword({ token: rawToken, new_password: 'NewStrongPassword123' }),
      (err) => err.statusCode === 400 && err.message.includes('telah kedaluwarsa')
    );
    storedResetTokens[0].expires_at = new Date(Date.now() + 30 * 60 * 1000); // Kembalikan aktif

    // -------------------------------------------------------------
    // Sukses: resetPassword dengan token valid
    // -------------------------------------------------------------
    const resResetSuccess = await resetPassword({ token: rawToken, new_password: 'NewStrongPassword123' });
    assert.ok(resResetSuccess.message.includes('berhasil diperbarui'));
    assert.ok(fakeUser.password_changed_at, 'password_changed_at harus diisi saat reset password');

    // -------------------------------------------------------------
    // NEGATIF 6: Token TIDAK BISA dipakai dua kali (single-use)
    // -------------------------------------------------------------
    await assert.rejects(
      resetPassword({ token: rawToken, new_password: 'AnotherPassword123' }),
      (err) => err.statusCode === 400 && err.message.includes('telah digunakan')
    );

    // -------------------------------------------------------------
    // NEGATIF 7: Token lama (access) DITOLAK setelah password diubah
    // -------------------------------------------------------------
    const oldIat = Math.floor(new Date(fakeUser.password_changed_at).getTime() / 1000) - 60; // 60 detik sebelum ganti password
    const oldAccessToken = jwt.sign(
      { userId: fakeUser.id, type: 'access', iat: oldIat },
      ENV.JWT_SECRET
    );
    const resOldToken = responseHelper();
    await authenticate(
      { headers: { authorization: `Bearer ${oldAccessToken}` } },
      resOldToken,
      () => assert.fail('Token lama sebelum ganti password tidak boleh lolos')
    );
    assert.equal(resOldToken.statusCode, 401);
    assert.match(resOldToken.body.message, /telah berakhir karena kata sandi akun telah diubah/);

    // Token baru yang diterbitkan setelah password diubah harus lolos:
    const newIat = Math.floor(new Date(fakeUser.password_changed_at).getTime() / 1000) + 1;
    const newAccessToken = jwt.sign(
      { userId: fakeUser.id, type: 'access', iat: newIat },
      ENV.JWT_SECRET
    );
    let nextCalled = false;
    const reqAuthed = { headers: { authorization: `Bearer ${newAccessToken}` } };
    await authenticate(reqAuthed, responseHelper(), () => { nextCalled = true; });
    assert.equal(nextCalled, true, 'Token baru harus berhasil diotentikasi');
    assert.equal(reqAuthed.user.id, fakeUser.id);

    // -------------------------------------------------------------
    // NEGATIF 8: change-password menolak password baru yang sama dengan lama
    // -------------------------------------------------------------
    await assert.rejects(
      changePassword({
        user: { id: fakeUser.id },
        current_password: 'NewStrongPassword123',
        new_password: 'NewStrongPassword123',
      }),
      (err) => err.statusCode === 400 && err.message.includes('sama dengan kata sandi lama')
    );

    await assert.rejects(
      changePassword({
        user: { id: fakeUser.id },
        current_password: 'WrongPassword999',
        new_password: 'BrandNewPassword123',
      }),
      (err) => err.statusCode === 400 && err.message.includes('saat ini tidak sesuai')
    );
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.update = originalUpdate;
    prisma.auditLog.create = originalAuditCreate;
    prisma.passwordResetToken.deleteMany = originalTokenDeleteMany;
    prisma.passwordResetToken.create = originalTokenCreate;
    prisma.passwordResetToken.findUnique = originalTokenFindUnique;
    prisma.passwordResetToken.update = originalTokenUpdate;
    prisma.$transaction = originalTransaction;
  }
});


