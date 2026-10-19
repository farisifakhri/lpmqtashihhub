import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../config/database.js';
import { audit, fail, requireRole } from './workflow-utils.js';
import { emailProvider } from './email-provider.service.js';
import { whatsAppProvider } from './whatsapp-provider.service.js';
import { ENV } from '../config/env.js';

export const ALL_ROLE_CODES = [
  'SUPERADMIN',
  'ADMIN_INTERNAL',
  'PENERBIT',
  'VERIFIKATOR',
  'DISTRIBUTOR',
  'PENTASHIH',
  'DOKUMENTATOR',
  'KEPALA_LPMQ',
];

export const getAvailableRoles = async () => {
  return prisma.role.findMany({
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { code: 'asc' },
  });
};

export const listUsers = async (query, currentUser) => {
  requireRole(currentUser, ['SUPERADMIN', 'ADMIN_INTERNAL']);

  const where = {};

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { name: { contains: s } },
      { email: { contains: s } },
      { nip: { contains: s } },
    ];
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.role) {
    where.roles = {
      some: {
        role: { code: query.role },
      },
    };
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp_number: true,
        whatsapp_verified_at: true,
        nip: true,
        status: true,
        created_at: true,
        updated_at: true,
        roles: {
          select: {
            role: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        publisher: {
          select: {
            id: true,
            legal_name: true,
            entity_type: true,
            verification_status: true,
          },
        },
      },
    }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    whatsapp_number: u.whatsapp_number,
    whatsapp_verified_at: u.whatsapp_verified_at,
    nip: u.nip,
    status: u.status,
    created_at: u.created_at,
    updated_at: u.updated_at,
    roles: u.roles.map((r) => r.role.code),
    role_details: u.roles.map((r) => r.role),
    publisher: u.publisher,
  }));

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getUserDetail = async (id, currentUser) => {
  requireRole(currentUser, ['SUPERADMIN', 'ADMIN_INTERNAL']);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: { role: true },
      },
      publisher: true,
    },
  });

  if (!user) {
    fail(404, 'Pengguna tidak ditemukan.');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    whatsapp_number: user.whatsapp_number,
    whatsapp_verified_at: user.whatsapp_verified_at,
    nip: user.nip,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
    roles: user.roles.map((r) => r.role.code),
    role_details: user.roles.map((r) => r.role),
    publisher: user.publisher,
  };
};

export const createUser = async (data, currentUser, req) => {
  requireRole(currentUser, ['SUPERADMIN', 'ADMIN_INTERNAL']);

  if (!currentUser.roles.includes('SUPERADMIN')) {
    const disallowedRoles = data.roles.filter((r) => ['SUPERADMIN', 'ADMIN_INTERNAL', 'KEPALA_LPMQ'].includes(r));
    if (disallowedRoles.length > 0) {
      fail(403, 'Admin Internal hanya berwenang membuat akun staf operasional (Verifikator, Distributor, Pentashih, Dokumentator, Penerbit).');
    }
  }

  const normalizedEmail = data.email.trim().toLowerCase();
  const existingEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingEmail) {
    fail(409, 'Alamat email sudah digunakan oleh akun lain.');
  }

  const normalizedNip = data.nip ? data.nip.trim() : null;
  if (normalizedNip) {
    const existingNip = await prisma.user.findUnique({
      where: { nip: normalizedNip },
    });
    if (existingNip) {
      fail(409, 'NIP sudah terdaftar pada akun lain.');
    }
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  // Fetch roles to link
  const rolesInDb = await prisma.role.findMany({
    where: { code: { in: data.roles } },
  });

  if (rolesInDb.length !== data.roles.length) {
    fail(400, 'Satu atau lebih role yang dipilih tidak valid.');
  }

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        whatsapp_number: data.whatsapp_number ? data.whatsapp_number.trim() : null,
        password_hash: passwordHash,
        nip: normalizedNip,
        status: data.status || 'ACTIVE',
      },
    });

    // Create UserRole relations
    await tx.userRole.createMany({
      data: rolesInDb.map((r) => ({
        user_id: newUser.id,
        role_id: r.id,
      })),
    });

    // If publisher role and publisher data provided
    if (data.roles.includes('PENERBIT') && data.publisher) {
      await tx.publisher.create({
        data: {
          user_id: newUser.id,
          legal_name: data.publisher.legal_name,
          entity_type: data.publisher.entity_type || 'PT',
          address: data.publisher.address || null,
          phone: data.publisher.phone || null,
          verification_status: 'VERIFIED',
        },
      });
    }

    await audit(tx, currentUser, 'CREATE_USER', 'User', newUser.id, {
      name: newUser.name,
      email: newUser.email,
      whatsapp_number: newUser.whatsapp_number,
      roles: data.roles,
      status: newUser.status,
    }, req);

    return newUser;
  });

  return getUserDetail(result.id, currentUser);
};

