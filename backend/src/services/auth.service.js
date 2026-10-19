import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { logAudit } from './audit.service.js';
import { emailProvider } from './email-provider.service.js';

export const login = async ({ email, password, req }) => {
  const normalizedEmail = email ? email.trim().toLowerCase() : '';
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    include: {
      roles: { include: { role: true } },
      publisher: true,
      publisher_registration: true,
    },
  });

  // Constant-time comparison untuk mencegah timing attack / enumerasi akun
  const DUMMY_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/lI2/w16/K8L9.lZ63xV1L6o2y72e';
  const isMatch = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !isMatch) {
    const error = new Error('Email atau password tidak sesuai.');
    error.statusCode = 401;
    throw error;
  }

  // Penghalang Login: Jika kredensial benar tetapi pendaftaran penerbit belum DISETUJUI
  if (user.publisher_registration && user.publisher_registration.status !== 'DISETUJUI') {
    const error = new Error('Akun penerbit Anda belum disetujui atau masih dalam proses verifikasi petugas. Silakan pantau status pendaftaran Anda secara mandiri atau hubungi loket LPMQ.');
    error.statusCode = 403;
    error.code = 'PUBLISHER_NOT_APPROVED';
    error.data = {
      status_pendaftaran: user.publisher_registration.status,
    };
    throw error;
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error('Akun Anda sedang dinonaktifkan. Hubungi admin LPMQ.');
    error.statusCode = 403;
    throw error;
  }

  const roles = user.roles.map((r) => r.role.code);
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles,
      publisherId: user.publisher ? user.publisher.id : null,
      type: 'access',
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  await logAudit({
    actorId: user.id,
    action: 'LOGIN',
    subjectType: 'User',
    subjectId: user.id,
    req,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      nip: user.nip,
      roles,
      publisherId: user.publisher ? user.publisher.id : null,
      publisher: user.publisher,
    },
  };
};

export const registerPublisher = async (data, req) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    const error = new Error('Email sudah terdaftar.');
    error.statusCode = 400;
    throw error;
  }

  const role = await prisma.role.findUnique({
    where: { code: 'PENERBIT' },
  });

  if (!role) {
    const error = new Error('Role PENERBIT belum dikonfigurasi pada database.');
    error.statusCode = 500;
    throw error;
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash: passwordHash,
        status: 'ACTIVE',
      },
    });

    await tx.userRole.create({
      data: {
        user_id: user.id,
        role_id: role.id,
      },
    });

    const publisher = await tx.publisher.create({
      data: {
        user_id: user.id,
        legal_name: data.legal_name,
        entity_type: data.entity_type,
        address: data.address || null,
        phone: data.phone || null,
        verification_status: 'UNVERIFIED',
      },
    });

    return { user, publisher };
  });

  await logAudit({
    actorId: result.user.id,
    action: 'REGISTER_PUBLISHER',
    subjectType: 'Publisher',
    subjectId: result.publisher.id,
    req,
  });

  const token = jwt.sign(
    {
      userId: result.user.id,
      email: result.user.email,
      roles: ['PENERBIT'],
      publisherId: result.publisher.id,
      type: 'access',
    },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      roles: ['PENERBIT'],
      publisher: result.publisher,
    },
  };
};

