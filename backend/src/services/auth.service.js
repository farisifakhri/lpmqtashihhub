import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { ENV } from '../config/env.js';
import { logAudit } from './audit.service.js';

export const login = async ({ email, password, req }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: { include: { role: true } },
      publisher: true,
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
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    // Hindari enumerasi akun
    return {
      message: 'Jika email terdaftar dan aktif di sistem, tautan atau petunjuk reset kata sandi telah diproses.',
    };
  }

  const resetToken = jwt.sign(
    { userId: user.id, email: user.email, type: 'password_reset' },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );

  await logAudit({
    actorId: user.id,
    action: 'FORGOT_PASSWORD_REQUEST',
    subjectType: 'User',
    subjectId: user.id,
    req,
  });

  return {
    message: 'Permohonan pemulihan kata sandi berhasil dibuat. Gunakan token atau tautan pemulihan untuk mengatur ulang kata sandi.',
    resetToken,
  };
};

export const resetPassword = async ({ token, new_password, req }) => {
  let decoded;
  try {
    decoded = jwt.verify(token, ENV.JWT_SECRET);
  } catch (err) {
    const error = new Error('Token pemulihan kata sandi tidak valid atau telah kedaluwarsa.');
    error.statusCode = 400;
    throw error;
  }

  if (decoded.type !== 'password_reset' || !decoded.userId) {
    const error = new Error('Token tidak valid untuk penyetelan ulang kata sandi.');
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.status !== 'ACTIVE') {
    const error = new Error('Pengguna tidak ditemukan atau berstatus tidak aktif.');
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password_hash: passwordHash },
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

  const passwordHash = await bcrypt.hash(new_password, 10);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { password_hash: passwordHash },
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
