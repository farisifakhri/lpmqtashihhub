import '../config/env.js';
import { prisma } from '../config/database.js';
import { markOverdue } from '../services/sla.service.js';

try { console.log(JSON.stringify(await markOverdue())); }
catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