export const forgotPassword = async ({ email, req }) => {
  if (ENV.ENABLE_PASSWORD_RESET === false) {
    const error = new Error('Fitur pemulihan kata sandi mandiri dinonaktifkan sementara. Silakan hubungi administrator LPMQ.');
    error.statusCode = 503;
    throw error;
  }

  const GENERIC_RESPONSE = {
    message: 'Jika email terdaftar, petunjuk telah dikirim.',
  };

  const user = await prisma.user.findUnique({ where: { email } });

  // Dummy compare to avoid timing attack / account enumeration
  const DUMMY_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/lI2/w16/K8L9.lZ63xV1L6o2y72e';
  if (!user || user.status !== 'ACTIVE') {
    await bcrypt.compare('dummyPasswordCompare123', DUMMY_HASH);
    return GENERIC_RESPONSE;
  }

  // Consistent dummy compare so timing is identical for existing vs non-existing
  await bcrypt.compare('dummyPasswordCompare123', DUMMY_HASH);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 menit
  const requestedIp = req?.ip || req?.headers?.['x-forwarded-for'] || null;

  // Hapus token lama yang belum digunakan saat permintaan baru dibuat
  await prisma.passwordResetToken.deleteMany({
    where: { user_id: user.id },
  });

  await prisma.passwordResetToken.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      requested_ip: typeof requestedIp === 'string' ? requestedIp : null,
    },
  });

  const clientUrl = ENV.PUBLIC_APP_URL || 'http://localhost:5173';
  const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

  try {
    await emailProvider.sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Petunjuk Pemulihan Kata Sandi - LPMQ Tashih Hub',
      template: 'PASSWORD_RESET',
      payload: {
        resetUrl,
        expiresMinutes: 30,
      },
    });
  } catch (emailErr) {
    // Jangan biarkan kegagalan email mengekspos token ke respons HTTP
    console.error('Peringatan: Gagal mengirim email pemulihan kata sandi:', emailErr.message);
  }

  await logAudit({
    actorId: user.id,
    action: 'FORGOT_PASSWORD_REQUEST',
    subjectType: 'User',
    subjectId: user.id,
    req,
  });

  return GENERIC_RESPONSE;
};

export const resetPassword = async ({ token, new_password, req }) => {
  if (!token || typeof token !== 'string') {
    const error = new Error('Token pemulihan kata sandi tidak valid atau telah kedaluwarsa.');
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!resetRecord) {
    const error = new Error('Token pemulihan kata sandi tidak valid atau telah kedaluwarsa.');
    error.statusCode = 400;
    throw error;
  }

  if (resetRecord.used_at) {
    const error = new Error('Token pemulihan kata sandi telah digunakan.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date() > new Date(resetRecord.expires_at)) {
    const error = new Error('Token pemulihan kata sandi telah kedaluwarsa.');
    error.statusCode = 400;
    throw error;
  }

  const user = resetRecord.user;
  if (!user || user.status !== 'ACTIVE') {
    const error = new Error('Pengguna tidak ditemukan atau berstatus tidak aktif.');
    error.statusCode = 400;
    throw error;
  }

  const isSameAsOld = await bcrypt.compare(new_password, user.password_hash);
  if (isSameAsOld) {
    const error = new Error('Kata sandi baru tidak boleh sama dengan kata sandi lama.');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        password_hash: passwordHash,
        password_changed_at: now,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: {
        used_at: now,
      },
    });
  });

  await logAudit({
    actorId: user.id,
    action: 'RESET_PASSWORD',
    subjectType: 'User',
    subjectId: user.id,
    req,
  });

  return { message: 'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.' };
};

export const changePassword = async ({ user, current_password, new_password, req }) => {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    const error = new Error('Pengguna tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(current_password, dbUser.password_hash);
  if (!isMatch) {
    const error = new Error('Kata sandi saat ini tidak sesuai.');
    error.statusCode = 400;
    throw error;
  }

  const isSameAsOld = await bcrypt.compare(new_password, dbUser.password_hash);
  if (isSameAsOld) {
    const error = new Error('Kata sandi baru tidak boleh sama dengan kata sandi lama.');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  const now = new Date();
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      password_hash: passwordHash,
      password_changed_at: now,
    },
  });

  await logAudit({
    actorId: dbUser.id,
    action: 'CHANGE_PASSWORD',
    subjectType: 'User',
    subjectId: dbUser.id,
    req,
  });

  return { message: 'Kata sandi berhasil diubah.' };
};

export default { login, registerPublisher, forgotPassword, resetPassword, changePassword };
