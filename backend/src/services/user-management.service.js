import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { audit, fail, requireRole } from './workflow-utils.js';

export const ALL_ROLE_CODES = [
  'SUPERADMIN',
  'HELPER_ADMIN',
  'ADMIN_PENERBIT',
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
  requireRole(currentUser, ['SUPERADMIN']);

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
  requireRole(currentUser, ['SUPERADMIN']);

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
  requireRole(currentUser, ['SUPERADMIN']);

  const existingEmail = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingEmail) {
    fail(409, 'Alamat email sudah digunakan oleh akun lain.');
  }

  if (data.nip) {
    const existingNip = await prisma.user.findUnique({
      where: { nip: data.nip },
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
        name: data.name,
        email: data.email,
        whatsapp_number: data.whatsapp_number || null,
        password_hash: passwordHash,
        nip: data.nip || null,
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
    if (data.roles.includes('ADMIN_PENERBIT') && data.publisher) {
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
  requireRole(currentUser, ['SUPERADMIN']);

  const user = await prisma.user.findUnique({
    where: { id },
    include: { roles: { include: { role: true } } },
  });
  if (!user) {
    fail(404, 'Pengguna tidak ditemukan.');
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

  if (data.email && data.email !== user.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      fail(409, 'Alamat email sudah digunakan oleh akun lain.');
    }
  }

  if (data.nip && data.nip !== user.nip) {
    const existingNip = await prisma.user.findUnique({
      where: { nip: data.nip },
    });
    if (existingNip) {
      fail(409, 'NIP sudah terdaftar pada akun lain.');
    }
  }

  const updateFields = {};
  if (data.name !== undefined) updateFields.name = data.name;
  if (data.email !== undefined) updateFields.email = data.email;
  if (data.whatsapp_number !== undefined && data.whatsapp_number !== user.whatsapp_number) {
    updateFields.whatsapp_number = data.whatsapp_number || null;
    updateFields.whatsapp_verified_at = null;
  }
  if (data.nip !== undefined) updateFields.nip = data.nip || null;
  if (data.status !== undefined) updateFields.status = data.status;

  if (data.password && data.password.trim().length >= 6) {
    updateFields.password_hash = await bcrypt.hash(data.password, 10);
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

    if (data.publisher && (data.roles?.includes('ADMIN_PENERBIT') || user.roles.some((r) => r.role.code === 'ADMIN_PENERBIT'))) {
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
  requireRole(currentUser, ['SUPERADMIN']);

  if (id === currentUser.id) {
    fail(400, 'Anda tidak dapat menghapus akun Anda sendiri.');
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
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

  const rotation = await prisma.coreTeamRotation.findUnique({ where: { id: 1 } });
  const rosterMemberships = [
    ...user.core_roster_verifier,
    ...user.core_roster_distributor,
    ...user.core_roster_documenter,
  ];
  if (rosterMemberships.some(member => member.version === rotation?.active_version)) {
    fail(409, 'Petugas masih berada dalam tim inti aktif. Ganti petugas pada pengaturan Tim Inti sebelum menonaktifkan akunnya.');
  }

  const hasHistory = Object.values(user).some(value => Array.isArray(value) && value.length > 0) ||
    Boolean(user.publisher?.registrations.length || user.publisher?.documents.length);

  if (hasHistory) {
    // Soft deactivation to preserve audit and legal data integrity
    const updated = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    await audit(prisma, currentUser, 'DEACTIVATE_USER', 'User', id, { reason: 'Has transactional history' }, req);
    return {
      success: true,
      action: 'DEACTIVATED',
      message: 'Pengguna memiliki riwayat transaksi/pemeriksaan; status diubah menjadi TIDAK AKTIF untuk menjaga integritas data.',
      user: updated,
    };
  }

  // Hard delete if clean account
  await prisma.$transaction(async (tx) => {
    await tx.userRole.deleteMany({ where: { user_id: id } });
    await tx.publisher.deleteMany({ where: { user_id: id } });
    await tx.notification.deleteMany({ where: { user_id: id } });
    await tx.user.delete({ where: { id } });
    await audit(tx, currentUser, 'DELETE_USER', 'User', id, { name: user.name, email: user.email }, req);
  });

  return {
    success: true,
    action: 'DELETED',
    message: 'Pengguna berhasil dihapus secara permanen dari sistem.',
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

