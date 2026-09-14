import { prisma } from '../config/database.js';
import { fail } from './workflow-utils.js';

// -------------------------------------------------------------
// 1. KATEGORI MUSHAF (MUSHAF CATEGORIES)
// -------------------------------------------------------------

export const getCategories = async (options = {}) => {
  const { include_inactive = false, status } = options;
  const where = {};
  if (status) {
    where.status = status;
  } else if (!include_inactive) {
    where.status = 'ACTIVE';
  }

  return await prisma.mushafCategory.findMany({
    where,
    orderBy: { display_order: 'asc' },
    include: {
      _count: {
        select: { service_types: true },
      },
    },
  });
};

export const getCategoryById = async (id) => {
  const category = await prisma.mushafCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { service_types: true },
      },
    },
  });

  if (!category) {
    fail(404, 'Kategori naskah tidak ditemukan.');
  }

  return category;
};

export const createCategory = async (data) => {
  const existing = await prisma.mushafCategory.findUnique({
    where: { code: data.code.trim().toUpperCase() },
  });

  if (existing) {
    fail(409, `Kategori dengan kode "${data.code}" sudah ada.`);
  }

  return await prisma.mushafCategory.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      display_order: data.display_order ?? 0,
      status: data.status || 'ACTIVE',
    },
  });
};

export const updateCategory = async (id, data) => {
  const category = await prisma.mushafCategory.findUnique({ where: { id } });
  if (!category) {
    fail(404, 'Kategori naskah tidak ditemukan.');
  }

  if (data.code && data.code.trim().toUpperCase() !== category.code) {
    const existing = await prisma.mushafCategory.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existing) {
      fail(409, `Kategori dengan kode "${data.code}" sudah digunakan.`);
    }
  }

  return await prisma.mushafCategory.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code.trim().toUpperCase() }),
      ...(data.name && { name: data.name.trim() }),
      ...(data.display_order !== undefined && { display_order: data.display_order }),
      ...(data.status && { status: data.status }),
    },
  });
};