export const updateUser = async (id, data, currentUser, req) => {
  requireRole(currentUser, ['SUPERADMIN', 'ADMIN_INTERNAL']);

  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) {
    fail(404, 'Pengguna tidak ditemukan.');
  }

  if (!currentUser.roles.includes('SUPERADMIN')) {
    const targetRoles = user.roles.map((r) => r.role.code);
    const hasPrivilegedRole = targetRoles.some((r) => ['SUPERADMIN', 'ADMIN_INTERNAL', 'KEPALA_LPMQ'].includes(r));
    if (hasPrivilegedRole) {
      fail(403, 'Admin Internal tidak memiliki izin untuk mengubah akun administrator atau pimpinan.');
    }
    if (Array.isArray(data.roles)) {
      const disallowedRoles = data.roles.filter((r) => ['SUPERADMIN', 'ADMIN_INTERNAL', 'KEPALA_LPMQ'].includes(r));
      if (disallowedRoles.length > 0) {
        fail(403, 'Admin Internal tidak berwenang memberikan hak akses administrator atau pimpinan.');
      }
    }
  }

  if ((data.status && data.status !== 'ACTIVE') || Array.isArray(data.roles)) {
    const rotation = await prisma.coreTeamRotation.findUnique({ where: { id: 1 } });
    if (rotation) {
      const activePositions = await prisma.coreTeamRoster.findMany({
        where: {
          version: rotation.active_version,
          OR: [{ verifier_id: id }, { distributor_id: id }, { documenter_id: id }],
        },
        select: { verifier_id: true, distributor_id: true, documenter_id: true },
      });
      if (activePositions.length && data.status && data.status !== 'ACTIVE') {
        fail(409, 'Petugas masih berada dalam tim inti aktif. Ganti petugas pada pengaturan Tim Inti sebelum menonaktifkan akunnya.');
      }
      const requiredRoles = new Set(activePositions.flatMap(position => [
        position.verifier_id === id ? 'VERIFIKATOR' : null,
        position.distributor_id === id ? 'DISTRIBUTOR' : null,
        position.documenter_id === id ? 'DOKUMENTATOR' : null,
      ]).filter(Boolean));
      if (Array.isArray(data.roles) && [...requiredRoles].some(role => !data.roles.includes(role))) {
        fail(409, 'Peran petugas masih digunakan tim inti aktif. Ganti petugas pada pengaturan Tim Inti sebelum menghapus perannya.');
      }
    }
  }

  const normalizedEmail = data.email ? data.email.trim().toLowerCase() : undefined;
  if (normalizedEmail) {
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        NOT: { id },
      },
    });
    if (existingEmail) {
      fail(409, 'Alamat email sudah digunakan oleh akun lain.');
    }
  }

  const normalizedNip = data.nip !== undefined ? (data.nip ? data.nip.trim() : null) : undefined;
  if (normalizedNip) {
    const existingNip = await prisma.user.findFirst({
      where: {
        nip: normalizedNip,
        NOT: { id },
      },
    });
    if (existingNip) {
      fail(409, 'NIP sudah terdaftar pada akun lain.');
    }
  }

  const updateFields = {};
  if (data.name !== undefined) updateFields.name = data.name.trim();
  if (normalizedEmail !== undefined) updateFields.email = normalizedEmail;
  if (data.whatsapp_number !== undefined && data.whatsapp_number !== user.whatsapp_number) {
    updateFields.whatsapp_number = data.whatsapp_number ? data.whatsapp_number.trim() : null;
    updateFields.whatsapp_verified_at = null;
  }
  if (data.nip !== undefined) updateFields.nip = normalizedNip;
  if (data.status !== undefined) updateFields.status = data.status;

  if (data.password && data.password.trim().length >= 6) {
    updateFields.password_hash = await bcrypt.hash(data.password, 10);
    updateFields.password_changed_at = new Date();
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(updateFields).length > 0) {
      await tx.user.update({
        where: { id },
        data: updateFields,
      });
    }

    if (Array.isArray(data.roles)) {
      const rolesInDb = await tx.role.findMany({
        where: { code: { in: data.roles } },
      });
      if (rolesInDb.length !== data.roles.length) {
        fail(400, 'Satu atau lebih role yang dipilih tidak valid.');
      }

      await tx.userRole.deleteMany({ where: { user_id: id } });
      await tx.userRole.createMany({
        data: rolesInDb.map((r) => ({
          user_id: id,
          role_id: r.id,
        })),
      });
    }

    if (data.publisher && (data.roles?.includes('PENERBIT') || user.roles.some((r) => r.role.code === 'PENERBIT'))) {
      await tx.publisher.upsert({
        where: { user_id: id },
        update: {
          legal_name: data.publisher.legal_name,
          entity_type: data.publisher.entity_type || 'PT',
          address: data.publisher.address || null,
          phone: data.publisher.phone || null,
        },
        create: {
          user_id: id,
          legal_name: data.publisher.legal_name,
          entity_type: data.publisher.entity_type || 'PT',
          address: data.publisher.address || null,
          phone: data.publisher.phone || null,
          verification_status: 'VERIFIED',
        },
      });
    }

    await audit(tx, currentUser, 'UPDATE_USER', 'User', id, {
      updated_fields: Object.keys(updateFields),
      roles: data.roles,
    }, req);
  });

  return getUserDetail(id, currentUser);
};

