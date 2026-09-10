import { prisma } from '../config/database.js';

export const getCategories = async () => {
  return await prisma.mushafCategory.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { display_order: 'asc' },
    include: {
      _count: {
        select: { service_types: true },
      },
    },
  });
};

export const getServiceTypes = async (categoryId = null) => {
  const where = { status: 'ACTIVE' };
  if (categoryId) {
    where.category_id = categoryId;
  }

  return await prisma.serviceType.findMany({
    where,
    include: {
      category: {
        select: { code: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getAddons = async () => {
  return await prisma.serviceAddon.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
  });
};

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
  getServiceTypes,
  getAddons,
  getDistributionTeams,
};