export const deleteCategory = async (id) => {
  const category = await prisma.mushafCategory.findUnique({ where: { id } });
  if (!category) {
    fail(404, 'Kategori naskah tidak ditemukan.');
  }

  const activeServices = await prisma.serviceType.count({
    where: { category_id: id, status: 'ACTIVE' },
  });

  if (activeServices > 0) {
    fail(400, `Kategori tidak dapat dinonaktifkan karena masih memiliki ${activeServices} jenis layanan aktif.`);
  }

  return await prisma.mushafCategory.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

// -------------------------------------------------------------
// 2. PROFIL LAYANAN & TARIF (SERVICE TYPES)
// -------------------------------------------------------------

export const getServiceTypes = async (filters = {}) => {
  let categoryId = typeof filters === 'string' ? filters : filters.category_id || filters.categoryId;
  const status = typeof filters === 'object' ? filters.status : null;
  const includeInactive = typeof filters === 'object' && (filters.include_inactive === true || filters.include_inactive === 'true');
  const search = typeof filters === 'object' ? filters.search : null;
  const serviceKind = typeof filters === 'object' ? filters.service_kind : null;

  const where = {};
  if (status) {
    where.status = status;
  } else if (!includeInactive) {
    where.status = 'ACTIVE';
  }

  if (categoryId) {
    where.category_id = categoryId;
  }

  if (serviceKind) {
    where.service_kind = serviceKind;
  }

  if (search) {
    where.name = { contains: search };
  }

  return await prisma.serviceType.findMany({
    where,
    include: {
      category: {
        select: { id: true, code: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getServiceTypeById = async (id) => {
  const serviceType = await prisma.serviceType.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, code: true, name: true },
      },
    },
  });

  if (!serviceType) {
    fail(404, 'Jenis layanan pentashihan tidak ditemukan.');
  }

  return serviceType;
};

export const resolveCategory = async (categoryIdOrName) => {
  if (!categoryIdOrName) return null;
  let category = await prisma.mushafCategory.findFirst({
    where: {
      OR: [
        { id: categoryIdOrName },
        { code: categoryIdOrName },
        { name: categoryIdOrName },
      ],
    },
  });
  return category;
};

export const createServiceType = async (data) => {
  const categoryIdentifier = data.category_id || data.category;
  const category = await resolveCategory(categoryIdentifier);

  if (!category) {
    fail(404, 'Kategori naskah tidak ditemukan.');
  }

  const existing = await prisma.serviceType.findFirst({
    where: {
      category_id: category.id,
      name: data.name.trim(),
      status: 'ACTIVE',
    },
  });

  if (existing) {
    fail(409, `Jenis layanan "${data.name}" sudah terdaftar aktif pada kategori ini.`);
  }

  let serviceKind = data.service_kind || 'CETAK';
  if (!data.service_kind) {
    if (category.code === 'MAV' || category.name.toLowerCase().includes('audio')) {
      serviceKind = 'AUDIO_VISUAL';
    } else if (category.code === 'MD' || category.name.toLowerCase().includes('digital')) {
      serviceKind = 'DIGITAL';
    } else if (data.name.toLowerCase().includes('braille')) {
      serviceKind = 'BRAILLE';
    }
  }

  const baseFee = data.base_fee !== undefined ? data.base_fee : (data.baseCost ?? 0);
  const feeUnit = data.fee_unit || data.unitLabel || 'PER_STT';
  const durationInitial = data.duration_initial !== undefined ? data.duration_initial : (data.baseDurationDays ?? 15);
  const durationRevision = data.duration_revision !== undefined ? data.duration_revision : (data.revisionDurationDays ?? 7);
  const durationDummy = data.duration_dummy !== undefined ? data.duration_dummy : (data.dummyDurationDays ?? 3);

  return await prisma.serviceType.create({
    data: {
      category_id: category.id,
      name: data.name.trim(),
      service_kind: serviceKind,
      base_fee: baseFee,
      fee_unit: feeUnit,
      duration_initial: durationInitial,
      duration_revision: durationRevision,
      duration_dummy: durationDummy,
      status: data.status || 'ACTIVE',
    },
    include: {
      category: {
        select: { id: true, code: true, name: true },
      },
    },
  });
};

export const updateServiceType = async (id, data) => {
  const current = await prisma.serviceType.findUnique({ where: { id } });
  if (!current) {
    fail(404, 'Jenis layanan pentashihan tidak ditemukan.');
  }

  let categoryId = current.category_id;
  if (data.category_id || data.category) {
    const category = await resolveCategory(data.category_id || data.category);
    if (!category) {
      fail(404, 'Kategori naskah tidak ditemukan.');
    }
    categoryId = category.id;
  }

  const baseFee = data.base_fee !== undefined ? data.base_fee : data.baseCost;
  const feeUnit = data.fee_unit || data.unitLabel;
  const durationInitial = data.duration_initial !== undefined ? data.duration_initial : data.baseDurationDays;
  const durationRevision = data.duration_revision !== undefined ? data.duration_revision : data.revisionDurationDays;
  const durationDummy = data.duration_dummy !== undefined ? data.duration_dummy : data.dummyDurationDays;

  return await prisma.serviceType.update({
    where: { id },
    data: {
      ...(categoryId && { category_id: categoryId }),
      ...(data.name && { name: data.name.trim() }),
      ...(data.service_kind && { service_kind: data.service_kind }),
      ...(baseFee !== undefined && { base_fee: baseFee }),
      ...(feeUnit && { fee_unit: feeUnit }),
      ...(durationInitial !== undefined && { duration_initial: durationInitial }),
      ...(durationRevision !== undefined && { duration_revision: durationRevision }),
      ...(durationDummy !== undefined && { duration_dummy: durationDummy }),
      ...(data.status && { status: data.status }),
    },
    include: {
      category: {
        select: { id: true, code: true, name: true },
      },
    },
  });
};

export const deleteServiceType = async (id) => {
  const current = await prisma.serviceType.findUnique({ where: { id } });
  if (!current) {
    fail(404, 'Jenis layanan pentashihan tidak ditemukan.');
  }

  return await prisma.serviceType.update({
    where: { id },
    data: { status: 'INACTIVE' },
    include: {
      category: {
        select: { id: true, code: true, name: true },
      },
    },
  });
};

// -------------------------------------------------------------
// 3. LAYANAN TAMBAHAN (SERVICE ADDONS)
// -------------------------------------------------------------

export const getAddons = async (options = {}) => {
  const { include_inactive = false, status } = options;
  const where = {};
  if (status) {
    where.status = status;
  } else if (!include_inactive) {
    where.status = 'ACTIVE';
  }

  return await prisma.serviceAddon.findMany({
    where,
    orderBy: { code: 'asc' },
  });
};

export const getAddonById = async (id) => {
  const addon = await prisma.serviceAddon.findUnique({ where: { id } });
  if (!addon) {
    fail(404, 'Layanan tambahan (addon) tidak ditemukan.');
  }
  return addon;
};

export const createAddon = async (data) => {
  const existing = await prisma.serviceAddon.findUnique({
    where: { code: data.code.trim().toUpperCase() },
  });

  if (existing) {
    fail(409, `Addon dengan kode "${data.code}" sudah terdaftar.`);
  }

  return await prisma.serviceAddon.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      fee: data.fee ?? 0,
      status: data.status || 'ACTIVE',
    },
  });
};

export const updateAddon = async (id, data) => {
  const current = await prisma.serviceAddon.findUnique({ where: { id } });
  if (!current) {
    fail(404, 'Layanan tambahan (addon) tidak ditemukan.');
  }

  if (data.code && data.code.trim().toUpperCase() !== current.code) {
    const existing = await prisma.serviceAddon.findUnique({
      where: { code: data.code.trim().toUpperCase() },
    });
    if (existing) {
      fail(409, `Addon dengan kode "${data.code}" sudah digunakan.`);
    }
  }

  return await prisma.serviceAddon.update({
    where: { id },
    data: {
      ...(data.code && { code: data.code.trim().toUpperCase() }),
      ...(data.name && { name: data.name.trim() }),
      ...(data.fee !== undefined && { fee: data.fee }),
      ...(data.status && { status: data.status }),
    },
  });
};

export const deleteAddon = async (id) => {
  const current = await prisma.serviceAddon.findUnique({ where: { id } });
  if (!current) {
    fail(404, 'Layanan tambahan (addon) tidak ditemukan.');
  }

  return await prisma.serviceAddon.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
};

// -------------------------------------------------------------
// 4. TIM DISTRIBUSI (DISTRIBUTION TEAMS)
// -------------------------------------------------------------

export const getDistributionTeams = async () => {
  return await prisma.distributionTeam.findMany({
    where: { status: 'ACTIVE' },
    include: {
      leader: { select: { id: true, name: true, nip: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, nip: true } },
        },
      },
    },
    orderBy: { decree_no: 'asc' },
  });
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getServiceTypes,
  getServiceTypeById,
  createServiceType,
  updateServiceType,
  deleteServiceType,
  getAddons,
  getAddonById,
  createAddon,
  updateAddon,
  deleteAddon,
  getDistributionTeams,
};