export const deleteUser = async (id, currentUser, req) => {
  requireRole(currentUser, ['SUPERADMIN', 'ADMIN_INTERNAL']);

  if (id === currentUser.id) {
    fail(400, 'Anda tidak dapat menghapus akun Anda sendiri.');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { select: { role: { select: { code: true } } } },
      verification_assignments: { select: { id: true }, take: 1 },
      verification_assignments_made: { select: { id: true }, take: 1 },
      verification_assignments_revoked: { select: { id: true }, take: 1 },
      verification_documents_created: { select: { id: true }, take: 1 },
      verification_documents_approved: { select: { id: true }, take: 1 },
      physical_master_receipts: { select: { id: true }, take: 1 },
      physical_handovers_sent: { select: { id: true }, take: 1 },
      physical_handovers_received: { select: { id: true }, take: 1 },
      team_memberships: { select: { id: true }, take: 1 },
      teams_led: { select: { id: true }, take: 1 },
      assignments: { select: { id: true }, take: 1 },
      document_signatories: { select: { id: true }, take: 1 },
      verification_signatures: { select: { id: true }, take: 1 },
      audit_logs: { select: { id: true }, take: 1 },
      status_histories: { select: { id: true }, take: 1 },
      core_roster_verifier: { select: { version: true } },
      core_roster_distributor: { select: { version: true } },
      core_roster_documenter: { select: { version: true } },
      publisher: {
        select: {
          registrations: { select: { id: true }, take: 1 },
          documents: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  if (!user) {
    fail(404, 'Pengguna tidak ditemukan.');
  }

  if (!currentUser.roles.includes('SUPERADMIN')) {
    const targetRoles = user.roles.map((r) => r.role.code);
    const hasPrivilegedRole = targetRoles.some((r) => ['SUPERADMIN', 'ADMIN_INTERNAL', 'KEPALA_LPMQ'].includes(r));
    if (hasPrivilegedRole) {
      fail(403, 'Admin Internal tidak memiliki izin untuk menonaktifkan atau menghapus akun administrator atau pimpinan.');
    }
  }

  const rotation = await prisma.coreTeamRotation.findUnique({ where: { id: 1 } });
  const rosterMemberships = [
    ...user.core_roster_verifier,
    ...user.core_roster_distributor,
    ...user.core_roster_documenter,
  ];
  if (rosterMemberships.some(member => member.version === rotation?.active_version)) {
    fail(409, 'Petugas masih berada dalam tim inti aktif. Ganti petugas pada pengaturan Tim Inti sebelum menonaktifkan akunnya.');
  }

  const force = req?.query?.force === 'true' || req?.body?.force === true;

  // Cek apakah akun memiliki transaksi resmi kenegaraan / pentashihan
  const hasOfficialTransactions = Boolean(
    user.verification_assignments.length ||
    user.verification_assignments_made.length ||
    user.verification_assignments_revoked.length ||
    user.verification_documents_created.length ||
    user.verification_documents_approved.length ||
    user.physical_master_receipts.length ||
    user.physical_handovers_sent.length ||
    user.physical_handovers_received.length ||
    user.assignments.length ||
    user.document_signatories.length ||
    user.verification_signatures.length ||
    user.publisher?.registrations.length
  );

  // Jika force delete diminta pada akun yang memiliki transaksi resmi kenegaraan -> cegah perusakan audit trail & foreign key
  if (force && hasOfficialTransactions) {
    fail(
      400,
      'Pengguna ini tidak dapat dihapus permanen karena memiliki riwayat penugasan atau transaksi resmi kenegaraan yang mengikat. Silakan nonaktifkan akun (jangan centang opsi Hapus Permanen) agar integritas data audit tetap terjaga.'
    );
  }

  // Jika akun sama sekali belum pernah terlibat transaksi resmi (misal salah input saat buat akun)
  if (force || !hasOfficialTransactions) {
    if (user.publisher?.registrations.length && !force) {
      fail(400, 'Penerbit ini masih memiliki berkas pengajuan. Hapus pengajuan terkait terlebih dahulu atau gunakan opsi Hapus Permanen.');
    }

    await prisma.$transaction(async (tx) => {
      // Unlink audit log & status histories to prevent foreign key errors
      await tx.auditLog.updateMany({
        where: { actor_id: id },
        data: { actor_id: null },
      });
      await tx.statusHistory.updateMany({
        where: { actor_id: id },
        data: { actor_id: null },
      });

      await tx.userRole.deleteMany({ where: { user_id: id } });
      await tx.teamMember.deleteMany({ where: { user_id: id } });
      await tx.notification.deleteMany({ where: { user_id: id } });

      if (user.publisher) {
        await tx.publisherDocument.deleteMany({ where: { publisher_id: user.publisher.id } });
        await tx.publisher.deleteMany({ where: { id: user.publisher.id } });
      }

      await tx.user.delete({ where: { id } });
      await audit(tx, currentUser, 'HARD_DELETE_USER', 'User', id, { name: user.name, email: user.email, force }, req);
    });

    return {
      success: true,
      action: 'DELETED',
      message: 'Pengguna berhasil dihapus secara permanen dari sistem.',
    };
  }

  // Jika memiliki transaksi resmi dan tidak meminta force delete -> Soft deactivation
  const updated = await prisma.user.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
  await audit(prisma, currentUser, 'DEACTIVATE_USER', 'User', id, { reason: 'Memiliki riwayat transaksi resmi' }, req);

  return {
    success: true,
    action: 'DEACTIVATED',
    message: 'Pengguna memiliki riwayat transaksi/pemeriksaan dinas; status diubah menjadi TIDAK AKTIF untuk menjaga integritas data.',
    user: updated,
  };
};

export const grantAllRolesToSuperadmin = async (userId, currentUser, req) => {
  requireRole(currentUser, ['SUPERADMIN']);

  const allRoles = await prisma.role.findMany();
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { user_id: userId } });
    await tx.userRole.createMany({
      data: allRoles.map((r) => ({
        user_id: userId,
        role_id: r.id,
      })),
    });
    await audit(tx, currentUser, 'GRANT_ALL_ROLES', 'User', userId, { roles: allRoles.map((r) => r.code) }, req);
  });

  return getUserDetail(userId, currentUser);
};

