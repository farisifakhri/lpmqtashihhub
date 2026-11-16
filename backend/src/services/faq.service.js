import { prisma } from '../config/database.js';
import { audit, fail } from './workflow-utils.js';

const publicFaqSelect = {
  id: true,
  category: true,
  question: true,
  answer: true,
  created_at: true,
  updated_at: true,
};

const adminFaqSelect = {
  ...publicFaqSelect,
  is_published: true,
  created_by_id: true,
  updated_by_id: true,
};

function getPagination(page, limit) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  return { pageNumber, pageSize };
}

function buildFaqWhere({ search = '', category, is_published } = {}, publicOnly = false) {
  const trimmedSearch = search.trim();
  return {
    ...(publicOnly ? { is_published: true } : is_published === undefined ? {} : { is_published }),
    ...(category ? { category } : {}),
    ...(trimmedSearch
      ? {
          OR: [
            { question: { contains: trimmedSearch } },
            { answer: { contains: trimmedSearch } },
          ],
        }
      : {}),
  };
}

export async function listPublicFaqs({ page = 1, limit = 10, search = '', category } = {}) {
  const { pageNumber, pageSize } = getPagination(page, limit);
  const where = buildFaqWhere({ search, category }, true);
  const [total, items] = await Promise.all([
    prisma.landingPageFaq.count({ where }),
    prisma.landingPageFaq.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: publicFaqSelect,
    }),
  ]);
  return {
    items,
    pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) || 1 },
  };
}

export async function listAdminFaqs({ page = 1, limit = 10, search = '', category, is_published } = {}) {
  const { pageNumber, pageSize } = getPagination(page, limit);
  const where = buildFaqWhere({ search, category, is_published });
  const [total, items] = await Promise.all([
    prisma.landingPageFaq.count({ where }),
    prisma.landingPageFaq.findMany({
      where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: adminFaqSelect,
    }),
  ]);
  return {
    items,
    pagination: { total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) || 1 },
  };
}

export async function getAdminFaq(id) {
  const faq = await prisma.landingPageFaq.findUnique({ where: { id }, select: adminFaqSelect });
  if (!faq) fail(404, 'FAQ tidak ditemukan.');
  return faq;
}

export async function createFaq({ data, user, req }) {
  return prisma.$transaction(async (tx) => {
    const faq = await tx.landingPageFaq.create({
      data: {
        category: data.category,
        question: data.question,
        answer: data.answer,
        is_published: data.is_published,
        created_by_id: user.id,
        updated_by_id: user.id,
      },
      select: adminFaqSelect,
    });
    await audit(tx, user, 'LANDING_PAGE_FAQ_CREATED', 'LandingPageFaq', faq.id, {
      category: faq.category,
      question: faq.question,
      is_published: faq.is_published,
    }, req);
    return faq;
  });
}

export async function updateFaq({ id, data, user, req }) {
  const previous = await getAdminFaq(id);
  return prisma.$transaction(async (tx) => {
    const faq = await tx.landingPageFaq.update({
      where: { id },
      data: {
        ...data,
        updated_by_id: user.id,
      },
      select: adminFaqSelect,
    });
    await audit(tx, user, 'LANDING_PAGE_FAQ_UPDATED', 'LandingPageFaq', faq.id, {
      category: faq.category,
      question: faq.question,
      is_published: faq.is_published,
    }, req, {
      category: previous.category,
      question: previous.question,
      is_published: previous.is_published,
    });
    return faq;
  });
}

export async function deleteFaq({ id, user, req }) {
  const faq = await getAdminFaq(id);
  await prisma.$transaction(async (tx) => {
    await tx.landingPageFaq.delete({ where: { id } });
    await audit(tx, user, 'LANDING_PAGE_FAQ_DELETED', 'LandingPageFaq', id, {
      category: faq.category,
      question: faq.question,
      is_published: faq.is_published,
    }, req);
  });
}
