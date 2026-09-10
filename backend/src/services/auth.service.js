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

  if (!user) {
    const error = new Error('Email atau password tidak sesuai.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status !== 'ACTIVE') {
    const error = new Error('Akun Anda sedang dinonaktifkan. Hubungi admin LPMQ.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Email atau password tidak sesuai.');
    error.statusCode = 401;
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
    where: { code: 'ADMIN_PENERBIT' },
  });

  if (!role) {
    const error = new Error('Role ADMIN_PENERBIT belum dikonfigurasi pada database.');
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
      roles: ['ADMIN_PENERBIT'],
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
      roles: ['ADMIN_PENERBIT'],
      publisher: result.publisher,
    },
  };
};

export default { login, registerPublisher };