export const requestPasswordResetForUser = async (id, currentUser, req) => {
  requireRole(currentUser, ['SUPERADMIN', 'ADMIN_INTERNAL']);

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    fail(404, 'Pengguna tidak ditemukan.');
  }

  if (!currentUser.roles.includes('SUPERADMIN')) {
    const targetRoles = user.roles.map((r) => r.role.code);
    const hasPrivilegedRole = targetRoles.some((r) => ['SUPERADMIN', 'ADMIN_INTERNAL', 'KEPALA_LPMQ'].includes(r));
    if (hasPrivilegedRole) {
      fail(403, 'Admin Internal tidak memiliki izin untuk mereset kata sandi akun administrator atau pimpinan.');
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 menit
  const requestedIp = req?.ip || req?.headers?.['x-forwarded-for'] || null;

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

  let sentEmail = false;
  try {
    if (user.email) {
      await emailProvider.sendEmail({
        to: user.email,
        toName: user.name,
        subject: 'Reset Kata Sandi Akun - LPMQ Tashih Hub',
        template: 'PASSWORD_RESET',
        payload: {
          resetUrl,
          expiresMinutes: 30,
          actorName: currentUser.name || 'Administrator',
        },
      });
      sentEmail = true;
    }
  } catch (emailErr) {
    console.error('Peringatan: Gagal mengirim email reset password staf:', emailErr.message);
  }

  let sentWa = false;
  try {
    if (user.whatsapp_number) {
      await whatsAppProvider.sendWhatsApp({
        to: user.whatsapp_number,
        message: `Halo ${user.name},\n\nTautan pemulihan kata sandi akun LPMQ Anda telah dibuat oleh ${currentUser.name || 'Administrator'}.\n\nSilakan klik tautan berikut untuk membuat kata sandi baru:\n${resetUrl}\n\nTautan berlaku selama 30 menit.`,
        template: 'ADMIN_PASSWORD_RESET',
        payload: { resetUrl },
      });
      sentWa = true;
    }
  } catch (waErr) {
    console.error('Peringatan: Gagal mengirim WhatsApp reset password staf:', waErr.message);
  }

  await audit(prisma, currentUser, 'ADMIN_RESET_PASSWORD', 'User', user.id, {
    target_email: user.email,
    sent_email: sentEmail,
    sent_whatsapp: sentWa,
  }, req);

  return {
    user_id: user.id,
    name: user.name,
    email: user.email,
    whatsapp_number: user.whatsapp_number,
    reset_url: resetUrl,
    expires_at: expiresAt,
    sent_to_email: sentEmail,
    sent_to_whatsapp: sentWa,
  };
};

