import 'dotenv/config';
import { prisma } from '../src/config/database.js';
import { inspectKetuaPentashih, migrateReviewedAdmins } from '../src/services/admin-role-migration.service.js';

try {
  const get = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const userIds = get('user-ids')?.split(',');
  const execute = process.argv.includes('--execute');
  if (execute && process.argv.includes('--dry-run')) throw new Error('Choose --dry-run OR --execute.');
  if (!userIds) {
    if (execute) throw new Error('No automatic promotion. Provide reviewed --user-ids, --expected and --approved-by.');
    console.log(JSON.stringify({ dry_run: true, ...(await inspectKetuaPentashih()) }, null, 2));
  } else {
    console.log(JSON.stringify(await migrateReviewedAdmins({ userIds, expected: Number(get('expected')), approvedBy: get('approved-by'), execute }), null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
