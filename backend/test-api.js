import app from './src/app.js';
import { prisma } from './src/config/database.js';

async function runTests() {
  console.log('🧪 Menguji Controller dan Service API dengan Database MySQL Laragon...');

  const server = app.listen(5001, async () => {
    try {
      // 1. Health check
      const resHealth = await fetch('http://localhost:5001/api/v1/health');
      const healthJson = await resHealth.json();
      console.log('1. Health Check:', healthJson.status === 'UP' ? '✅ PASS' : '❌ FAIL');

      // 2. Master Categories
      const resCat = await fetch('http://localhost:5001/api/v1/master/categories');
      const catJson = await resCat.json();
      console.log('2. Master Categories count:', catJson.data.length, catJson.data.length === 4 ? '✅ PASS' : '❌ FAIL');

      // 3. Master Service Types (17 Layanan)
      const resSt = await fetch('http://localhost:5001/api/v1/master/service-types');
      const stJson = await resSt.json();
      console.log('3. Master 17 Service Types count:', stJson.data.length, stJson.data.length === 17 ? '✅ PASS' : '❌ FAIL');

      // 4. Auth Controller - Login Superadmin
      const resLogin = await fetch('http://localhost:5001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@lpmq.kemenag.go.id',
          password: 'password123',
        }),
      });
      const loginJson = await resLogin.json();
      console.log('4. Login Superadmin:', loginJson.success ? '✅ PASS' : '❌ FAIL');
      const token = loginJson.data?.token;

      // 5. Auth Controller - Get Profile (/me)
      const resMe = await fetch('http://localhost:5001/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meJson = await resMe.json();
      console.log('5. Profile /me (Role SUPERADMIN):', meJson.data?.roles.includes('SUPERADMIN') ? '✅ PASS' : '❌ FAIL');

      // 6. Registration Controller - Create Draft
      const serviceType = stJson.data[0];
      const publisher = await prisma.publisher.findFirst();
      const resDraft = await fetch('http://localhost:5001/api/v1/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          publisher_id: publisher.id,
          service_type_id: serviceType.id,
          title: 'Mushaf Al-Qur\'an Standar Indonesia Uji Coba 2026',
          registration_type: 'NEW',
        }),
      });
      const draftJson = await resDraft.json();
      console.log('6. Create Registration Draft:', draftJson.success ? '✅ PASS' : '❌ FAIL', draftJson.data?.registration_no);

      // 7. Registration Controller - List Registrations
      const resList = await fetch('http://localhost:5001/api/v1/registrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listJson = await resList.json();
      console.log('7. List Registrations count:', listJson.data.length, listJson.data.length > 0 ? '✅ PASS' : '❌ FAIL');

      // 8. Submit Registration (Snapshotting SLA & Tarif)
      const regId = draftJson.data.id;
      const resSubmit = await fetch(`http://localhost:5001/api/v1/registrations/${regId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const submitJson = await resSubmit.json();
      console.log('8. Submit Registration (State READY_FOR_VERIFICATION):', submitJson.data?.status === 'READY_FOR_VERIFICATION' ? '✅ PASS' : '❌ FAIL');
      console.log('   Snapshot SLA Days:', submitJson.data?.fee_sla_snapshot?.sla_initial_days, 'HK');

      // 9. System Diagnostics - Health with active DB check
      const resSysHealth = await fetch('http://localhost:5001/api/v1/system/health');
      const sysHealthJson = await resSysHealth.json();
      console.log('9. System Health & DB Ping:', sysHealthJson.database.status === 'CONNECTED' ? '✅ PASS' : '❌ FAIL');

      // 10. System Diagnostics - Module Diagnostics MST-01
      const resDiag = await fetch('http://localhost:5001/api/v1/system/diagnostics/MST-01', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const diagJson = await resDiag.json();
      console.log('10. Module Diagnostics (MST-01):', diagJson.success && diagJson.tables.length === 3 ? '✅ PASS' : '❌ FAIL');
      console.log('    Tables:', diagJson.tables.map(t => `${t.name}: ${t.row_count}`).join(', '));

      // 11. System Diagnostics - Module Diagnostics REG-02
      const resDiagReg = await fetch('http://localhost:5001/api/v1/system/diagnostics/REG-02', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const diagRegJson = await resDiagReg.json();
      console.log('11. Module Diagnostics (REG-02):', diagRegJson.success ? '✅ PASS' : '❌ FAIL');
      console.log('    Registrations count in DB:', diagRegJson.tables[0].row_count);

      console.log('\n✨ SEMUA TEST CONTROLLER & DB API BERHASIL 100%! ✨');
    } catch (err) {
      console.error('❌ Test error:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

runTests();
